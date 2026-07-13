import React, { useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAppData } from '../hooks/useAppData';
import type {
  Activity,
  ActivityStatus,
  EnergyLevel,
  TimeEstimate,
  MoodTag,
  MaterialsReady,
  CaptureType,
} from '../types';
import { generateUUID } from '../types';
import { SearchBar } from './SearchBar';
import { useModalFocus } from '../hooks/useModalFocus';
import {
  Pencil,
  Copy,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Sparkles,
  SlidersHorizontal,
  Clock,
  Zap,
} from 'lucide-react';

const ACTIVITY_TYPES: Exclude<CaptureType, 'business'>[] = [
  'hobby',
  'diy',
  'ai-project',
  'learning',
  'other',
];

const ACTIVITY_STATUSES: ActivityStatus[] = [
  'available',
  'in_progress',
  'completed',
  'paused',
  'archived',
];

const ENERGY_LEVELS: EnergyLevel[] = ['low', 'medium', 'high', 'surprise'];
const TIME_ESTIMATES: TimeEstimate[] = ['10m', '30m', '1-2h', 'few_hours', 'surprise'];
const MOOD_TAGS: MoodTag[] = ['create', 'learn', 'build_fix', 'relax', 'active', 'surprise'];
const MATERIALS_OPTIONS: MaterialsReady[] = ['yes', 'no', 'n/a'];

interface ActivityFilters {
  type?: string;
  status?: ActivityStatus;
  energy?: EnergyLevel;
  time?: TimeEstimate;
  mood?: MoodTag;
  materialsReady?: MaterialsReady;
  location?: string;
}

