import type { Activity, PickerCriteria, PickerResult, DrawHistoryEntry } from '../types';
import type { getDrawHistory, addDrawHistory } from '../db';

// Weighted random picker for Activity Jar
// In production, uses crypto.getRandomValues. In tests, inject a seeded random function.

export type RandomSource = () => number;

let injectedRandom: RandomSource | null = null;

export function injectRandom(source: RandomSource | null): void {
  injectedRandom = source;
}

function getRandom(): number {
  if (injectedRandom) return injectedRandom();
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] / (0xFFFFFFFF + 1);
  }
  return Math.random();
}

const timeMinutes: Record<string, number> = {
  '10m': 10,
  '30m': 30,
  '1-2h': 90,
  'few_hours': 180,
  'surprise': 0,
};

const energyRank: Record<string, number> = {
  'low': 1,
  'medium': 2,
  'high': 3,
  'surprise': 0,
};

function matchesTime(activity: Activity, criteria: PickerCriteria): boolean {
  if (criteria.time === 'surprise' || !activity.estimatedTime) return true;
  const wantMinutes = timeMinutes[criteria.time] || 0;
  const actMinutes = timeMinutes[activity.estimatedTime] || 0;
  if (wantMinutes === 0 || actMinutes === 0) return true;
  // Allow activities that are equal or shorter in time
  return actMinutes <= wantMinutes;
}

function matchesEnergy(activity: Activity, criteria: PickerCriteria): boolean {
  if (criteria.energy === 'surprise' || !activity.energy) return true;
  const wantRank = energyRank[criteria.energy] || 0;
  const actRank = energyRank[activity.energy] || 0;
  if (wantRank === 0 || actRank === 0) return true;
  // Prefer activities that match or are lower energy (easier than requested)
  return actRank <= wantRank;
}

function matchesMood(activity: Activity, criteria: PickerCriteria): boolean {
  if (criteria.mood === 'surprise' || activity.moodTags.length === 0) return true;
  if (criteria.strictMood) {
    return activity.moodTags.includes(criteria.mood);
  }
  return true; // mood is a preference, not a hard filter
}

function isEligible(activity: Activity, now: Date): boolean {
  if (activity.status === 'completed' || activity.status === 'archived' || activity.status === 'paused') {
    return false;
  }
  if (activity.snoozedUntil) {
    const snooze = new Date(activity.snoozedUntil);
    if (snooze > now) return false;
  }
  return true;
}

function scoreActivity(activity: Activity, criteria: PickerCriteria, lastDrawnId: string | null): number {
  let score = 1; // base weight

  // Prefer matching time
  if (criteria.time !== 'surprise' && activity.estimatedTime && matchesTime(activity, criteria)) {
    score += 3;
  }

  // Prefer matching energy
  if (criteria.energy !== 'surprise' && activity.energy && matchesEnergy(activity, criteria)) {
    score += 3;
  }

  // Prefer matching mood (when not strict, it adds preference weight)
  if (criteria.mood !== 'surprise' && activity.moodTags.length > 0) {
    if (activity.moodTags.includes(criteria.mood)) {
      score += 4;
    } else if (!criteria.strictMood) {
      score += 1; // small bonus for non-matching mood when not strict
    }
  }

  // Prefer less recently picked
  if (activity.lastPickedAt) {
    const daysSince = (Date.now() - new Date(activity.lastPickedAt).getTime()) / (1000 * 60 * 60 * 24);
    score += Math.min(daysSince / 7, 3); // up to +3 for not picked in 3 weeks
  } else {
    score += 3; // never picked, bonus
  }

  // Deprioritize the immediately previous item
  if (lastDrawnId && activity.id === lastDrawnId) {
    score *= 0.1; // strong deprioritization but not impossible if only one exists
  }

  return Math.max(score, 0.01);
}

