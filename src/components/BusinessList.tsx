import React, { useState, useMemo, useCallback } from 'react';
import { useAppData } from '../hooks/useAppData';
import type { BusinessCapture, HandoffState } from '../types';
import { generateUUID } from '../types';
import { SearchBar } from './SearchBar';
import { useModalFocus } from '../hooks/useModalFocus';
import {
  Pencil,
  Copy,
  Archive,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Lightbulb,
} from 'lucide-react';

const HANDOFF_STATES: HandoffState[] = [
  'unprocessed',
  'exported',
  'processed',
  'needs_clarification',
  'archived',
];

function badgeClass(state: HandoffState): string {
  switch (state) {
    case 'unprocessed': return 'badge-unprocessed';
    case 'exported': return 'badge-exported';
    case 'processed': return 'badge-processed';
    case 'needs_clarification': return 'badge-needs-clarification';
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

function displayTitle(capture: BusinessCapture): string {
  if (capture.workingTitle) return capture.workingTitle;
  if (capture.rawWording.length <= 60) return capture.rawWording;
  return capture.rawWording.slice(0, 60) + '...';
}

interface BusinessListProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BusinessList: React.FC<BusinessListProps> = ({ showToast }) => {
  const { businessCaptures, saveCapture, getNextId } = useAppData();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<HandoffState[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<BusinessCapture | null>(null);
  const closeEditor = useCallback(() => setEditing(null), []);
  const editDialogRef = useModalFocus(Boolean(editing), closeEditor);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return businessCaptures
      .filter((c) => {
        const matchesSearch =
          !q ||
          c.rawWording.toLowerCase().includes(q) ||
          (c.workingTitle && c.workingTitle.toLowerCase().includes(q)) ||
          c.tags.some((t) => t.toLowerCase().includes(q));
        const matchesFilter =
          filters.length === 0 || filters.includes(c.handoffState);
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
  }, [businessCaptures, search, filters]);

  const toggleFilter = useCallback((state: HandoffState) => {
    setFilters((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleArchive = useCallback(
    async (capture: BusinessCapture) => {
      await saveCapture({
        ...capture,
        handoffState: 'archived',
        updatedAt: new Date().toISOString(),
      });
      showToast('Idea archived. You can undo by editing.', 'info');
    },
    [saveCapture, showToast]
  );

  const handleDuplicate = useCallback(
    async (capture: BusinessCapture) => {
      const nextId = await getNextId();
      const newCapture: BusinessCapture = {
        ...capture,
        id: generateUUID(),
        localId: nextId,
        capturedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        handoffState: 'unprocessed',
      };
      await saveCapture(newCapture);
      showToast('Idea duplicated', 'success');
    },
    [saveCapture, getNextId, showToast]
  );

  const handleSaveEdit = useCallback(async () => {
    if (!editing) return;
    await saveCapture({
      ...editing,
      updatedAt: new Date().toISOString(),
    });
    setEditing(null);
    showToast('Changes saved', 'success');
  }, [editing, saveCapture, showToast]);

  if (businessCaptures.length === 0) {
    return (
      <div className="empty-state">
        <Lightbulb size={48} strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
        <h3>No business ideas yet</h3>
        <p>Capture your first business idea on the Capture tab.</p>
      </div>
    );
  }

  return (
    <div>
      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="Search by wording, title, or tags..."
      />

      <div
        className="filter-bar"
        role="group"
        aria-label="Filter by handoff state"
        style={{ marginBottom: 12 }}
      >
        {HANDOFF_STATES.map((state) => (
          <button
            key={state}
            className={`chip ${filters.includes(state) ? 'active' : ''}`}
            onClick={() => toggleFilter(state)}
            aria-pressed={filters.includes(state)}
          >
            {state.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <p>No ideas match your search or filters.</p>
        </div>
      )}

      <div>
        {filtered.map((capture) => (
          <article
            key={capture.id}
            className="card"
            style={{ marginBottom: 12 }}
          >
            <button
              onClick={() => toggleExpand(capture.id)}
              aria-expanded={expandedId === capture.id}
              aria-label={`Expand ${displayTitle(capture)}`}
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
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-tertiary)',
                        fontWeight: 500,
                      }}
                    >
                      {capture.localId}
                    </span>
                    <span className={`badge ${badgeClass(capture.handoffState)}`}>
                      {capture.handoffState.replace(/_/g, ' ')}
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
                    {displayTitle(capture)}
                  </div>
                  <div
                    className="list-item-meta"
                    style={{ marginTop: 4 }}
                  >
                    Captured {formatDate(capture.capturedAt)}
                  </div>
                </div>
                {expandedId === capture.id ? (
                  <ChevronUp size={20} color="var(--color-text-secondary)" />
                ) : (
                  <ChevronDown size={20} color="var(--color-text-secondary)" />
                )}
              </div>
            </button>

            {expandedId === capture.id && (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: '1px solid var(--color-border)',
                }}
              >
                <DetailGrid>
                  <DetailItem label="Raw wording" value={capture.rawWording} />
                  {capture.workingTitle && (
                    <DetailItem label="Working title" value={capture.workingTitle} />
                  )}
                  {capture.category && (
                    <DetailItem label="Category" value={capture.category} />
                  )}
                  {capture.likelyCustomer && (
                    <DetailItem label="Customer" value={capture.likelyCustomer} />
                  )}
                  {capture.possibleProblem && (
                    <DetailItem label="Problem" value={capture.possibleProblem} />
                  )}
                  {capture.whyMightPay && (
                    <DetailItem label="Why might pay" value={capture.whyMightPay} />
                  )}
                  {capture.geography && (
                    <DetailItem label="Geography" value={capture.geography} />
                  )}
                  {capture.assumptions && (
                    <DetailItem label="Assumptions" value={capture.assumptions} />
                  )}
                  {capture.evidence && (
                    <DetailItem label="Evidence" value={capture.evidence} />
                  )}
                  {capture.questions && (
                    <DetailItem label="Questions" value={capture.questions} />
                  )}
                  {capture.tags.length > 0 && (
                    <DetailItem label="Tags" value={capture.tags.join(', ')} />
                  )}
                  {capture.officialIdeaId && (
                    <DetailItem label="Official ID" value={capture.officialIdeaId} />
                  )}
                  {capture.processingOutcome && (
                    <DetailItem label="Outcome" value={capture.processingOutcome} />
                  )}
                </DetailGrid>

                <div className="action-row" style={{ marginTop: 16 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditing(capture)}
                    aria-label="Edit business idea"
                  >
                    <Pencil size={16} aria-hidden="true" /> Edit
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleDuplicate(capture)}
                    aria-label="Duplicate business idea"
                  >
                    <Copy size={16} aria-hidden="true" /> Duplicate
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleArchive(capture)}
                    aria-label="Archive business idea"
                    disabled={capture.handoffState === 'archived'}
                    style={{
                      opacity: capture.handoffState === 'archived' ? 0.5 : 1,
                    }}
                  >
                    <Archive size={16} aria-hidden="true" /> Archive
                  </button>
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
            aria-labelledby="biz-edit-title"
            tabIndex={-1}
          >
            <h2 id="biz-edit-title" style={{ fontSize: '1.25rem' }}>
              Edit Business Idea
            </h2>

            <div style={{ marginTop: 16 }}>
              <EditField
                label="Working title"
                value={editing.workingTitle || ''}
                onChange={(v) => setEditing({ ...editing, workingTitle: v })}
              />
              <EditField
                label="Category"
                value={editing.category || ''}
                onChange={(v) => setEditing({ ...editing, category: v })}
              />
              <EditField
                label="Customer"
                value={editing.likelyCustomer || ''}
                onChange={(v) => setEditing({ ...editing, likelyCustomer: v })}
              />
              <EditField
                label="Problem"
                value={editing.possibleProblem || ''}
                onChange={(v) => setEditing({ ...editing, possibleProblem: v })}
              />
              <EditField
                label="Why might pay"
                value={editing.whyMightPay || ''}
                onChange={(v) => setEditing({ ...editing, whyMightPay: v })}
              />
              <EditField
                label="Geography"
                value={editing.geography || ''}
                onChange={(v) => setEditing({ ...editing, geography: v })}
              />
              <EditArea
                label="Assumptions"
                value={editing.assumptions || ''}
                onChange={(v) => setEditing({ ...editing, assumptions: v })}
              />
              <EditArea
                label="Evidence"
                value={editing.evidence || ''}
                onChange={(v) => setEditing({ ...editing, evidence: v })}
              />
              <EditArea
                label="Questions"
                value={editing.questions || ''}
                onChange={(v) => setEditing({ ...editing, questions: v })}
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
                <label htmlFor="handoff-state-select">Handoff state</label>
                <select
                  id="handoff-state-select"
                  value={editing.handoffState}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      handoffState: e.target.value as HandoffState,
                    })
                  }
                >
                  {HANDOFF_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
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

function DetailGrid({ children }: { children: React.ReactNode }) {
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
