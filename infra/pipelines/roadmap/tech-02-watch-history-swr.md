# Q2: Watch History State Management — SWR + Optimistic Updates

## Arsitektur yang Direkomendasikan
┌─────────────────────────────────────────────┐
│           useWatchHistory (Custom Hook)      │
│                                              │
│  SWR (cloud data)  ←→  localStorage (cache) │
│         ↕                                    │
│  Optimistic Update (instant UI feedback)    │
└─────────────────────────────────────────────┘

## Implementation: hooks/useWatchHistory.ts
```typescript
// hooks/useWatchHistory.ts
import useSWR from 'swr';
import { useCallback } from 'react';

const HISTORY_KEY = '/api/history';
const LOCAL_KEY = 'anime_watch_history_v2';

// Type definitions
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

// Fetcher yang fallback ke localStorage kalau tidak ada session
const fetcher = async (url: string): Promise<WatchHistoryItem[]> => {
  try {
    const res = await fetch(url);
    if (res.status === 401) {
      // User belum login — baca dari localStorage
      const local = localStorage.getItem(LOCAL_KEY);
      return local ? JSON.parse(local) : [];
    }
    const data = await res.json();
    if (data.success) {
      // Sync cloud data ke localStorage sebagai cache
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data.data));
      return data.data;
    }
    return [];
  } catch {
    // Offline fallback
    const local = localStorage.getItem(LOCAL_KEY);
    return local ? JSON.parse(local) : [];
  }
};

export function useWatchHistory() {
  const { data: history = [], mutate, isLoading } = useSWR<WatchHistoryItem[]>(
    HISTORY_KEY,
    fetcher,
    {
      revalidateOnFocus: false,        // Jangan refetch tiap window focus
      revalidateOnReconnect: true,     // Refetch kalau reconnect internet
      dedupingInterval: 30_000,        // Dedup dalam 30 detik
      fallbackData: getLocalHistory(), // Instant render dari cache
    }
  );

  // Optimistic update — update UI dulu, baru sync ke server
  const updateProgress = useCallback(async (item: Omit<WatchHistoryItem, 'id' | 'updatedAt'>) => {
    // 1. Update localStorage INSTANT
    updateLocalHistory(item);

    // 2. Optimistic update SWR cache
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
      return updated.slice(0, 20); // Keep top 20
    };

    await mutate(
      async (current) => {
        // 3. Sync ke server di background
        try {
          await fetch('/api/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });
        } catch {
          // Gagal sync? OK, localStorage masih ada
          console.warn('[History] Cloud sync failed, local cache preserved');
        }
        return optimisticData(current);
      },
      {
        optimisticData,
        revalidate: false, // Jangan refetch setelah mutate
        rollbackOnError: false, // Jangan rollback — localStorage tetap valid
      }
    );
  }, [mutate]);

  // Get progress untuk specific episode
  const getProgress = useCallback((animeSlug: string, episode: number) => {
    return history.find(h => h.animeSlug === animeSlug && h.episode === episode);
  }, [history]);

  return { history, isLoading, updateProgress, getProgress };
}

// Helper functions
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
  } catch {
    // localStorage penuh atau disabled
  }
}
```

## Refactored components/ContinueWatching.tsx
```typescript
// components/ContinueWatching.tsx
"use client";

import { useWatchHistory } from "@/hooks/useWatchHistory";
import Link from "next/link";
import { PlayCircle, Clock } from "lucide-react";

export function ContinueWatching() {
  const { history, isLoading } = useWatchHistory();

  if (isLoading) {
    return (
      <section className="flex flex-col gap-6 w-full mt-4 mb-8">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-500 w-6 h-6" />
          <h2 className="text-2xl font-bold text-white/90">Melanjutkan Tontonan</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="shrink-0 w-[280px] aspect-video bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (history.length === 0) return null;

  const inProgress = history
    .filter(item => !item.completed && item.timestampSec > 0)
    .slice(0, 10);

  if (inProgress.length === 0) return null;

  return (
    <section className="flex flex-col gap-6 w-full mt-4 mb-8">
      <div className="flex items-center gap-2">
        <Clock className="text-blue-500 w-6 h-6" />
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white/90">
          Melanjutkan Tontonan
        </h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {inProgress.map((item, idx) => {
          const progressPct = item.durationSec > 0
            ? Math.min((item.timestampSec / item.durationSec) * 100, 100)
            : 0;

          return (
            <div key={`${item.animeSlug}-${item.episode}-${idx}`}
              className="snap-start shrink-0 w-[280px] sm:w-[320px]">
              <Link href={`/watch/${item.animeSlug}/${item.episode}`}
                className="group relative flex flex-col gap-3">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 group-hover:ring-blue-500/50 transition-all">
                  {item.animeCover && (
                    <img src={item.animeCover} alt={item.animeTitle}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                    <div className="h-full bg-blue-500 transition-all"
                      style={{ width: `${progressPct}%` }} />
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white line-clamp-1">{item.animeTitle}</span>
                      <span className="text-xs text-blue-400 font-medium">
                        Eps {item.episode} • {Math.floor(item.timestampSec / 60)}m tersisa
                      </span>
                    </div>
                    <div className="p-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-4 h-4 text-white" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

## Refactored components/Player.tsx (State Sync)
```typescript
// Player.tsx
import { useWatchHistory } from "@/hooks/useWatchHistory";

export function Player({ title, poster, sources, animeSlug, episodeNum }: PlayerProps) {
  const { updateProgress, getProgress } = useWatchHistory();
  
  // Load saved progress saat mount
  useEffect(() => {
    if (!animeSlug || !episodeNum) return;
    const saved = getProgress(animeSlug, episodeNum);
    if (saved?.timestampSec && videoRef.current) {
      videoRef.current.currentTime = saved.timestampSec;
    }
  }, [animeSlug, episodeNum, getProgress]);

  // Sync progress every 15 seconds
  useEffect(() => {
    if (!animeSlug || !episodeNum || duration <= 0) return;
    
    const interval = setInterval(() => {
      updateProgress({
        animeSlug,
        animeTitle: title.split(' - ')[0] || title,
        animeCover: poster,
        episode: episodeNum,
        episodeTitle: title,
        timestampSec: Math.floor(progress),
        durationSec: Math.floor(duration),
        completed: duration > 0 && (progress / duration) > 0.9,
      });
    }, 15_000);
    
    return () => clearInterval(interval);
  }, [progress, duration, animeSlug, episodeNum, title, poster, updateProgress]);

  // ... rest of player code
}
```
