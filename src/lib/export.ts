import type {
  BusinessCapture,
  BusinessExport,
  ProcessingResult,
  AppBackup,
  RecordItem,
  ImportDiff,
  DrawHistoryEntry,
  WishlistItem,
} from '../types';

const PROCESSING_OUTCOMES = ['created', 'duplicate', 'variation', 'needs_clarification', 'error'] as const;
const HANDOFF_STATES = ['unprocessed', 'exported', 'processed', 'needs_clarification', 'archived'] as const;
const ACTIVITY_TYPES = ['hobby', 'diy', 'ai-project', 'learning', 'other'] as const;
const ACTIVITY_STATUSES = ['available', 'in_progress', 'completed', 'paused', 'archived'] as const;
const TIME_ESTIMATES = ['10m', '30m', '1-2h', 'few_hours', 'surprise'] as const;
const ENERGY_LEVELS = ['low', 'medium', 'high', 'surprise'] as const;
const MOOD_TAGS = ['create', 'learn', 'build_fix', 'relax', 'active', 'surprise'] as const;
const MATERIALS_READY_VALUES = ['yes', 'no', 'n/a'] as const;
const COST_BANDS = ['free', 'under_10', 'under_50', 'under_100', 'over_100', 'unknown'] as const;
const DRAW_ACTIONS = ['started', 'snoozed', 'picked_another', 'done', 'made_smaller'] as const;
const WISHLIST_STATUSES = ['active', 'bought', 'archived'] as const;
const OFFICIAL_ID_PATTERN = /^IDEA-[0-9]{3,}$/;
const LOCAL_CAPTURE_ID_PATTERN = /^CAP-[0-9]{8}-[0-9]{3,}$/;

export function buildMarkdownExport(captures: BusinessCapture[]): string {
  const batchId = crypto.randomUUID?.() ?? `${Date.now()}`;
  const exportedAt = new Date().toISOString();
  const dateStr = exportedAt.slice(0, 10);

  let md = `# Business Idea Inbox Export\n\n`;
  md += `**Export date:** ${dateStr}\n`;
  md += `**Batch ID:** ${batchId}\n\n`;
  md += `> These are unprocessed captures from the Idea Jar companion app. Before changing the Business Idea Incubator, read its operating files and master workbook. For each capture, preserve the raw wording, check the existing portfolio for duplicates or variations, and only then assign the next official \`IDEA-###\` identifier when appropriate. Create or update the narrative idea record, master workbook row, and update log together. Start new ideas with status \`Captured\`. Leave unknown cells blank. Do not invent evidence or research and do not research unless explicitly requested. Return a processing-result mapping containing each local capture ID, its outcome, any assigned or matched official Idea ID, and a short note. Give one recommended next action.\n\n`;
  md += `---\n\n`;

  for (const c of captures) {
    md += `## ${c.localId}\n\n`;
    if (c.workingTitle) md += `**Working title:** ${escapeMarkdown(c.workingTitle)}\n\n`;
    md += `### Raw wording (preserved exactly)\n\n${escapeMarkdown(c.rawWording)}\n\n`;
    if (c.category) md += `**Category:** ${escapeMarkdown(c.category)}\n\n`;
    if (c.likelyCustomer) md += `**Likely customer (preliminary hypothesis):** ${escapeMarkdown(c.likelyCustomer)}\n\n`;
    if (c.possibleProblem) md += `**Possible problem (preliminary hypothesis):** ${escapeMarkdown(c.possibleProblem)}\n\n`;
    if (c.whyMightPay) md += `**Why someone might pay (preliminary hypothesis):** ${escapeMarkdown(c.whyMightPay)}\n\n`;
    if (c.geography) md += `**Geography:** ${escapeMarkdown(c.geography)}\n\n`;
    if (c.assumptions) md += `**User-entered assumptions:**\n\n${escapeMarkdown(c.assumptions)}\n\n`;
    if (c.evidence) md += `**User-entered evidence or source links:**\n\n${escapeMarkdown(c.evidence)}\n\n`;
    if (c.questions) md += `**Questions to investigate:**\n\n${escapeMarkdown(c.questions)}\n\n`;
    if (c.tags.length > 0) md += `**Tags:** ${c.tags.map(t => escapeMarkdown(t)).join(', ')}\n\n`;
    md += `**Captured:** ${formatLocalDate(c.capturedAt)}\n\n`;
    md += `**Status:** ${c.handoffState}\n\n`;
    if (c.officialIdeaId) md += `**Official Idea ID:** ${c.officialIdeaId}\n\n`;
    md += `---\n\n`;
  }

  return md;
}

export function buildBatchJSON(captures: BusinessCapture[]): BusinessExport {
  return {
    schemaVersion: '1.0',
    batchId: crypto.randomUUID?.() ?? `${Date.now()}`,
    exportedAt: new Date().toISOString(),
    captures,
  };
}

