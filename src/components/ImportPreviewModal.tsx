import React from 'react';
import { isBusinessCapture } from '../types';
import type { ImportDiff } from '../types';
import { X, RotateCcw, Database, TriangleAlert } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';

interface ImportPreviewModalProps {
  diff: ImportDiff;
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
  importing: boolean;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  diff,
  onMerge,
  onReplace,
  onCancel,
  importing,
}) => {
  const total = diff.additions.length + diff.updates.length + diff.conflicts.length + diff.unchanged.length;
  const dialogRef = useModalFocus(true, () => {
    if (!importing) onCancel();
  });

  const getItemLabel = (item: ImportDiff['additions'][number]) => {
    if (isBusinessCapture(item)) return item.localId;
    return item.title;
  };

  return (
    <div className="modal-overlay">
      <div
        ref={dialogRef}
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-preview-title"
        tabIndex={-1}
      >
        <h2 id="import-preview-title" style={{ marginBottom: '16px', fontSize: '1.25rem' }}>
          Import Preview
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '16px' }}>
          {total} item(s) found in backup. Choose how to import them.
        </p>

        <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: '#dcfce7',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#166534' }}>New additions</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#166534' }}>{diff.additions.length}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: '#dbeafe',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1e40af' }}>
              Updates (incoming is newer)
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>{diff.updates.length}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: '#fef3c7',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#92400e' }}>Conflicts (same age)</span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>{diff.conflicts.length}</span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              background: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
              Unchanged
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
              {diff.unchanged.length}
            </span>
          </div>
        </div>

        {/* Summary preview */}
        {diff.additions.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>New additions preview</h3>
            <div
              style={{
                maxHeight: '120px',
                overflowY: 'auto',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              {diff.additions.slice(0, 5).map((item) => (
                <div key={item.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                  {getItemLabel(item)} · {item.type}
                </div>
              ))}
              {diff.additions.length > 5 && <div>+ {diff.additions.length - 5} more</div>}
            </div>
          </div>
        )}

        {diff.updates.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>Updates preview</h3>
            <div
              style={{
                maxHeight: '120px',
                overflowY: 'auto',
                fontSize: '0.75rem',
                color: 'var(--color-text-secondary)',
              }}
            >
              {diff.updates.slice(0, 5).map(({ updated }) => (
                <div key={updated.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                  {getItemLabel(updated)} · {updated.type}
                </div>
              ))}
              {diff.updates.length > 5 && <div>+ {diff.updates.length - 5} more</div>}
            </div>
          </div>
        )}

        {diff.conflicts.length > 0 && (
          <div
            style={{
              marginBottom: '12px',
              padding: '10px',
              background: '#fef3c7',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              color: '#92400e',
            }}
          >
            <TriangleAlert size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            {diff.conflicts.length} conflict(s) will keep current data (incoming is same age or older).
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <button
            className="btn btn-primary btn-block"
            onClick={onMerge}
            disabled={importing || (diff.additions.length === 0 && diff.updates.length === 0)}
            aria-label="Merge backup data with current data"
          >
            <Database size={18} />
            {importing ? 'Merging...' : 'Merge (preserve newer current data)'}
          </button>
          <button
            className="btn btn-danger btn-block"
            onClick={onReplace}
            disabled={importing}
            aria-label="Replace all current data with backup"
          >
            <RotateCcw size={18} />
            {importing ? 'Replacing...' : 'Replace all'}
          </button>
          <button
            className="btn btn-secondary btn-block"
            onClick={onCancel}
            disabled={importing}
            aria-label="Cancel import"
          >
            <X size={18} />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