function weightedPick(activities: Activity[], scores: number[]): Activity | null {
  if (activities.length === 0) return null;
  const total = scores.reduce((a, b) => a + b, 0);
  let r = getRandom() * total;
  for (let i = 0; i < activities.length; i++) {
    r -= scores[i];
    if (r <= 0) return activities[i];
  }
  return activities[activities.length - 1];
}

export interface PickerDeps {
  getDrawHistory: typeof getDrawHistory;
  addDrawHistory: typeof addDrawHistory;
}

export async function pickActivity(
  activities: Activity[],
  criteria: PickerCriteria,
  deps: PickerDeps
): Promise<PickerResult> {
  const now = new Date();
  const history = await deps.getDrawHistory();
  const lastEntry = history.reduce<DrawHistoryEntry | null>((latest, entry) => {
    if (!latest) return entry;
    return new Date(entry.drawnAt).getTime() > new Date(latest.drawnAt).getTime()
      ? entry
      : latest;
  }, null);
  const lastDrawnId = lastEntry?.activityId ?? null;

  // Primary eligible set
  let eligible = activities.filter(a => isEligible(a, now));
  eligible = eligible.filter(a => matchesTime(a, criteria));
  eligible = eligible.filter(a => matchesEnergy(a, criteria));
  eligible = eligible.filter(a => matchesMood(a, criteria));

  if (eligible.length === 0) {
    // Relax filters progressively
    let relaxed = activities.filter(a => isEligible(a, now));
    if (relaxed.length === 0) {
      return {
        item: null,
        reason: 'No activities are currently available. All items are completed, archived, paused, or snoozed.',
        noExactMatch: true,
        suggestions: ['Add a new activity', 'Check your Library for paused items', 'Clear snoozed items in the Library'],
      };
    }
    // Relax time and energy, keep mood as preference
    const scores = relaxed.map(a => scoreActivity(a, criteria, lastDrawnId));
    const winner = weightedPick(relaxed, scores);
    return {
      item: winner,
      reason: 'No activity matches your exact time and energy filters. Here is the closest available option.',
      relaxed: true,
      noExactMatch: true,
      suggestions: ['Tap "Pick another" to keep searching', 'Adjust your filters', 'Try a shorter time range'],
    };
  }

  // Filter out immediate repeat if at least 2 eligible items exist
  const nonRepeatEligible = eligible.filter(a => a.id !== lastDrawnId);
  const pool = eligible.length >= 2 && nonRepeatEligible.length > 0
    ? nonRepeatEligible
    : eligible;

  const scores = pool.map(a => scoreActivity(a, criteria, lastDrawnId));
  const winner = weightedPick(pool, scores);

  if (!winner) {
    return {
      item: null,
      reason: 'Something unexpected happened. Try broadening your filters.',
      noExactMatch: true,
    };
  }

  const reasons: string[] = [];
  if (criteria.time !== 'surprise' && winner.estimatedTime && matchesTime(winner, criteria)) {
    reasons.push('fits your available time');
  }
  if (criteria.energy !== 'surprise' && winner.energy && matchesEnergy(winner, criteria)) {
    reasons.push('matches your energy level');
  }
  if (criteria.mood !== 'surprise' && winner.moodTags.includes(criteria.mood)) {
    reasons.push('matches your mood');
  }
  if (!winner.lastPickedAt) {
    reasons.push('has not been picked before');
  } else {
    reasons.push('has not been picked recently');
  }

  const reasonText = reasons.length > 0
    ? `This ${reasons.join(', ')}.`
    : 'This is a gentle suggestion from your Activity Jar.';

  return {
    item: winner,
    reason: reasonText,
  };
}

export async function recordDrawAction(
  activityId: string,
  criteria: PickerCriteria,
  action: DrawHistoryEntry['action'],
  deps: PickerDeps
): Promise<void> {
  const entry: DrawHistoryEntry = {
    id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    activityId,
    drawnAt: new Date().toISOString(),
    criteria: { ...criteria },
    action,
  };
  await deps.addDrawHistory(entry);
}
