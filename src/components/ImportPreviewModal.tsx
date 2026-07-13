import React from 'react';
import type { BackupImportDiff, RecordItem, WishlistItem } from '../types';
import { X, RotateCcw, Database, TriangleAlert } from 'lucide-react';
import { useModalFocus } from '../hooks/useModalFocus';

interface ImportPreviewModalProps {
  diff: BackupImportDiff;
  historyAdditionCount: number;
  legacyWithoutWishlist: boolean;
  currentWishlistCount: number;
  onMerge: () => void;
  onReplace: () => void;
  onCancel: () => void;
  importing: boolean;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  diff,
  historyAdditionCount,
  legacyWithoutWishlist,
  currentWishlistCount,
  onMerge,
  onReplace,
  onCancel,
  importing,
}) => {
  const additions: Array<RecordItem | WishlistItem> = [
    ...diff.records.additions,
    ...diff.wishlistItems.additions,
  ];
  const updatedItems: Array<RecordItem | WishlistItem> = [
    ...diff.records.updates.map(({ updated }) => updated),
    ...diff.wishlistItems.updates.map(({ updated }) => updated),
  ];
  const conflictCount = diff.records.conflicts.length + diff.wishlistItems.conflicts.length;
  const unchangedCount = diff.records.unchanged.length + diff.wishlistItems.unchanged.length;
  const wishlistTotal =
    diff.wishlistItems.additions.length +
    diff.wishlistItems.updates.length +
    diff.wishlistItems.conflicts.length +
    diff.wishlistItems.unchanged.length;
  const total = additions.length + updatedItems.length + conflictCount + unchangedCount;
  const hasMergeChanges = additions.length > 0 || updatedItems.length > 0 || historyAdditionCount > 0;
  const dialogRef = useModalFocus(true, () => {
    if (!importing) onCancel();
  });

  const getItemLabel = (item: RecordItem | WishlistItem) => {
    if (item.type === 'business') return item.localId;
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
          {total} item(s) found in backup, including {wishlistTotal} wishlist item(s). Choose how to import them.
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
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#166534' }}>{additions.length}</span>
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
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#1e40af' }}>{updatedItems.length}</span>
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
            <span style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e' }}>{conflictCount}</span>
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
              {unchangedCount}
            </span>
          </div>
        </div>

        {/* Summary preview */}
        {additions.length > 0 && (
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
              {additions.slice(0, 5).map((item) => (
                <div key={item.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                  {getItemLabel(item)} · {item.type}
                </div>
              ))}
              {additions.length > 5 && <div>+ {additions.length - 5} more</div>}
            </div>
          </div>
        )}

        {updatedItems.length > 0 && (
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
              {updatedItems.slice(0, 5).map((updated) => (
                <div key={updated.id} style={{ padding: '4px 0', borderBottom: '1px solid var(--color-border)' }}>
                  {getItemLabel(updated)} · {updated.type}
                </div>
              ))}
              {updatedItems.length > 5 && <div>+ {updatedItems.length - 5} more</div>}
            </div>
          </div>
        )}

        {conflictCount > 0 && (
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
            {conflictCount} conflict(s) will keep current data (incoming is same age or older).
          </div>
        )}

        {historyAdditionCount > 0 && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
            {historyAdditionCount} missing draw history event(s) can also be merged.
          </p>
        )}

        {legacyWithoutWishlist && currentWishlistCount > 0 && (
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
            This older backup has no wishlist data. Merge keeps your current wishlist; Replace all clears its{' '}
            {currentWishlistCount} item(s).
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
          <button
            className="btn btn-primary btn-block"
            onClick={onMerge}
            disabled={importing || !hasMergeChanges}
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