export function buildAppBackup({
  records,
  drawHistory,
  wishlistItems,
}: Pick<AppBackup, 'records' | 'drawHistory' | 'wishlistItems'>): AppBackup {
  return {
    schemaVersion: '1.1',
    backupId: crypto.randomUUID?.() ?? `${Date.now()}`,
    exportedAt: new Date().toISOString(),
    appVersion: '1.1.0',
    records,
    drawHistory,
    wishlistItems,
  };
}

export function validateProcessingResult(data: unknown): ProcessingResult | null {
  if (!isObjectRecord(data)) return null;
  const d = data;
  if (d.schemaVersion !== '1.0') return null;
  if (d.type !== 'incubator-processing-result') return null;
  if (!isNonEmptyString(d.batchId)) return null;
  if (!isIsoTimestamp(d.processedAt)) return null;
  if (!Array.isArray(d.results)) return null;

  const captureIds = new Set<string>();
  for (const r of d.results) {
    if (!isObjectRecord(r)) return null;
    if (!isNonEmptyString(r.captureId)) return null;
    if (captureIds.has(r.captureId)) return null;
    captureIds.add(r.captureId);
    if (!isOneOf(r.outcome, PROCESSING_OUTCOMES)) return null;
    if (r.ideaId !== undefined && (typeof r.ideaId !== 'string' || !OFFICIAL_ID_PATTERN.test(r.ideaId))) {
      return null;
    }
    if (!isOptionalString(r.note)) return null;
  }
  return data as unknown as ProcessingResult;
}

export function validateBackup(data: unknown): AppBackup | null {
  if (!isObjectRecord(data)) return null;
  const d = data;
  if (d.schemaVersion !== '1.0' && d.schemaVersion !== '1.1') return null;
  if (!isNonEmptyString(d.backupId)) return null;
  if (!isIsoTimestamp(d.exportedAt)) return null;
  if (!isNonEmptyString(d.appVersion)) return null;
  if (!Array.isArray(d.records)) return null;
  if (!Array.isArray(d.drawHistory)) return null;
  if (d.schemaVersion === '1.1' && !Array.isArray(d.wishlistItems)) return null;
  if (d.wishlistItems !== undefined && !Array.isArray(d.wishlistItems)) return null;

  const wishlistItems = d.wishlistItems ?? [];

  const recordIds = new Set<string>();
  const localCaptureIds = new Set<string>();
  for (const record of d.records) {
    if (!isValidRecord(record)) return null;
    if (recordIds.has(record.id)) return null;
    recordIds.add(record.id);
    if (record.type === 'business') {
      if (localCaptureIds.has(record.localId)) return null;
      localCaptureIds.add(record.localId);
    }
  }

  const wishlistIds = new Set<string>();
  for (const item of wishlistItems) {
    if (!isValidWishlistItem(item)) return null;
    if (recordIds.has(item.id) || wishlistIds.has(item.id)) return null;
    wishlistIds.add(item.id);
  }

  const historyIds = new Set<string>();
  for (const entry of d.drawHistory) {
    if (!isValidDrawHistoryEntry(entry)) return null;
    if (historyIds.has(entry.id)) return null;
    historyIds.add(entry.id);
  }

  return {
    schemaVersion: d.schemaVersion,
    backupId: d.backupId,
    exportedAt: d.exportedAt,
    appVersion: d.appVersion,
    records: d.records as RecordItem[],
    drawHistory: d.drawHistory as DrawHistoryEntry[],
    wishlistItems: wishlistItems as WishlistItem[],
  };
}

export function getDrawHistoryAdditions(
  current: DrawHistoryEntry[],
  incoming: DrawHistoryEntry[]
): DrawHistoryEntry[] {
  const currentIds = new Set(current.map((entry) => entry.id));
  return incoming.filter((entry) => !currentIds.has(entry.id));
}