function badgeClass(status: ActivityStatus): string {
  switch (status) {
    case 'available': return 'badge-available';
    case 'in_progress': return 'badge-in-progress';
    case 'completed': return 'badge-completed';
    case 'paused': return 'badge-paused';
    case 'archived': return 'badge-archived';
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function energyLabel(e: EnergyLevel): string {
  switch (e) {
    case 'low': return 'Low energy';
    case 'medium': return 'Medium energy';
    case 'high': return 'High energy';
    case 'surprise': return 'Surprise me';
  }
}

function timeLabel(t: TimeEstimate): string {
  switch (t) {
    case '10m': return '10 min';
    case '30m': return '30 min';
    case '1-2h': return '1–2 hrs';
    case 'few_hours': return 'Few hrs';
    case 'surprise': return 'Surprise';
  }
}

function moodLabel(m: MoodTag): string {
  switch (m) {
    case 'create': return 'Create';
    case 'learn': return 'Learn';
    case 'build_fix': return 'Build/fix';
    case 'relax': return 'Relax';
    case 'active': return 'Active';
    case 'surprise': return 'Surprise';
  }
}

function typeLabel(type: Exclude<CaptureType, 'business'>): string {
  switch (type) {
    case 'hobby': return 'Hobby';
    case 'diy': return 'DIY project';
    case 'ai-project': return 'AI project';
    case 'learning': return 'Learning';
    case 'other': return 'Other';
  }
}

function costLabel(cost: NonNullable<Activity['costBand']>): string {
  switch (cost) {
    case 'free': return 'Free';
    case 'under_10': return 'Under €10';
    case 'under_50': return 'Under €50';
    case 'under_100': return 'Under €100';
    case 'over_100': return 'Over €100';
    case 'unknown': return 'Unknown';
  }
}

interface ActivityListProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ActivityList: React.FC<ActivityListProps> = ({ showToast }) => {
  const { activities, saveAct } = useAppData();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ActivityFilters>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);
  const closeEditor = useCallback(() => setEditing(null), []);
  const editDialogRef = useModalFocus(Boolean(editing), closeEditor);

  const locations = useMemo(() => {
    const locs = new Set<string>();
    activities.forEach((a) => {
      if (a.location) locs.add(a.location);
    });
    return Array.from(locs).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return activities
      .filter((a) => {
        const matchesSearch =
          !q ||
          a.title.toLowerCase().includes(q) ||
          (a.notes && a.notes.toLowerCase().includes(q)) ||
          a.tags.some((t) => t.toLowerCase().includes(q));
        const matchesFilters =
          (!filters.type || a.type === filters.type) &&
          (!filters.status || a.status === filters.status) &&
          (!filters.energy || a.energy === filters.energy) &&
          (!filters.time || a.estimatedTime === filters.time) &&
          (!filters.mood || a.moodTags.includes(filters.mood)) &&
          (!filters.materialsReady || a.materialsReady === filters.materialsReady) &&
          (!filters.location || a.location === filters.location);
        return matchesSearch && matchesFilters;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activities, search, filters]);

  const toggleFilter = useCallback(
    <K extends keyof ActivityFilters>(key: K, value: ActivityFilters[K]) => {
      setFilters((prev) => {
        if (prev[key] === value) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return { ...prev, [key]: value };
      });
    },
    []
  );

  const hasFilters = Object.keys(filters).length > 0;
  const activeFilterCount = Object.keys(filters).length;

  const clearFilters = useCallback(() => setFilters({}), []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleStatusChange = useCallback(
    async (activity: Activity, newStatus: ActivityStatus) => {
      await saveAct({
        ...activity,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      showToast(`Status changed to ${newStatus.replace(/_/g, ' ')}`, 'success');
    },
    [saveAct, showToast]
  );

  const handleDuplicate = useCallback(
    async (activity: Activity) => {
      const newActivity: Activity = {
        ...activity,
        id: generateUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'available',
        pickCount: 0,
        lastPickedAt: undefined,
        snoozedUntil: undefined,
      };
      await saveAct(newActivity);
      showToast('Activity duplicated', 'success');
    },
    [saveAct, showToast]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editing) return;
    await saveAct({
      ...editing,
      updatedAt: new Date().toISOString(),
    });
    setEditing(null);
    showToast('Changes saved', 'success');
  }, [editing, saveAct, showToast]);

  if (activities.length === 0) {
    return (
      <div className="empty-state">
        <Sparkles size={48} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
        <h3>Your jar is empty</h3>
        <p>Add an activity to your jar on the Capture tab.</p>
      </div>
    );
  }

  return (
    <div>
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by title, notes, or tags..."
      />

      <div className="activity-filter-shell">
        <button
          type="button"
          className="btn btn-secondary btn-block activity-filter-toggle"
          aria-expanded={filtersOpen}
          aria-controls="activity-filter-panel"
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <SlidersHorizontal size={17} aria-hidden="true" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </span>
          {filtersOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </button>

        {filtersOpen && (
          <div id="activity-filter-panel" className="activity-filter-panel">
            <FilterRow
              label="Type"
              items={ACTIVITY_TYPES.map((t) => ({ key: t, label: typeLabel(t) }))}
              activeKey={filters.type}
              onSelect={(v) => toggleFilter('type', v)}
            />
            <FilterRow
              label="Status"
              items={ACTIVITY_STATUSES.map((s) => ({ key: s, label: s.replace(/_/g, ' ') }))}
              activeKey={filters.status}
              onSelect={(v) => toggleFilter('status', v as ActivityStatus)}
            />
            <FilterRow
              label="Energy"
              items={ENERGY_LEVELS.map((e) => ({ key: e, label: energyLabel(e) }))}
              activeKey={filters.energy}
              onSelect={(v) => toggleFilter('energy', v as EnergyLevel)}
            />
            <FilterRow
              label="Time"
              items={TIME_ESTIMATES.map((t) => ({ key: t, label: timeLabel(t) }))}
              activeKey={filters.time}
              onSelect={(v) => toggleFilter('time', v as TimeEstimate)}
            />
            <FilterRow
              label="Mood"
              items={MOOD_TAGS.map((m) => ({ key: m, label: moodLabel(m) }))}
              activeKey={filters.mood}
              onSelect={(v) => toggleFilter('mood', v as MoodTag)}
            />
            <FilterRow
              label="Materials"
              items={MATERIALS_OPTIONS.map((m) => ({ key: m, label: m.toUpperCase() }))}
              activeKey={filters.materialsReady}
              onSelect={(v) => toggleFilter('materialsReady', v as MaterialsReady)}
            />
            {locations.length > 0 && (
              <FilterRow
                label="Location"
                items={locations.map((l) => ({ key: l, label: l }))}
                activeKey={filters.location}
                onSelect={(v) => toggleFilter('location', v)}
              />
            )}
            {hasFilters && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={clearFilters}
                aria-label="Clear all filters"
                style={{ marginTop: 12 }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <p>No activities match your search or filters.</p>
        </div>
      )}

      <div>
        {filtered.map((activity) => (
          <article key={activity.id} className="card" style={{ marginBottom: 12 }}>
            <button
              onClick={() => toggleExpand(activity.id)}
              aria-expanded={expandedId === activity.id}
              aria-label={`Expand ${activity.title}`}
              style={{
                width: '100%',
                textAlign: 'left',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: 'inherit',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 4,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      className="badge"
                      style={{ background: 'var(--color-accent-soft)', color: '#7a4a2a' }}
                    >
                      {typeLabel(activity.type)}
                    </span>
                    <span className={`badge ${badgeClass(activity.status)}`}>
                      {activity.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '1rem',
                      lineHeight: 1.4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {activity.title}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      marginTop: 6,
                      fontSize: '0.875rem',
                      color: 'var(--color-text-secondary)',
                      flexWrap: 'wrap',
                    }}
                  >
                    {activity.estimatedTime && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={14} aria-hidden="true" /> {timeLabel(activity.estimatedTime)}
                      </span>
                    )}
                    {activity.energy && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Zap size={14} aria-hidden="true" /> {energyLabel(activity.energy)}
                      </span>
                    )}
                  </div>
                </div>
                {expandedId === activity.id ? (
                  <ChevronUp size={20} color="var(--color-text-secondary)" />
                ) : (
                  <ChevronDown size={20} color="var(--color-text-secondary)" />
                )}
              </div>
            </button>

            {expandedId === activity.id && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <DetailGrid>
                  <DetailItem label="Title" value={activity.title} />
                  <DetailItem label="Type" value={typeLabel(activity.type)} />
                  <DetailItem label="Status" value={activity.status.replace(/_/g, ' ')} />
                  {activity.notes && <DetailItem label="Notes" value={activity.notes} />}
                  {activity.estimatedTime && (
                    <DetailItem label="Time" value={timeLabel(activity.estimatedTime)} />
                  )}
                  {activity.energy && (
                    <DetailItem label="Energy" value={energyLabel(activity.energy)} />
                  )}
                  {activity.location && (
                    <DetailItem label="Location" value={activity.location} />
                  )}
                  {activity.costBand && (
                    <DetailItem label="Cost" value={costLabel(activity.costBand)} />
                  )}
                  {activity.materialsNeeded && (
                    <DetailItem label="Materials needed" value={activity.materialsNeeded} />
                  )}
                  {activity.materialsReady && (
                    <DetailItem label="Materials ready" value={activity.materialsReady} />
                  )}
                  {activity.smallestStep && (
                    <DetailItem label="Smallest step" value={activity.smallestStep} />
                  )}
                  {activity.fiveMinuteVersion && (
                    <DetailItem label="5-minute version" value={activity.fiveMinuteVersion} />
                  )}
                  {activity.tags.length > 0 && (
                    <DetailItem label="Tags" value={activity.tags.join(', ')} />
                  )}
                  {activity.moodTags.length > 0 && (
                    <DetailItem label="Mood" value={activity.moodTags.map(moodLabel).join(', ')} />
                  )}
                  {activity.snoozedUntil && (
                    <DetailItem label="Snoozed until" value={formatDate(activity.snoozedUntil)} />
                  )}
                  <DetailItem
                    label="Picked"
                    value={`${activity.pickCount} time${activity.pickCount === 1 ? '' : 's'}`}
                  />
                  {activity.lastPickedAt && (
                    <DetailItem label="Last picked" value={formatDate(activity.lastPickedAt)} />
                  )}
                  <DetailItem label="Created" value={formatDate(activity.createdAt)} />
                </DetailGrid>

                <div className="action-row" style={{ marginTop: 16 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditing(activity)}
                    aria-label="Edit activity"
                  >
                    <Pencil size={16} aria-hidden="true" /> Edit
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDuplicate(activity)}
                    aria-label="Duplicate activity"
                  >
                    <Copy size={16} aria-hidden="true" /> Duplicate
                  </button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label
                    htmlFor={`status-select-${activity.id}`}
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--color-text-secondary)',
                      display: 'block',
                      marginBottom: 6,
                    }}
                  >
                    Quick status change
                  </label>
                  <select
                    id={`status-select-${activity.id}`}
                    value={activity.status}
                    onChange={(e) =>
                      handleStatusChange(activity, e.target.value as ActivityStatus)
                    }
                    style={{ maxWidth: 200 }}
                  >
                    {ACTIVITY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {editing && (
        <div
          className="modal-overlay"
          onClick={closeEditor}
        >
          <div
            ref={editDialogRef}
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="act-edit-title"
            tabIndex={-1}
          >
            <h2 id="act-edit-title" style={{ fontSize: '1.25rem' }}>
              Edit Activity
            </h2>

            <div style={{ marginTop: 16 }}>
              <EditField
                label="Title"
                value={editing.title}
                onChange={(v) => setEditing({ ...editing, title: v })}
              />
              <div className="form-group">
                <label htmlFor="act-type">Type</label>
                <select
                  id="act-type"
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      type: e.target.value as Activity['type'],
                    })
                  }
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {typeLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
              <EditArea
                label="Notes"
                value={editing.notes || ''}
                onChange={(v) => setEditing({ ...editing, notes: v })}
              />
              <div className="form-group">
                <label htmlFor="act-status">Status</label>
                <select
                  id="act-status"
                  value={editing.status}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      status: e.target.value as ActivityStatus,
                    })
                  }
                >
                  {ACTIVITY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="act-time">Estimated time</label>
                <select
                  id="act-time"
                  value={editing.estimatedTime || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      estimatedTime: (e.target.value || undefined) as
                        | TimeEstimate
                        | undefined,
                    })
                  }
                >
                  <option value="">—</option>
                  {TIME_ESTIMATES.map((t) => (
                    <option key={t} value={t}>
                      {timeLabel(t)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="act-energy">Energy</label>
                <select
                  id="act-energy"
                  value={editing.energy || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      energy: (e.target.value || undefined) as EnergyLevel | undefined,
                    })
                  }
                >
                  <option value="">—</option>
                  {ENERGY_LEVELS.map((e) => (
                    <option key={e} value={e}>
                      {energyLabel(e)}
                    </option>
                  ))}
                </select>
              </div>
              <EditField
                label="Location"
                value={editing.location || ''}
                onChange={(v) => setEditing({ ...editing, location: v })}
              />
              <div className="form-group">
                <label htmlFor="act-cost">Cost band</label>
                <select
                  id="act-cost"
                  value={editing.costBand || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      costBand: (e.target.value || undefined) as Activity['costBand'],
                    })
                  }
                >
                  <option value="">—</option>
                  <option value="free">Free</option>
                  <option value="under_10">Under €10</option>
                  <option value="under_50">Under €50</option>
                  <option value="under_100">Under €100</option>
                  <option value="over_100">Over €100</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <EditArea
                label="Materials needed"
                value={editing.materialsNeeded || ''}
                onChange={(v) => setEditing({ ...editing, materialsNeeded: v })}
              />
              <div className="form-group">
                <label htmlFor="act-materials">Materials ready</label>
                <select
                  id="act-materials"
                  value={editing.materialsReady || ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      materialsReady: (e.target.value || undefined) as MaterialsReady | undefined,
                    })
                  }
                >
                  <option value="">—</option>
                  {MATERIALS_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <EditArea
                label="Smallest step"
                value={editing.smallestStep || ''}
                onChange={(v) => setEditing({ ...editing, smallestStep: v })}
              />
              <EditArea
                label="5-minute version"
                value={editing.fiveMinuteVersion || ''}
                onChange={(v) => setEditing({ ...editing, fiveMinuteVersion: v })}
              />
              <EditField
                label="Tags (comma separated)"
                value={editing.tags.join(', ')}
                onChange={(v) =>
                  setEditing({
                    ...editing,
                    tags: v
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
              />
              <div className="form-group">
                <span className="field-label">Mood tags</span>
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                  role="group"
                  aria-label="Mood tags"
                >
                  {MOOD_TAGS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`chip ${
                        editing.moodTags.includes(m) ? 'active' : ''
                      }`}
                      onClick={() => {
                        const next = editing.moodTags.includes(m)
                          ? editing.moodTags.filter((x) => x !== m)
                          : [...editing.moodTags, m];
                        setEditing({ ...editing, moodTags: next });
                      }}
                      aria-pressed={editing.moodTags.includes(m)}
                    >
                      {moodLabel(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="action-row" style={{ marginTop: 24 }}>
              <button className="btn btn-primary" onClick={handleSaveEdit}>
                <Save size={16} aria-hidden="true" /> Save
              </button>
              <button
                className="btn btn-secondary"
                onClick={closeEditor}
              >
                <X size={16} aria-hidden="true" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function FilterRow({
  label,
  items,
  activeKey,
  onSelect,
}: {
  label: string;
  items: { key: string; label: string }[];
  activeKey?: string;
  onSelect: (key: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="activity-filter-row">
      <span className="activity-filter-label">
        {label}
      </span>
      <div className="filter-bar" role="group" aria-label={`Filter by ${label}`}>
        {items.map((item) => (
          <button
            key={item.key}
            className={`chip ${activeKey === item.key ? 'active' : ''}`}
            onClick={() => onSelect(item.key)}
            aria-pressed={activeKey === item.key}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--color-text-tertiary)',
        }}
      >
        {label}
      </span>
      <p
        style={{
          margin: '4px 0 0',
          fontSize: '0.9375rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--color-text)',
        }}
      >
        {value}
      </p>
    </div>
  );
}

function DetailGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: '12px',
      }}
    >
      {children}
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputId = React.useId();
  return (
    <div className="form-group">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function EditArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputId = React.useId();
  return (
    <div className="form-group">
      <label htmlFor={inputId}>{label}</label>
      <textarea
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
      />
    </div>
  );
}
