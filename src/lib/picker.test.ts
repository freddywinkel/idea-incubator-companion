import { describe, it, expect, beforeEach } from 'vitest';
import { pickActivity, recordDrawAction, injectRandom } from './picker';
import type { Activity, PickerCriteria, DrawHistoryEntry } from '../types';

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: crypto.randomUUID(),
  type: 'hobby',
  title: 'Test Activity',
  tags: [],
  moodTags: [],
  pickCount: 0,
  status: 'available',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const defaultCriteria: PickerCriteria = {
  time: 'surprise',
  energy: 'surprise',
  mood: 'surprise',
  strictMood: false,
  includeBusiness: false,
};

describe('pickActivity', () => {
  beforeEach(() => {
    injectRandom(null);
  });

  it('returns null when no activities exist', async () => {
    const result = await pickActivity([], defaultCriteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    expect(result.item).toBeNull();
    expect(result.noExactMatch).toBe(true);
  });

  it('returns null when all activities are completed/archived/paused', async () => {
    const acts = [
      makeActivity({ status: 'completed' }),
      makeActivity({ status: 'archived' }),
      makeActivity({ status: 'paused' }),
    ];
    const result = await pickActivity(acts, defaultCriteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    expect(result.item).toBeNull();
  });

  it('excludes snoozed activities', async () => {
    const available = makeActivity({ title: 'Available' });
    const snoozed = makeActivity({ title: 'Snoozed', snoozedUntil: new Date(Date.now() + 86400000).toISOString() });
    const result = await pickActivity([available, snoozed], defaultCriteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    expect(result.item).not.toBeNull();
    expect(result.item?.title).toBe('Available');
  });

  it('avoids immediate repeat when at least two eligible items exist', async () => {
    const a = makeActivity({ title: 'A' });
    const b = makeActivity({ title: 'B' });
    injectRandom(() => 0);
    const history: DrawHistoryEntry[] = [
      { id: '1', activityId: a.id, drawnAt: new Date().toISOString(), criteria: defaultCriteria, action: 'picked_another' },
    ];
    const result = await pickActivity([a, b], defaultCriteria, {
      getDrawHistory: async () => history,
      addDrawHistory: async () => {},
    });
    expect(result.item?.id).toBe(b.id);
  });

  it('uses the newest persisted history entry even when entries are not ordered', async () => {
    const a = makeActivity({ title: 'A' });
    const b = makeActivity({ title: 'B' });
    injectRandom(() => 0);
    const history: DrawHistoryEntry[] = [
      { id: 'newer', activityId: a.id, drawnAt: '2026-07-12T12:00:00.000Z', criteria: defaultCriteria, action: 'picked_another' },
      { id: 'older', activityId: b.id, drawnAt: '2026-07-12T11:00:00.000Z', criteria: defaultCriteria, action: 'picked_another' },
    ];

    const result = await pickActivity([a, b], defaultCriteria, {
      getDrawHistory: async () => history,
      addDrawHistory: async () => {},
    });

    expect(result.item?.id).toBe(b.id);
  });

  it('prefers activities matching time and energy', async () => {
    const matching = makeActivity({ title: 'Matching', estimatedTime: '10m', energy: 'low' });
    const tooLong = makeActivity({ title: 'TooLong', estimatedTime: 'few_hours', energy: 'high' });
    const criteria: PickerCriteria = { time: '10m', energy: 'low', mood: 'surprise', strictMood: false, includeBusiness: false };

    injectRandom(() => 0.1); // Should pick highest score
    const result = await pickActivity([matching, tooLong], criteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    expect(result.item?.title).toBe('Matching');
  });

  it('prefers activities not picked recently', async () => {
    const old = makeActivity({ title: 'Old', lastPickedAt: new Date(Date.now() - 30 * 86400000).toISOString() });
    const recent = makeActivity({ title: 'Recent', lastPickedAt: new Date(Date.now() - 1 * 86400000).toISOString() });

    injectRandom(() => 0.1); // Should pick highest score
    const result = await pickActivity([old, recent], defaultCriteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    expect(result.item?.title).toBe('Old');
  });

  it('relaxes filters when no exact match and returns closest option', async () => {
    const act = makeActivity({ title: 'OnlyOne', estimatedTime: 'few_hours', energy: 'high' });
    const criteria: PickerCriteria = { time: '10m', energy: 'low', mood: 'surprise', strictMood: false, includeBusiness: false };

    const result = await pickActivity([act], criteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    expect(result.item).not.toBeNull();
    expect(result.relaxed).toBe(true);
    expect(result.noExactMatch).toBe(true);
  });

  it('mood strict filter excludes non-matching mood', async () => {
    const createAct = makeActivity({ title: 'Create', moodTags: ['create'] });
    const relaxAct = makeActivity({ title: 'Relax', moodTags: ['relax'] });
    const criteria: PickerCriteria = { time: 'surprise', energy: 'surprise', mood: 'create', strictMood: true, includeBusiness: false };

    const result = await pickActivity([createAct, relaxAct], criteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    expect(result.item?.title).toBe('Create');
  });

  it('injected random is deterministic in tests', async () => {
    const a = makeActivity({ title: 'A' });
    const b = makeActivity({ title: 'B' });
    injectRandom(() => 0.5);
    const result1 = await pickActivity([a, b], defaultCriteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    const result2 = await pickActivity([a, b], defaultCriteria, {
      getDrawHistory: async () => [],
      addDrawHistory: async () => {},
    });
    expect(result1.item?.id).toBe(result2.item?.id);
  });
});

describe('recordDrawAction', () => {
  it('records a draw action with correct fields', async () => {
    const added: DrawHistoryEntry[] = [];
    await recordDrawAction('act-1', defaultCriteria, 'started', {
      getDrawHistory: async () => [],
      addDrawHistory: async (entry) => { added.push(entry); },
    });
    expect(added).toHaveLength(1);
    expect(added[0].activityId).toBe('act-1');
    expect(added[0].action).toBe('started');
    expect(added[0].criteria).toEqual(defaultCriteria);
  });
});