function isValidRecord(value: unknown): value is RecordItem {
  if (!isObjectRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isIsoTimestamp(value.updatedAt)) return false;

  if (value.type === 'business') {
    if (typeof value.localId !== 'string' || !LOCAL_CAPTURE_ID_PATTERN.test(value.localId)) return false;
    if (typeof value.rawWording !== 'string') return false;
    if (!isStringArray(value.tags)) return false;
    if (!isIsoTimestamp(value.capturedAt)) return false;
    if (!isOneOf(value.handoffState, HANDOFF_STATES)) return false;
    if (
      !areOptionalStrings(value, [
        'workingTitle',
        'category',
        'likelyCustomer',
        'possibleProblem',
        'whyMightPay',
        'geography',
        'assumptions',
        'evidence',
        'questions',
        'processingOutcome',
      ])
    ) {
      return false;
    }
    if (
      value.officialIdeaId !== undefined &&
      (typeof value.officialIdeaId !== 'string' || !OFFICIAL_ID_PATTERN.test(value.officialIdeaId))
    ) {
      return false;
    }
    return true;
  }

  if (!isOneOf(value.type, ACTIVITY_TYPES)) return false;
  if (typeof value.title !== 'string') return false;
  if (!isStringArray(value.tags)) return false;
  if (!isEnumArray(value.moodTags, MOOD_TAGS)) return false;
  if (!isOneOf(value.status, ACTIVITY_STATUSES)) return false;
  if (typeof value.pickCount !== 'number' || !Number.isInteger(value.pickCount) || value.pickCount < 0) return false;
  if (!isIsoTimestamp(value.createdAt)) return false;
  if (!areOptionalStrings(value, ['notes', 'location', 'materialsNeeded', 'smallestStep', 'fiveMinuteVersion'])) {
    return false;
  }
  if (value.estimatedTime !== undefined && !isOneOf(value.estimatedTime, TIME_ESTIMATES)) return false;
  if (value.energy !== undefined && !isOneOf(value.energy, ENERGY_LEVELS)) return false;
  if (value.costBand !== undefined && !isOneOf(value.costBand, COST_BANDS)) return false;
  if (value.materialsReady !== undefined && !isOneOf(value.materialsReady, MATERIALS_READY_VALUES)) return false;
  if (value.snoozedUntil !== undefined && !isIsoTimestamp(value.snoozedUntil)) return false;
  if (value.lastPickedAt !== undefined && !isIsoTimestamp(value.lastPickedAt)) return false;
  return true;
}

function isValidWishlistItem(value: unknown): value is WishlistItem {
  if (!isObjectRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (value.type !== 'wishlist') return false;
  if (!isNonEmptyString(value.title)) return false;
  if (!isOneOf(value.status, WISHLIST_STATUSES)) return false;
  if (!isIsoTimestamp(value.createdAt) || !isIsoTimestamp(value.updatedAt)) return false;
  if (!areOptionalStrings(value, ['notes'])) return false;
  if (value.productUrl !== undefined && !isHttpUrl(value.productUrl)) return false;
  if (!isNonNegativeInteger(value.savedAmountCents)) return false;
  if (value.targetPriceCents !== undefined && !isNonNegativeInteger(value.targetPriceCents)) return false;
  if (value.boughtAt !== undefined && !isIsoTimestamp(value.boughtAt)) return false;
  return true;
}

function isValidDrawHistoryEntry(value: unknown): value is DrawHistoryEntry {
  if (!isObjectRecord(value)) return false;
  if (!isNonEmptyString(value.id)) return false;
  if (!isNonEmptyString(value.activityId)) return false;
  if (!isIsoTimestamp(value.drawnAt)) return false;
  if (!isOneOf(value.action, DRAW_ACTIONS)) return false;
  if (!isObjectRecord(value.criteria)) return false;
  if (!isOneOf(value.criteria.time, TIME_ESTIMATES)) return false;
  if (!isOneOf(value.criteria.energy, ENERGY_LEVELS)) return false;
  if (!isOneOf(value.criteria.mood, MOOD_TAGS)) return false;
  if (typeof value.criteria.strictMood !== 'boolean') return false;
  if (typeof value.criteria.includeBusiness !== 'boolean') return false;
  return true;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function areOptionalStrings(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => isOptionalString(value[field]));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isEnumArray(value: unknown, allowed: readonly string[]): value is string[] {
  return Array.isArray(value) && value.every((item) => isOneOf(item, allowed));
}

function isOneOf(value: unknown, allowed: readonly string[]): value is string {
  return typeof value === 'string' && allowed.includes(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (!isNonEmptyString(value) || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return false;
  return !Number.isNaN(Date.parse(value));
}

export function computeImportDiff<T extends { id: string; updatedAt: string }>(
  currentRecords: T[],
  incomingRecords: T[]
): ImportDiff<T> {
  const currentMap = new Map(currentRecords.map(r => [r.id, r]));

  const additions: T[] = [];
  const updates: ImportDiff<T>['updates'] = [];
  const conflicts: ImportDiff<T>['conflicts'] = [];
  const unchanged: T[] = [];

  for (const incoming of incomingRecords) {
    const current = currentMap.get(incoming.id);
    if (!current) {
      additions.push(incoming);
    } else if (JSON.stringify(current) === JSON.stringify(incoming)) {
      unchanged.push(current);
    } else {
      // Both have same ID but different content — merge by updatedAt if possible
      const currDate = new Date(current.updatedAt ?? 0).getTime();
      const incDate = new Date(incoming.updatedAt ?? 0).getTime();
      if (incDate > currDate) {
        updates.push({ old: current, updated: incoming });
      } else if (incDate === currDate) {
        conflicts.push({ current, incoming });
      } else {
        unchanged.push(current);
      }
    }
  }

  return { additions, updates, conflicts, unchanged };
}

function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatLocalDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJSON(filename: string, data: unknown): void {
  downloadFile(filename, JSON.stringify(data, null, 2), 'application/json');
}
