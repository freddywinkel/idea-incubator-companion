import React, { useState, useRef, useEffect } from 'react';
import { useAppData } from '../hooks/useAppData';
import { useToast } from '../hooks/useToast';
import { isBusinessCapture } from '../types';
import type { BusinessCapture, ProcessingResult, AppBackup, BackupImportDiff } from '../types';
import {
  buildMarkdownExport,
  buildBatchJSON,
  buildAppBackup,
  validateProcessingResult,
  validateBackup,
  computeImportDiff,
  getDrawHistoryAdditions,
  downloadFile,
  downloadJSON,
} from '../lib/export';
import { getDB, requestPersistentStorage } from '../db';
import {
  Download,
  FileText,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Trash2,
  TriangleAlert,
  FileBraces,
} from 'lucide-react';
import { ImportPreviewModal } from '../components/ImportPreviewModal';

export const ExportPage: React.FC = () => {
  const {
    businessCaptures,
    records,
    wishlistItems,
    drawHistory,
    loading: dataLoading,
    saveCapture,
    clearAll,
    refresh,
  } = useAppData();
  const { showToast } = useToast();

  // Selected captures for export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCaptureList, setShowCaptureList] = useState(false);

  // Processing result import
  const [processingJson, setProcessingJson] = useState('');
  const [processingPreview, setProcessingPreview] = useState<{
    result: ProcessingResult;
    matches: Array<{ resultItem: ProcessingResult['results'][number]; capture: BusinessCapture | null }>;
  } | null>(null);
  const processingFileInputRef = useRef<HTMLInputElement>(null);

  // Backup & restore
  const [backupDiff, setBackupDiff] = useState<BackupImportDiff | null>(null);
  const [backupImportData, setBackupImportData] = useState<AppBackup | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Danger zone
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  // Persistent storage
  const [persistStatus, setPersistStatus] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown');

  useEffect(() => {
    const checkPersist = async () => {
      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
        try {
          const persisted = await navigator.storage.persisted();
          setPersistStatus(persisted ? 'granted' : 'unknown');
        } catch {
          setPersistStatus('unknown');
        }
      } else {
        setPersistStatus('unsupported');
      }
    };
    checkPersist();
  }, []);

  const handleRequestPersist = async () => {
    const granted = await requestPersistentStorage();
    setPersistStatus(granted ? 'granted' : 'denied');
    showToast(
      granted ? 'Persistent storage granted' : 'Persistent storage request denied',
      granted ? 'success' : 'info'
    );
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(businessCaptures.map((c) => c.id)));
  const selectNone = () => setSelectedIds(new Set());
  const selectUnprocessed = () =>
    setSelectedIds(new Set(businessCaptures.filter((c) => c.handoffState === 'unprocessed').map((c) => c.id)));

  const getExportDateStr = () => new Date().toISOString().slice(0, 10);

  const markExported = async (captures: BusinessCapture[]) => {
    for (const capture of captures) {
      if (capture.handoffState !== 'exported') {
        await saveCapture({
          ...capture,
          handoffState: 'exported',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  };

  const handleExportMarkdown = async (captures: BusinessCapture[]) => {
    if (captures.length === 0) {
      showToast('No captures to export', 'error');
      return;
    }
    try {
      const md = buildMarkdownExport(captures);
      const dateStr = getExportDateStr();
      downloadFile(`${dateStr}-business-idea-inbox-v1.md`, md, 'text/markdown');
      await markExported(captures);
      showToast(`Exported ${captures.length} capture(s) as Markdown`, 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleExportJSON = async (captures: BusinessCapture[]) => {
    if (captures.length === 0) {
      showToast('No captures to export', 'error');
      return;
    }
    try {
      const batch = buildBatchJSON(captures);
      const dateStr = getExportDateStr();
      downloadJSON(`${dateStr}-business-idea-batch.json`, batch);
      await markExported(captures);
      showToast(`Exported ${captures.length} capture(s) as JSON`, 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const handleExportSelectedMarkdown = () =>
    handleExportMarkdown(businessCaptures.filter((c) => selectedIds.has(c.id)));
  const handleExportSelectedJSON = () =>
    handleExportJSON(businessCaptures.filter((c) => selectedIds.has(c.id)));

  const handleExportUnprocessedMarkdown = () =>
    handleExportMarkdown(businessCaptures.filter((c) => c.handoffState === 'unprocessed'));
  const handleExportUnprocessedJSON = () =>
    handleExportJSON(businessCaptures.filter((c) => c.handoffState === 'unprocessed'));

  const handleExportAllMarkdown = () => handleExportMarkdown(businessCaptures);
  const handleExportAllJSON = () => handleExportJSON(businessCaptures);

  // Processing result import
  const handleProcessingFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large (max 10MB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setProcessingJson(text);
      validateProcessingInput(text);
    };
    reader.onerror = () => showToast('Failed to read file', 'error');
    reader.readAsText(file);
  };

  const validateProcessingInput = (text: string) => {
    try {
      const data = JSON.parse(text);
      const result = validateProcessingResult(data);
      if (!result) {
        showToast('Invalid processing result format', 'error');
        setProcessingPreview(null);
        return;
      }
      const matches = result.results.map((r) => ({
        resultItem: r,
        capture: businessCaptures.find((c) => c.localId === r.captureId || c.id === r.captureId) || null,
      }));
      setProcessingPreview({ result, matches });
      const matchedCount = matches.filter((m) => m.capture).length;
      showToast(`Found ${matchedCount} matching capture(s) out of ${matches.length}`, 'info');
    } catch {
      showToast('Invalid JSON', 'error');
      setProcessingPreview(null);
    }
  };

  const handleValidateProcessing = () => {
    if (!processingJson.trim()) {
      showToast('Please paste or upload a processing result JSON', 'error');
      return;
    }
    validateProcessingInput(processingJson);
  };

  const handleApplyProcessing = async () => {
    if (!processingPreview) return;
    const { matches } = processingPreview;
    let applied = 0;
    try {
      for (const { resultItem, capture } of matches) {
        if (!capture) continue;
        const newHandoffState: BusinessCapture['handoffState'] =
          resultItem.outcome === 'needs_clarification' || resultItem.outcome === 'error'
            ? 'needs_clarification'
            : 'processed';
        await saveCapture({
          ...capture,
          officialIdeaId: resultItem.ideaId ?? capture.officialIdeaId,
          processingOutcome: resultItem.note ?? resultItem.outcome,
          handoffState: newHandoffState,
          updatedAt: new Date().toISOString(),
        });
        applied++;
      }
      showToast(`Applied processing results to ${applied} capture(s)`, 'success');
      setProcessingPreview(null);
      setProcessingJson('');
      if (processingFileInputRef.current) processingFileInputRef.current.value = '';
    } catch {
      showToast('Failed to apply processing results', 'error');
    }
  };

  // Backup
  const handleDownloadBackup = () => {
    try {
      const backup = buildAppBackup({ records, drawHistory, wishlistItems });
      const dateStr = getExportDateStr();
      downloadJSON(`${dateStr}-idea-jar-backup.json`, backup);
      showToast('Backup downloaded', 'success');
    } catch {
      showToast('Backup failed', 'error');
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('Backup file too large (max 10MB)', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        const backup = validateBackup(data);
        if (!backup) {
          showToast('Invalid or unsupported backup file', 'error');
          return;
        }
        const diff: BackupImportDiff = {
          records: computeImportDiff(records, backup.records),
          wishlistItems: computeImportDiff(wishlistItems, backup.wishlistItems),
        };
        setBackupDiff(diff);
        setBackupImportData(backup);
        setShowImportModal(true);
      } catch {
        showToast('Failed to parse backup file', 'error');
      }
    };
    reader.onerror = () => showToast('Failed to read backup file', 'error');
    reader.readAsText(file);
  };

  const handleMergeImport = async () => {
    if (!backupDiff || !backupImportData) return;
    setImporting(true);
    try {
      const db = await getDB();
      const historyAdditions = getDrawHistoryAdditions(drawHistory, backupImportData.drawHistory);
      const tx = db.transaction(
        ['businessCaptures', 'activities', 'drawHistory', 'wishlistItems'],
        'readwrite'
      );
      const promises: Promise<unknown>[] = [];
      for (const addition of backupDiff.records.additions) {
        if (isBusinessCapture(addition)) {
          promises.push(tx.objectStore('businessCaptures').put(addition));
        } else {
          promises.push(tx.objectStore('activities').put(addition));
        }
      }
      for (const { updated } of backupDiff.records.updates) {
        if (isBusinessCapture(updated)) {
          promises.push(tx.objectStore('businessCaptures').put(updated));
        } else {
          promises.push(tx.objectStore('activities').put(updated));
        }
      }
      for (const addition of backupDiff.wishlistItems.additions) {
        promises.push(tx.objectStore('wishlistItems').put(addition));
      }
      for (const { updated } of backupDiff.wishlistItems.updates) {
        promises.push(tx.objectStore('wishlistItems').put(updated));
      }
      for (const entry of historyAdditions) {
        promises.push(tx.objectStore('drawHistory').add(entry));
      }
      await Promise.all(promises);
      await tx.done;
      await refresh();
      showToast(
        `Merged ${backupDiff.records.additions.length + backupDiff.records.updates.length} idea/activity change(s), ${backupDiff.wishlistItems.additions.length + backupDiff.wishlistItems.updates.length} wishlist change(s), and ${historyAdditions.length} draw history event(s)`,
        'success'
      );
      setShowImportModal(false);
      setBackupDiff(null);
      setBackupImportData(null);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    } catch {
      showToast('Merge failed. No data was changed.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleReplaceImport = async () => {
    if (!backupImportData) return;
    setImporting(true);
    try {
      const db = await getDB();
      const tx = db.transaction(
        ['businessCaptures', 'activities', 'drawHistory', 'wishlistItems'],
        'readwrite'
      );
      const promises: Promise<unknown>[] = [
        tx.objectStore('businessCaptures').clear(),
        tx.objectStore('activities').clear(),
        tx.objectStore('drawHistory').clear(),
        tx.objectStore('wishlistItems').clear(),
      ];
      for (const record of backupImportData.records) {
        if (isBusinessCapture(record)) {
          promises.push(tx.objectStore('businessCaptures').put(record));
        } else {
          promises.push(tx.objectStore('activities').put(record));
        }
      }
      for (const entry of backupImportData.drawHistory) {
        promises.push(tx.objectStore('drawHistory').put(entry));
      }
      for (const item of backupImportData.wishlistItems) {
        promises.push(tx.objectStore('wishlistItems').put(item));
      }
      await Promise.all(promises);
      await tx.done;
      await refresh();
      showToast('All data replaced from backup', 'success');
      setShowImportModal(false);
      setBackupDiff(null);
      setBackupImportData(null);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    } catch {
      showToast('Replace failed. No data was changed.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleCancelImport = () => {
    setShowImportModal(false);
    setBackupDiff(null);
    setBackupImportData(null);
    if (backupFileInputRef.current) backupFileInputRef.current.value = '';
  };

  // Danger zone
  const handleClearAll = async () => {
    if (clearConfirmText !== 'DELETE') {
      showToast('Please type DELETE to confirm', 'error');
      return;
    }
    try {
      await clearAll();
      showToast('All data cleared', 'success');
      setShowClearConfirm(false);
      setClearConfirmText('');
    } catch {
      showToast('Failed to clear data', 'error');
    }
  };

  const badgeClassForHandoff = (state: BusinessCapture['handoffState']) => {
    if (state === 'needs_clarification') return 'badge-needs-clarification';
    return `badge-${state}`;
  };

  const unprocessedCount = businessCaptures.filter((c) => c.handoffState === 'unprocessed').length;
  const exportedCount = businessCaptures.filter((c) => c.handoffState === 'exported').length;
  const processedCount = businessCaptures.filter((c) => c.handoffState === 'processed').length;

  if (dataLoading) {
    return (
      <div className="page-container">
        <h1 style={{ marginBottom: '24px' }}>Export &amp; Backup</h1>
        <div className="empty-state" role="status">
          <p>Loading your export data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 style={{ marginBottom: '24px' }}>Export &amp; Backup</h1>

      {/* Business Export */}
      <section className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Business Export</h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}
        >
          {businessCaptures.length} capture(s) total · {unprocessedCount} unprocessed · {exportedCount} exported ·{' '}
          {processedCount} processed
        </p>

        {/* Capture list with checkboxes */}
        <div style={{ marginBottom: '16px' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowCaptureList((prev) => !prev)}
            aria-label={showCaptureList ? 'Hide capture list' : 'Show capture list'}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <span>{showCaptureList ? 'Hide captures' : 'Select captures to export'}</span>
            {showCaptureList ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {showCaptureList && (
            <div style={{ marginTop: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-ghost" onClick={selectAll}>
                  Select all
                </button>
                <button className="btn btn-sm btn-ghost" onClick={selectNone}>
                  None
                </button>
                <button className="btn btn-sm btn-ghost" onClick={selectUnprocessed}>
                  Unprocessed
                </button>
              </div>
              {businessCaptures.length === 0 ? (
                <div
                  className="empty-state"
                  style={{ padding: '24px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}
                >
                  No captures yet.
                </div>
              ) : (
                businessCaptures.map((capture) => (
                  <label
                    key={capture.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: selectedIds.has(capture.id)
                        ? 'var(--color-accent-soft)'
                        : 'transparent',
                      cursor: 'pointer',
                      marginBottom: '6px',
                      border: '1px solid',
                      borderColor: selectedIds.has(capture.id)
                        ? 'var(--color-accent)'
                        : 'var(--color-border)',
                      transition: 'background-color 150ms ease',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(capture.id)}
                      onChange={() => toggleSelection(capture.id)}
                      aria-label={`Select ${capture.localId}`}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {capture.localId}
                        {capture.workingTitle ? ` — ${capture.workingTitle}` : ''}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                        <span className={`badge ${badgeClassForHandoff(capture.handoffState)}`}>
                          {capture.handoffState}
                        </span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Export actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="action-row">
            <button
              className="btn btn-primary"
              onClick={handleExportSelectedMarkdown}
              disabled={selectedIds.size === 0}
              aria-label="Export selected captures as Markdown"
            >
              <FileText size={18} />
              Export selected
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportSelectedJSON}
              disabled={selectedIds.size === 0}
              aria-label="Export selected captures as JSON"
            >
              <FileBraces size={18} />
              JSON
            </button>
          </div>
          <div className="action-row">
            <button
              className="btn btn-primary"
              onClick={handleExportUnprocessedMarkdown}
              disabled={unprocessedCount === 0}
              aria-label="Export all unprocessed captures as Markdown"
            >
              <FileText size={18} />
              Export all unprocessed
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportUnprocessedJSON}
              disabled={unprocessedCount === 0}
              aria-label="Export all unprocessed captures as JSON"
            >
              <FileBraces size={18} />
              JSON
            </button>
          </div>
          <div className="action-row">
            <button
              className="btn btn-primary"
              onClick={handleExportAllMarkdown}
              disabled={businessCaptures.length === 0}
              aria-label="Export all captures as Markdown"
            >
              <FileText size={18} />
              Export all captures
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExportAllJSON}
              disabled={businessCaptures.length === 0}
              aria-label="Export all captures as JSON"
            >
              <FileBraces size={18} />
              JSON
            </button>
          </div>
        </div>
      </section>

      {/* Processing Result Import */}
      <section className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Processing Result Import</h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}
        >
          Paste a processing result JSON from the Incubator, or upload a file.
        </p>
        <div className="form-group">
          <label htmlFor="processing-json">Processing result JSON</label>
          <textarea
            id="processing-json"
            value={processingJson}
            onChange={(e) => setProcessingJson(e.target.value)}
            placeholder='{"schemaVersion":"1.0","type":"incubator-processing-result","batchId":"...","processedAt":"...","results":[...]}'
            aria-label="Processing result JSON"
          />
        </div>
        <div className="form-group">
          <label htmlFor="processing-file">Or upload a file</label>
          <input
            id="processing-file"
            type="file"
            accept=".json,application/json"
            ref={processingFileInputRef}
            onChange={handleProcessingFileChange}
            aria-label="Upload processing result JSON file"
          />
        </div>
        <button
          className="btn btn-secondary btn-block"
          onClick={handleValidateProcessing}
          aria-label="Validate processing result"
        >
          <Check size={18} />
          Validate &amp; Preview
        </button>

        {processingPreview && (
          <div
            style={{
              marginTop: '20px',
              padding: '16px',
              background: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>Preview</h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
              }}
            >
              {processingPreview.matches.filter((m) => m.capture).length} of{' '}
              {processingPreview.matches.length} result(s) match existing captures.
            </p>
            <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '16px' }}>
              {processingPreview.matches.map((m, i) => (
                <div
                  key={i}
                  style={{
                    padding: '10px',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '0.875rem',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {m.resultItem.captureId} — {m.resultItem.outcome}
                    {m.capture ? '' : ' (no match)'}
                  </div>
                  {m.resultItem.ideaId && (
                    <div style={{ color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                      Official ID: {m.resultItem.ideaId}
                    </div>
                  )}
                  {m.resultItem.note && (
                    <div style={{ color: 'var(--color-text-secondary)' }}>Note: {m.resultItem.note}</div>
                  )}
                  {m.capture && (
                    <div
                      style={{
                        marginTop: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--color-text-tertiary)',
                      }}
                    >
                      Current state: {m.capture.handoffState}
                      {m.capture.officialIdeaId ? ` · Current ID: ${m.capture.officialIdeaId}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={handleApplyProcessing}
              disabled={processingPreview.matches.filter((m) => m.capture).length === 0}
              aria-label="Apply processing results"
            >
              <Check size={18} />
              Apply {processingPreview.matches.filter((m) => m.capture).length} change(s)
            </button>
          </div>
        )}
      </section>

      {/* Backup & Restore */}
      <section className="card" style={{ marginBottom: '24px' }}>
        <h2 className="section-title">Backup &amp; Restore</h2>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginBottom: '16px',
            fontSize: '0.875rem',
          }}
        >
          Your data lives in this browser profile. Clearing browser storage may erase it. GitHub hosts
          the app code, not your data. A full backup includes business captures, activities, wishlist
          items, savings progress, and draw history. Regular backups are recommended.
        </p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <button
            className="btn btn-primary"
            onClick={handleDownloadBackup}
            aria-label="Download full backup"
          >
            <Download size={18} />
            Download full backup
          </button>
          <button
            className="btn btn-secondary"
            onClick={handleRequestPersist}
            disabled={persistStatus === 'granted' || persistStatus === 'unsupported'}
            aria-label="Request persistent storage"
          >
            <HardDrive size={18} />
            {persistStatus === 'granted'
              ? 'Storage is persistent'
              : persistStatus === 'unsupported'
                ? 'Not supported'
                : 'Request persistent storage'}
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="backup-file">Import a backup file</label>
          <input
            id="backup-file"
            type="file"
            accept=".json,application/json"
            ref={backupFileInputRef}
            onChange={handleBackupFileChange}
            aria-label="Import backup JSON file"
          />
        </div>
      </section>

      {/* Danger Zone */}
      <section
        className="card"
        style={{ marginBottom: '24px', borderColor: 'var(--color-danger)' }}
      >
        <h2 className="section-title" style={{ color: 'var(--color-danger)' }}>
          Danger Zone
        </h2>
        {!showClearConfirm ? (
          <button
            className="btn btn-danger btn-block"
            onClick={() => setShowClearConfirm(true)}
            aria-label="Clear all data"
          >
            <Trash2 size={18} />
            Clear all data
          </button>
        ) : (
          <div
            style={{
              background: 'rgba(184, 92, 92, 0.08)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-danger)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                color: 'var(--color-danger)',
                fontWeight: 600,
              }}
            >
              <TriangleAlert size={18} />
              This cannot be undone.
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                marginBottom: '12px',
              }}
            >
              Type <strong>DELETE</strong> to confirm you want to erase all data.
            </p>
            <input
              value={clearConfirmText}
              onChange={(e) => setClearConfirmText(e.target.value)}
              placeholder="Type DELETE"
              aria-label="Type DELETE to confirm clearing all data"
              style={{ marginBottom: '12px' }}
            />
            <div className="action-row">
              <button className="btn btn-danger" onClick={handleClearAll} aria-label="Confirm clear all data">
                <Trash2 size={18} />
                Permanently delete
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setShowClearConfirm(false);
                  setClearConfirmText('');
                }}
                aria-label="Cancel clear all data"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Import Preview Modal */}
      {showImportModal && backupDiff && backupImportData && (
        <ImportPreviewModal
          diff={backupDiff}
          historyAdditionCount={getDrawHistoryAdditions(drawHistory, backupImportData.drawHistory).length}
          legacyWithoutWishlist={
            backupImportData.schemaVersion === '1.0' && backupImportData.wishlistItems.length === 0
          }
          currentWishlistCount={wishlistItems.length}
          onMerge={handleMergeImport}
          onReplace={handleReplaceImport}
          onCancel={handleCancelImport}
          importing={importing}
        />
      )}
    </div>
  );
};
