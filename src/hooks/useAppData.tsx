import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { BusinessCapture, Activity, RecordItem, DrawHistoryEntry, WishlistItem } from '../types';
import {
  getAllBusinessCaptures,
  getAllActivities,
  saveBusinessCapture,
  saveActivity,
  deleteBusinessCapture,
  deleteActivity,
  getNextLocalId,
  getDrawHistory,
  addDrawHistory,
  getAllWishlistItems,
  saveWishlistItem,
  deleteWishlistItem,
  clearAllData,
} from '../db';

interface AppDataContextValue {
  businessCaptures: BusinessCapture[];
  activities: Activity[];
  wishlistItems: WishlistItem[];
  records: RecordItem[];
  drawHistory: DrawHistoryEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  saveCapture: (capture: BusinessCapture) => Promise<void>;
  saveAct: (activity: Activity) => Promise<void>;
  saveWish: (item: WishlistItem) => Promise<void>;
  removeCapture: (id: string) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;
  removeWishlistItem: (id: string) => Promise<void>;
  getNextId: () => Promise<string>;
  addHistory: (entry: DrawHistoryEntry) => Promise<void>;
  clearAll: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

// The provider and its hook intentionally share this private context module.
// eslint-disable-next-line react/only-export-components
export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [businessCaptures, setBusinessCaptures] = useState<BusinessCapture[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [drawHistory, setDrawHistory] = useState<DrawHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [biz, acts, hist, wishes] = await Promise.all([
        getAllBusinessCaptures(),
        getAllActivities(),
        getDrawHistory(),
        getAllWishlistItems(),
      ]);
      setBusinessCaptures(biz);
      setActivities(acts);
      setDrawHistory(hist);
      setWishlistItems(wishes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveCapture = useCallback(async (capture: BusinessCapture) => {
    await saveBusinessCapture(capture);
    await refresh();
  }, [refresh]);

  const saveAct = useCallback(async (activity: Activity) => {
    await saveActivity(activity);
    await refresh();
  }, [refresh]);

  const saveWish = useCallback(async (item: WishlistItem) => {
    await saveWishlistItem(item);
    await refresh();
  }, [refresh]);

  const removeCapture = useCallback(async (id: string) => {
    await deleteBusinessCapture(id);
    await refresh();
  }, [refresh]);

  const removeActivity = useCallback(async (id: string) => {
    await deleteActivity(id);
    await refresh();
  }, [refresh]);

  const removeWishlistItem = useCallback(async (id: string) => {
    await deleteWishlistItem(id);
    await refresh();
  }, [refresh]);

  const getNextId = useCallback(() => getNextLocalId(), []);

  const addHistory = useCallback(async (entry: DrawHistoryEntry) => {
    await addDrawHistory(entry);
    await refresh();
  }, [refresh]);

  const clearAll = useCallback(async () => {
    await clearAllData();
    await refresh();
  }, [refresh]);

  const records: RecordItem[] = [...businessCaptures, ...activities];

  return (
    <AppDataContext.Provider
      value={{
        businessCaptures,
        activities,
        wishlistItems,
        records,
        drawHistory,
        loading,
        refresh,
        saveCapture,
        saveAct,
        saveWish,
        removeCapture,
        removeActivity,
        removeWishlistItem,
        getNextId,
        addHistory,
        clearAll,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};
