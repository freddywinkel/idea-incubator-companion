import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type {
  BusinessCapture,
  Activity,
  DrawHistoryEntry,
  RecordItem,
  WishlistItem,
  WishlistStatus,
} from '../types';

const DB_NAME = 'IdeaJarDB';
const DB_VERSION = 2;

interface IdeaJarSchema extends DBSchema {
  businessCaptures: {
    key: string;
    value: BusinessCapture;
    indexes: {
      'by-localId': string;
      'by-handoffState': string;
      'by-capturedAt': string;
    };
  };
  activities: {
    key: string;
    value: Activity;
    indexes: {
      'by-status': string;
      'by-type': string;
      'by-createdAt': string;
    };
  };
  drawHistory: {
    key: string;
    value: DrawHistoryEntry;
    indexes: {
      'by-activityId': string;
      'by-drawnAt': string;
    };
  };
  wishlistItems: {
    key: string;
    value: WishlistItem;
    indexes: {
      'by-status': WishlistStatus;
      'by-createdAt': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<IdeaJarSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<IdeaJarSchema>> {
  if (dbPromise) return dbPromise;
  dbPromise = openDB<IdeaJarSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const bizStore = db.createObjectStore('businessCaptures', { keyPath: 'id' });
        bizStore.createIndex('by-localId', 'localId', { unique: true });
        bizStore.createIndex('by-handoffState', 'handoffState', { unique: false });
        bizStore.createIndex('by-capturedAt', 'capturedAt', { unique: false });

        const actStore = db.createObjectStore('activities', { keyPath: 'id' });
        actStore.createIndex('by-status', 'status', { unique: false });
        actStore.createIndex('by-type', 'type', { unique: false });
        actStore.createIndex('by-createdAt', 'createdAt', { unique: false });

        const histStore = db.createObjectStore('drawHistory', { keyPath: 'id' });
        histStore.createIndex('by-activityId', 'activityId', { unique: false });
        histStore.createIndex('by-drawnAt', 'drawnAt', { unique: false });
      }

      if (oldVersion < 2) {
        const wishlistStore = db.createObjectStore('wishlistItems', { keyPath: 'id' });
        wishlistStore.createIndex('by-status', 'status', { unique: false });
        wishlistStore.createIndex('by-createdAt', 'createdAt', { unique: false });
      }
    },
  });
  return dbPromise;
}

export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const granted = await navigator.storage.persist();
      return granted;
    } catch {
      return false;
    }
  }
  return false;
}

export async function getAllBusinessCaptures(): Promise<BusinessCapture[]> {
  const db = await getDB();
  return db.getAll('businessCaptures');
}

export async function getBusinessCaptureById(id: string): Promise<BusinessCapture | undefined> {
  const db = await getDB();
  return db.get('businessCaptures', id);
}

export async function saveBusinessCapture(capture: BusinessCapture): Promise<void> {
  const db = await getDB();
  await db.put('businessCaptures', capture);
}

export async function deleteBusinessCapture(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('businessCaptures', id);
}

export async function getAllActivities(): Promise<Activity[]> {
  const db = await getDB();
  return db.getAll('activities');
}

export async function getActivityById(id: string): Promise<Activity | undefined> {
  const db = await getDB();
  return db.get('activities', id);
}

export async function saveActivity(activity: Activity): Promise<void> {
  const db = await getDB();
  await db.put('activities', activity);
}

export async function deleteActivity(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('activities', id);
}

export async function getDrawHistory(): Promise<DrawHistoryEntry[]> {
  const db = await getDB();
  return db.getAll('drawHistory');
}

export async function addDrawHistory(entry: DrawHistoryEntry): Promise<void> {
  const db = await getDB();
  await db.put('drawHistory', entry);
}

export async function getAllWishlistItems(): Promise<WishlistItem[]> {
  const db = await getDB();
  return db.getAll('wishlistItems');
}

export async function getWishlistItemById(id: string): Promise<WishlistItem | undefined> {
  const db = await getDB();
  return db.get('wishlistItems', id);
}

export async function saveWishlistItem(item: WishlistItem): Promise<void> {
  const db = await getDB();
  await db.put('wishlistItems', item);
}

export async function deleteWishlistItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('wishlistItems', id);
}

export async function getNextLocalId(): Promise<string> {
  const captures = await getAllBusinessCaptures();
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const prefix = `CAP-${y}${m}${d}-`;
  const sameDay = captures.filter(c => c.localId.startsWith(prefix));
  const maxSeq = sameDay.length > 0
    ? Math.max(...sameDay.map(c => {
        const seqStr = c.localId.split('-')[3];
        return seqStr ? parseInt(seqStr, 10) : 0;
      }))
    : 0;
  const seq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

export async function getAllRecords(): Promise<RecordItem[]> {
  const [biz, acts] = await Promise.all([
    getAllBusinessCaptures(),
    getAllActivities(),
  ]);
  return [...biz, ...acts];
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['businessCaptures', 'activities', 'drawHistory', 'wishlistItems'], 'readwrite');
  await Promise.all([
    tx.objectStore('businessCaptures').clear(),
    tx.objectStore('activities').clear(),
    tx.objectStore('drawHistory').clear(),
    tx.objectStore('wishlistItems').clear(),
  ]);
  await tx.done;
}
