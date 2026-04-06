import useSWR from 'swr';
import { useCallback, useEffect, useState } from 'react';

const HISTORY_KEY = '/api/history';
const LOCAL_KEY = 'anime_watch_history_v2';

interface WatchHistoryItem {
  id?: number;
  animeSlug: string;
  animeTitle: string;
  animeCover?: string;
  episode: number;
  episodeTitle?: string;
  timestampSec: number;
  durationSec: number;
  completed: boolean;
  updatedAt?: string;
}

const fetcher = async (url: string): Promise<WatchHistoryItem[]> => {
  try {
    const res = await fetch(url);
    if (res.status === 401) {
      const local = localStorage.getItem(LOCAL_KEY);
      return local ? JSON.parse(local) : [];
    }
    const data = await res.json();
    if (data.success && data.data) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data.data));
      return data.data;
    }
    return [];
  } catch {
    const local = localStorage.getItem(LOCAL_KEY);
    return local ? JSON.parse(local) : [];
  }
};

export function useWatchHistory() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: history = [], mutate, isLoading } = useSWR<WatchHistoryItem[]>(
    mounted ? HISTORY_KEY : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000,
    }
  );

  // Load local data instantly if cloud is loading and we are mounted
  const displayHistory = (history.length === 0 && isLoading && mounted) ? getLocalHistory() : history;

  const updateProgress = useCallback(async (item: Omit<WatchHistoryItem, 'id' | 'updatedAt'>) => {
    updateLocalHistory(item);

    const optimisticData = (prev: WatchHistoryItem[] = []) => {
      const existing = prev.findIndex(
        h => h.animeSlug === item.animeSlug && h.episode === item.episode
      );
      const updated = [...prev];
      if (existing >= 0) {
        updated[existing] = { ...updated[existing], ...item };
      } else {
        updated.unshift(item as WatchHistoryItem);
      }
      return updated.slice(0, 20);
    };

    await mutate(
      async (current) => {
        try {
          await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
        } catch {
          console.warn('[History] Cloud sync failed, local cache preserved');
        }
        return optimisticData(current);
      },
      {
        optimisticData: optimisticData(displayHistory),
        revalidate: false,
        rollbackOnError: false,
      }
    );
  }, [mutate, displayHistory]);

  const getProgress = useCallback((animeSlug: string, episode: number) => {
    return displayHistory.find(h => h.animeSlug === animeSlug && h.episode === episode);
  }, [displayHistory]);

  return { history: displayHistory, isLoading: isLoading || !mounted, updateProgress, getProgress };
}

function getLocalHistory(): WatchHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(LOCAL_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function updateLocalHistory(item: Omit<WatchHistoryItem, 'id' | 'updatedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalHistory();
    const existing = current.findIndex(
      h => h.animeSlug === item.animeSlug && h.episode === item.episode
    );
    if (existing >= 0) {
      current[existing] = { ...current[existing], ...item, updatedAt: new Date().toISOString() };
    } else {
      current.unshift({ ...item, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(LOCAL_KEY, JSON.stringify(current.slice(0, 20)));
  } catch {}
}