// Shared data types for Idea Jar — Incubator Companion
// Frozen contract v1.0

export type CaptureType = 'business' | 'hobby' | 'diy' | 'ai-project' | 'learning' | 'other';

export type HandoffState = 'unprocessed' | 'exported' | 'processed' | 'needs_clarification' | 'archived';

export type ActivityStatus = 'available' | 'in_progress' | 'completed' | 'paused' | 'archived';

export type TimeEstimate = '10m' | '30m' | '1-2h' | 'few_hours' | 'surprise';

export type EnergyLevel = 'low' | 'medium' | 'high' | 'surprise';

export type MoodTag = 'create' | 'learn' | 'build_fix' | 'relax' | 'active' | 'surprise';

export type MaterialsReady = 'yes' | 'no' | 'n/a';

export type CostBand = 'free' | 'under_10' | 'under_50' | 'under_100' | 'over_100' | 'unknown';

export interface BusinessCapture {
  id: string; // internal UUID
  localId: string; // CAP-YYYYMMDD-NNN format
  type: 'business';
  rawWording: string; // preserved exactly
  workingTitle?: string;
  category?: string;
  likelyCustomer?: string;
  possibleProblem?: string;
  whyMightPay?: string;
  geography?: string;
  assumptions?: string;
  evidence?: string;
  questions?: string;
  tags: string[];
  capturedAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  handoffState: HandoffState;
  officialIdeaId?: string; // IDEA-### from ChatGPT Work
  processingOutcome?: string;
}

export interface Activity {
  id: string; // internal UUID
  type: Exclude<CaptureType, 'business'>;
  title: string;
  notes?: string;
  tags: string[];
  moodTags: MoodTag[];
  estimatedTime?: TimeEstimate;
  energy?: EnergyLevel;
  location?: string;
  costBand?: CostBand;
  materialsNeeded?: string;
  materialsReady?: MaterialsReady;
  smallestStep?: string;
  fiveMinuteVersion?: string;
  status: ActivityStatus;
  snoozedUntil?: string; // ISO timestamp
  pickCount: number;
  lastPickedAt?: string; // ISO timestamp
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export type WishlistStatus = 'active' | 'bought' | 'archived';

export interface WishlistItem {
  id: string; // internal UUID
  type: 'wishlist';
  title: string;
  notes?: string;
  productUrl?: string;
  targetPriceCents?: number;
  savedAmountCents: number;
  status: WishlistStatus;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  boughtAt?: string; // ISO timestamp
}

export type RecordItem = BusinessCapture | Activity;

export function isBusinessCapture(item: RecordItem): item is BusinessCapture {
  return item.type === 'business';
}

export function isActivity(item: RecordItem): item is Activity {
  return item.type !== 'business';
}

export function generateLocalId(index: number): string {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(index + 1).padStart(3, '0');
  return `CAP-${y}${m}${d}-${seq}`;
}

export function generateUUID(): string {
  return crypto.randomUUID?.() ?? `${1e7}-${1e3}-${4e3}-${8e3}-${1e11}`.replace(/[018]/g, (c) =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
  );
}

// Picker filter criteria
export interface PickerCriteria {
  time: TimeEstimate | 'surprise';
  energy: EnergyLevel | 'surprise';
  mood: MoodTag | 'surprise';
  strictMood: boolean; // if true, mood is a hard filter; if false, it's a preference
  includeBusiness: boolean; // opt-in to include business ideas with a next action
}

export interface PickerResult {
  item: Activity | null;
  reason: string; // why it fits
  relaxed?: boolean; // whether filters were relaxed to find this
  noExactMatch?: boolean;
  suggestions?: string[]; // how to broaden the choice
}

// Export schemas
export interface BusinessExport {
  schemaVersion: '1.0';
  batchId: string;
  exportedAt: string;
  captures: BusinessCapture[];
}

export interface ProcessingResult {
  schemaVersion: '1.0';
  type: 'incubator-processing-result';
  batchId: string;
  processedAt: string;
  results: Array<{
    captureId: string;
    outcome: 'created' | 'duplicate' | 'variation' | 'needs_clarification' | 'error';
    ideaId?: string;
    note?: string;
  }>;
}

export interface AppBackup {
  schemaVersion: '1.0' | '1.1';
  backupId: string;
  exportedAt: string;
  appVersion: string;
  records: RecordItem[];
  drawHistory: DrawHistoryEntry[];
  wishlistItems: WishlistItem[];
}

export interface DrawHistoryEntry {
  id: string;
  activityId: string;
  drawnAt: string;
  criteria: PickerCriteria;
  action: 'started' | 'snoozed' | 'picked_another' | 'done' | 'made_smaller';
}

export interface ImportDiff<T extends { id: string; updatedAt: string } = RecordItem> {
  additions: T[];
  updates: Array<{ old: T; updated: T }>;
  conflicts: Array<{ current: T; incoming: T }>;
  unchanged: T[];
}

export interface BackupImportDiff {
  records: ImportDiff<RecordItem>;
  wishlistItems: ImportDiff<WishlistItem>;
}
