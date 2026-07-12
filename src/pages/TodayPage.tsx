import React, { useState, useCallback } from 'react';
import { Sun, Clock, Zap, Heart, RefreshCw, Check, X, Play, ArrowDown, Sparkles } from 'lucide-react';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import { pickActivity, recordDrawAction } from '../lib/picker';
import type { PickerCriteria, Activity, TimeEstimate, EnergyLevel, MoodTag } from '../types';

const timeOptions: { value: TimeEstimate | 'surprise'; label: string }[] = [
  { value: '10m', label: '10 min' },
  { value: '30m', label: '30 min' },
  { value: '1-2h', label: '1–2 hours' },
  { value: 'few_hours', label: 'A few hours' },
  { value: 'surprise', label: 'Surprise me' },
];

const energyOptions: { value: EnergyLevel | 'surprise'; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'surprise', label: 'Surprise me' },
];

const moodOptions: { value: MoodTag | 'surprise'; label: string }[] = [
  { value: 'create', label: 'Create' },
  { value: 'learn', label: 'Learn' },
  { value: 'build_fix', label: 'Build / Fix' },
  { value: 'relax', label: 'Relax' },
  { value: 'active', label: 'Active' },
  { value: 'surprise', label: 'Surprise me' },
];

export const TodayPage: React.FC = () => {
  const { activities, drawHistory, saveAct, addHistory } = useAppData();
  const { showToast } = useToast();
  const [criteria, setCriteria] = useState<PickerCriteria>({
    time: 'surprise',
    energy: 'surprise',
    mood: 'surprise',
    strictMood: false,
    includeBusiness: false,
  });
  const [result, setResult] = useState<Activity | null>(null);
  const [reason, setReason] = useState('');
  const [relaxed, setRelaxed] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSmaller, setShowSmaller] = useState(false);

  const runPick = useCallback(async (activeCriteria: PickerCriteria) => {
    setLoading(true);
    setResult(null);
    setReason('');
    setRelaxed(false);
    setNoMatch(false);
    setSuggestions([]);
    setShowSmaller(false);
    try {
      const pickerResult = await pickActivity(activities, activeCriteria, {
        getDrawHistory: async () => drawHistory,
        addDrawHistory: async (entry) => {
          await addHistory(entry);
        },
      });

      if (!pickerResult.item) {
        setNoMatch(true);
        setReason(pickerResult.reason);
        setSuggestions(pickerResult.suggestions || []);
        showToast(pickerResult.reason, 'info');
      } else {
        setReason(pickerResult.reason);
        setRelaxed(!!pickerResult.relaxed);
        setSuggestions(pickerResult.suggestions || []);
        // Update pick count and last picked
        const updated: Activity = {
          ...pickerResult.item,
          pickCount: (pickerResult.item.pickCount || 0) + 1,
          lastPickedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setResult(updated);
        await saveAct(updated);
        await recordDrawAction(updated.id, activeCriteria, 'picked_another', {
          getDrawHistory: async () => drawHistory,
          addDrawHistory: async (entry) => {
            await addHistory(entry);
          },
        });
      }
    } catch {
      showToast('Something went wrong picking an activity. Try again?', 'error');
    } finally {
      setLoading(false);
    }
  }, [activities, drawHistory, showToast, saveAct, addHistory]);

  const handlePick = useCallback(async () => {
    await runPick(criteria);
  }, [criteria, runPick]);

  const handleGentleChoice = useCallback(async () => {
    const gentleCriteria: PickerCriteria = {
      time: '10m',
      energy: 'low',
      mood: 'relax',
      strictMood: false,
      includeBusiness: false,
    };
    setCriteria(gentleCriteria);
    await runPick(gentleCriteria);
  }, [runPick]);

  const handleSnooze = useCallback(async () => {
    if (!result) return;
    const snoozed: Activity = {
      ...result,
      snoozedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveAct(snoozed);
    await recordDrawAction(result.id, criteria, 'snoozed', {
      getDrawHistory: async () => drawHistory,
      addDrawHistory: async (entry) => {
        await addHistory(entry);
      },
    });
    showToast('Snoozed for 24 hours. See you tomorrow!', 'info');
    setResult(null);
  }, [result, criteria, drawHistory, saveAct, addHistory, showToast]);

  const handleDone = useCallback(async () => {
    if (!result) return;
    const completed: Activity = {
      ...result,
      status: 'completed',
      updatedAt: new Date().toISOString(),
    };
    await saveAct(completed);
    await recordDrawAction(result.id, criteria, 'done', {
      getDrawHistory: async () => drawHistory,
      addDrawHistory: async (entry) => {
        await addHistory(entry);
      },
    });
    showToast('Nice work! Activity marked as done.', 'success');
    setResult(null);
  }, [result, criteria, drawHistory, saveAct, addHistory, showToast]);

  const handleStart = useCallback(async () => {
    if (!result) return;
    await recordDrawAction(result.id, criteria, 'started', {
      getDrawHistory: async () => drawHistory,
      addDrawHistory: async (entry) => {
        await addHistory(entry);
      },
    });
    showToast('Great! Go ahead and start.', 'success');
  }, [result, criteria, drawHistory, addHistory, showToast]);

  const handlePickAnother = useCallback(async () => {
    if (!result) return;
    await recordDrawAction(result.id, criteria, 'picked_another', {
      getDrawHistory: async () => drawHistory,
      addDrawHistory: async (entry) => {
        await addHistory(entry);
      },
    });
    await handlePick();
  }, [result, criteria, drawHistory, handlePick, addHistory]);

  const handleMakeSmaller = useCallback(() => {
    setShowSmaller(true);
  }, []);

  const activeCount = activities.filter(a => a.status === 'available').length;

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Sun size={28} color="var(--color-accent)" aria-hidden="true" />
          Today
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
          Let your Activity Jar suggest one thing to do now.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
            {activeCount} {activeCount === 1 ? 'activity' : 'activities'} available
          </span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={handleGentleChoice}
            aria-label="Gentle choice: low energy, short activity"
          >
            <Sparkles size={16} />
            Gentle choice
          </button>
        </div>

        {/* Time filter */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={16} aria-hidden="true" />
            Available time
          </label>
          <div className="filter-bar">
            {timeOptions.map((opt) => (
              <button
                key={opt.value}
                className={`chip ${criteria.time === opt.value ? 'active' : ''}`}
                onClick={() => setCriteria((c) => ({ ...c, time: opt.value }))}
                aria-pressed={criteria.time === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Energy filter */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Zap size={16} aria-hidden="true" />
            Energy
          </label>
          <div className="filter-bar">
            {energyOptions.map((opt) => (
              <button
                key={opt.value}
                className={`chip ${criteria.energy === opt.value ? 'active' : ''}`}
                onClick={() => setCriteria((c) => ({ ...c, energy: opt.value }))}
                aria-pressed={criteria.energy === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mood filter */}
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Heart size={16} aria-hidden="true" />
            Mood
          </label>
          <div className="filter-bar">
            {moodOptions.map((opt) => (
              <button
                key={opt.value}
                className={`chip ${criteria.mood === opt.value ? 'active' : ''}`}
                onClick={() => setCriteria((c) => ({ ...c, mood: opt.value }))}
                aria-pressed={criteria.mood === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Strict mood toggle */}
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            id="strict-mood"
            type="checkbox"
            checked={criteria.strictMood}
            onChange={(e) => setCriteria((c) => ({ ...c, strictMood: e.target.checked }))}
            style={{ width: 20, height: 20, minHeight: 20, cursor: 'pointer' }}
          />
          <label htmlFor="strict-mood" style={{ marginBottom: 0, cursor: 'pointer' }}>
            Mood is a strict filter
          </label>
        </div>

        <button
          className="btn btn-primary btn-block"
          onClick={handlePick}
          disabled={loading || activeCount === 0}
          style={{ marginTop: 8 }}
        >
          {loading ? 'Choosing...' : 'Pick for me'}
        </button>
      </div>

      {/* Result card */}
      {result && (
        <div className="card" style={{ marginBottom: 16, borderColor: 'var(--color-accent-soft)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{result.title}</h2>
            {relaxed && (
              <span className="badge" style={{ background: 'var(--color-warning)', color: '#7a5c1a', fontSize: '0.7rem' }}>
                Closest match
              </span>
            )}
          </div>

          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem', marginBottom: 16 }}>
            {reason}
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {result.estimatedTime && (
              <span className="chip" style={{ cursor: 'default' }}>
                <Clock size={14} />
                {result.estimatedTime}
              </span>
            )}
            {result.energy && (
              <span className="chip" style={{ cursor: 'default' }}>
                <Zap size={14} />
                {result.energy}
              </span>
            )}
            {result.moodTags.map((m) => (
              <span key={m} className="chip active" style={{ cursor: 'default', fontSize: '0.75rem' }}>
                {m.replace('_', ' / ')}
              </span>
            ))}
          </div>

          <div style={{ background: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
              Smallest useful step
            </h3>
            <p style={{ color: 'var(--color-text)', fontSize: '0.95rem' }}>
              {result.smallestStep || 'Open this activity and choose one five-minute starting action.'}
            </p>
            {showSmaller && result.fiveMinuteVersion && (
              <p style={{ color: 'var(--color-accent)', fontSize: '0.9rem', marginTop: 8 }}>
                Five-minute version: {result.fiveMinuteVersion}
              </p>
            )}
            {showSmaller && !result.fiveMinuteVersion && (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginTop: 8 }}>
                No five-minute version saved. Just start with the first tiny step that comes to mind.
              </p>
            )}
          </div>

          <div className="action-row">
            <button className="btn btn-primary" onClick={handleStart}>
              <Play size={16} />
              Start this
            </button>
            <button className="btn btn-secondary" onClick={handleMakeSmaller}>
              <ArrowDown size={16} />
              Make it smaller
            </button>
            <button className="btn btn-ghost" onClick={handleSnooze}>
              <X size={16} />
              Not today
            </button>
            <button className="btn btn-ghost" onClick={handlePickAnother}>
              <RefreshCw size={16} />
              Pick another
            </button>
            <button className="btn btn-secondary" onClick={handleDone}>
              <Check size={16} />
              Done
            </button>
          </div>
        </div>
      )}

      {/* No match state */}
      {noMatch && !result && (
        <div className="card empty-state" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
            {reason}
          </p>
          {suggestions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>How to broaden your choice:</p>
              <ul style={{ paddingLeft: 20, color: 'var(--color-text-secondary)' }}>
                {suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <button className="btn btn-primary" onClick={handlePick}>
            Try again with relaxed filters
          </button>
        </div>
      )}

      {/* Empty state when no activities at all */}
      {activeCount === 0 && !result && !noMatch && (
        <div className="empty-state">
          <Sun size={48} color="var(--color-accent-soft)" aria-hidden="true" />
          <h3>Your Activity Jar is empty</h3>
          <p>Add hobbies, DIY projects, or learning ideas in the Capture tab.</p>
        </div>
      )}
    </div>
  );
};
