import { describe, it, expect } from 'vitest';
import {
  validateProcessingResult,
  validateBackup,
  computeImportDiff,
  buildMarkdownExport,
  buildAppBackup,
  getDrawHistoryAdditions,
} from './export';
import type {
  BusinessCapture,
  ProcessingResult,
  AppBackup,
  RecordItem,
  Activity,
  DrawHistoryEntry,
  WishlistItem,
} from '../types';

const NOW = '2026-07-12T10:00:00.000Z';

const makeCapture = (overrides: Partial<BusinessCapture> = {}): BusinessCapture => ({
  id: 'uuid-1',
  localId: 'CAP-20260712-001',
  type: 'business',
  rawWording: 'A test idea',
  tags: [],
  capturedAt: NOW,
  updatedAt: NOW,
  handoffState: 'unprocessed',
  ...overrides,
});

const makeActivity = (overrides: Partial<Activity> = {}): Activity => ({
  id: 'activity-1',
  type: 'hobby',
  title: 'Paint a small canvas',
  tags: [],
  moodTags: ['create'],
  status: 'available',
  pickCount: 0,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeHistoryEntry = (overrides: Partial<DrawHistoryEntry> = {}): DrawHistoryEntry => ({
  id: 'history-1',
  activityId: 'activity-1',
  drawnAt: NOW,
  criteria: {
    time: '30m',
    energy: 'medium',
    mood: 'create',
    strictMood: false,
    includeBusiness: false,
  },
  action: 'started',
  ...overrides,
});

const makeWishlistItem = (overrides: Partial<WishlistItem> = {}): WishlistItem => ({
  id: 'wishlist-1',
  type: 'wishlist',
  title: 'A useful thing',
  productUrl: 'https://example.com/product',
  targetPriceCents: 12_500,
  savedAmountCents: 2_500,
  status: 'active',
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides,
});

const makeProcessingResult = (overrides: Partial<ProcessingResult> = {}): ProcessingResult => ({
  schemaVersion: '1.0',
  type: 'incubator-processing-result',
  batchId: 'batch-1',
  processedAt: NOW,
  results: [{ captureId: 'CAP-001', outcome: 'created', ideaId: 'IDEA-001', note: 'Done' }],
  ...overrides,
});

const makeBackup = (overrides: Partial<AppBackup> = {}): AppBackup => ({
  schemaVersion: '1.1',
  backupId: 'backup-1',
  exportedAt: NOW,
  appVersion: '1.1.0',
  records: [makeCapture(), makeActivity()],
  drawHistory: [makeHistoryEntry()],
  wishlistItems: [makeWishlistItem()],
  ...overrides,
});

describe('validateProcessingResult', () => {
  it('returns valid result for correct schema', () => {
    const data = makeProcessingResult();
    expect(validateProcessingResult(data)).toEqual(data);
  });

  it('returns null for invalid schema version', () => {
    expect(validateProcessingResult({ ...makeProcessingResult(), schemaVersion: '2.0' })).toBeNull();
  });

  it('returns null for wrong type', () => {
    expect(validateProcessingResult({ ...makeProcessingResult(), type: 'other' })).toBeNull();
  });

  it('returns null when required batch metadata is missing or invalid', () => {
    const { batchId: _batchId, ...withoutBatchId } = makeProcessingResult();
    expect(validateProcessingResult(withoutBatchId)).toBeNull();
    expect(validateProcessingResult({ ...makeProcessingResult(), processedAt: 'not-a-timestamp' })).toBeNull();
  });

  it('returns null for invalid outcome', () => {
    const data = {
      ...makeProcessingResult(),
      results: [{ captureId: 'CAP-001', outcome: 'invalid' }],
    };
    expect(validateProcessingResult(data)).toBeNull();
  });

  it('returns null for invalid ideaId format', () => {
    const data = {
      ...makeProcessingResult(),
      results: [{ captureId: 'CAP-001', outcome: 'created', ideaId: 'IDEA-01' }],
    };
    expect(validateProcessingResult(data)).toBeNull();
  });

  it('accepts valid ideaId with 3+ digits', () => {
    const data = {
      ...makeProcessingResult(),
      results: [{ captureId: 'CAP-001', outcome: 'created', ideaId: 'IDEA-123' }],
    };
    expect(validateProcessingResult(data)).not.toBeNull();
  });

  it('returns null for non-string notes and duplicate capture mappings', () => {
    expect(
      validateProcessingResult({
        ...makeProcessingResult(),
        results: [{ captureId: 'CAP-001', outcome: 'created', note: { unsafe: true } }],
      })
    ).toBeNull();
    expect(
      validateProcessingResult({
        ...makeProcessingResult(),
        results: [
          { captureId: 'CAP-001', outcome: 'created' },
          { captureId: 'CAP-001', outcome: 'duplicate' },
        ],
      })
    ).toBeNull();
  });
});

describe('validateBackup', () => {
  it('returns valid backup for correct schema', () => {
    const backup = makeBackup();
    expect(validateBackup(backup)).toEqual(backup);
  });

  it('builds and validates a v1.1 backup with wishlist items kept separate', () => {
    const records = [makeCapture(), makeActivity()];
    const drawHistory = [makeHistoryEntry()];
    const wishlistItems = [makeWishlistItem()];

    const backup = buildAppBackup({ records, drawHistory, wishlistItems });

    expect(backup).toMatchObject({
      schemaVersion: '1.1',
      appVersion: '1.2.1',
      records,
      drawHistory,
      wishlistItems,
    });
    expect(validateBackup(backup)).toEqual(backup);
  });

  it('normalizes a legacy v1.0 backup without wishlist data', () => {
    const legacyBackup = {
      schemaVersion: '1.0',
      backupId: 'legacy-backup',
      exportedAt: NOW,
      appVersion: '1.0.0',
      records: [makeCapture(), makeActivity()],
      drawHistory: [makeHistoryEntry()],
    };

    expect(validateBackup(legacyBackup)).toEqual({
      ...legacyBackup,
      wishlistItems: [],
    });
  });

  it('requires the separate wishlist array in v1.1 backups', () => {
    const { wishlistItems: _wishlistItems, ...withoutWishlistItems } = makeBackup();
    expect(validateBackup(withoutWishlistItems)).toBeNull();
  });

  it('returns null for missing schemaVersion', () => {
    expect(validateBackup({ records: [], drawHistory: [] })).toBeNull();
  });

  it('returns null for non-array records', () => {
    expect(validateBackup({ ...makeBackup(), records: 'bad' })).toBeNull();
  });

  it('validates every record instead of only an initial sample', () => {
    const validRecords = Array.from({ length: 5 }, (_, index) =>
      makeCapture({
        id: `uuid-${index + 1}`,
        localId: `CAP-20260712-${String(index + 1).padStart(3, '0')}`,
      })
    );
    const malformedSixthRecord = { id: 'activity-broken', type: 'hobby', title: 'Missing required fields' };
    expect(
      validateBackup({ ...makeBackup(), records: [...validRecords, malformedSixthRecord] })
    ).toBeNull();
  });

  it('returns null for malformed business or activity fields', () => {
    expect(
      validateBackup({ ...makeBackup(), records: [makeCapture({ localId: 'CAP-001' })] })
    ).toBeNull();
    expect(
      validateBackup({ ...makeBackup(), records: [{ ...makeActivity(), moodTags: ['unsupported'] }] })
    ).toBeNull();
  });

  it('returns null for malformed wishlist amounts', () => {
    const invalidItems = [
      makeWishlistItem({ savedAmountCents: -1 }),
      makeWishlistItem({ savedAmountCents: 1.5 }),
      makeWishlistItem({ savedAmountCents: Number.NaN }),
      makeWishlistItem({ savedAmountCents: Number.POSITIVE_INFINITY }),
      makeWishlistItem({ targetPriceCents: -1 }),
      makeWishlistItem({ targetPriceCents: 1.5 }),
      makeWishlistItem({ targetPriceCents: Number.NaN }),
      makeWishlistItem({ targetPriceCents: Number.POSITIVE_INFINITY }),
    ];

    for (const item of invalidItems) {
      expect(validateBackup({ ...makeBackup(), wishlistItems: [item] })).toBeNull();
    }
  });

  it('returns null for malformed wishlist status, URL, or timestamps', () => {
    const invalidItems = [
      { ...makeWishlistItem(), status: 'saving' },
      makeWishlistItem({ productUrl: 'javascript:alert(1)' }),
      makeWishlistItem({ productUrl: 'ftp://example.com/product' }),
      makeWishlistItem({ productUrl: 'not a URL' }),
      makeWishlistItem({ createdAt: 'not-a-timestamp' }),
      makeWishlistItem({ updatedAt: 'not-a-timestamp' }),
      makeWishlistItem({ boughtAt: 'not-a-timestamp' }),
    ];

    for (const item of invalidItems) {
      expect(validateBackup({ ...makeBackup(), wishlistItems: [item] })).toBeNull();
    }
  });

  it('returns null for malformed draw history', () => {
    expect(
      validateBackup({
        ...makeBackup(),
        drawHistory: [{ ...makeHistoryEntry(), criteria: { time: '30m' } }],
      })
    ).toBeNull();
  });

  it('returns null for duplicate immutable IDs', () => {
    expect(
      validateBackup({
        ...makeBackup(),
        records: [makeCapture({ id: 'same' }), makeActivity({ id: 'same' })],
      })
    ).toBeNull();
    expect(
      validateBackup({
        ...makeBackup(),
        drawHistory: [makeHistoryEntry(), makeHistoryEntry({ activityId: 'activity-2' })],
      })
    ).toBeNull();
    expect(
      validateBackup({
        ...makeBackup(),
        wishlistItems: [
          makeWishlistItem({ id: 'same' }),
          makeWishlistItem({ id: 'same', title: 'Another item' }),
        ],
      })
    ).toBeNull();
  });

  it('returns null when a wishlist ID collides with a record ID', () => {
    expect(
      validateBackup({
        ...makeBackup(),
        wishlistItems: [makeWishlistItem({ id: 'uuid-1' })],
      })
    ).toBeNull();
  });
});

describe('getDrawHistoryAdditions', () => {
  it('restores only missing history entries during a merge', () => {
    const current = [makeHistoryEntry({ id: 'existing', action: 'started' })];
    const incoming = [
      makeHistoryEntry({ id: 'existing', action: 'done' }),
      makeHistoryEntry({ id: 'new', activityId: 'activity-2' }),
    ];

    expect(getDrawHistoryAdditions(current, incoming)).toEqual([incoming[1]]);
  });
});

describe('computeImportDiff', () => {
  it('identifies additions for new records', () => {
    const current: RecordItem[] = [makeCapture({ id: 'existing' })];
    const incoming: RecordItem[] = [makeCapture({ id: 'existing' }), makeCapture({ id: 'new' })];
    const diff = computeImportDiff(current, incoming);
    expect(diff.additions).toHaveLength(1);
    expect(diff.additions[0].id).toBe('new');
    expect(diff.unchanged).toHaveLength(1);
  });

  it('identifies updates when same ID but different content', () => {
    const current: RecordItem[] = [makeCapture({ id: 'same', workingTitle: 'Old' })];
    const incoming: RecordItem[] = [makeCapture({ id: 'same', workingTitle: 'New', updatedAt: new Date(Date.now() + 1000).toISOString() })];
    const diff = computeImportDiff(current, incoming);
    expect(diff.updates).toHaveLength(1);
    expect((diff.updates[0].updated as BusinessCapture).workingTitle).toBe('New');
  });

  it('identifies conflicts when timestamps are equal', () => {
    const now = new Date().toISOString();
    const current: RecordItem[] = [makeCapture({ id: 'same', workingTitle: 'A', updatedAt: now })];
    const incoming: RecordItem[] = [makeCapture({ id: 'same', workingTitle: 'B', updatedAt: now })];
    const diff = computeImportDiff(current, incoming);
    expect(diff.conflicts).toHaveLength(1);
  });
});

describe('buildMarkdownExport', () => {
  it('preserves raw wording exactly with Unicode and emojis', () => {
    const capture = makeCapture({ rawWording: 'Café app for 🐶 walkers — track routes & tips!' });
    const md = buildMarkdownExport([capture]);
    expect(md).toContain('Café app for 🐶 walkers — track routes & tips!');
  });

  it('includes processing instructions at the top', () => {
    const md = buildMarkdownExport([makeCapture()]);
    expect(md).toContain('These are unprocessed captures from the Idea Jar companion app');
    expect(md).toContain('IDEA-###');
  });

  it('includes local capture ID and status', () => {
    const md = buildMarkdownExport([makeCapture({ localId: 'CAP-20260712-001', handoffState: 'unprocessed' })]);
    expect(md).toContain('CAP-20260712-001');
    expect(md).toContain('unprocessed');
  });
});
