// core/hooks/use-watch-history.ts — Watch history with local-first + cloud sync

import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";
import type { WatchHistoryItem } from "@/core/types/anime";

const CLOUD_KEY = "/api/history";
const LOCAL_KEY = "ani-history-v2";

function getLocal(): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocal(items: WatchHistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, 20)));
}

const fetcher = async (url: string): Promise<WatchHistoryItem[]> => {
  try {
    const res = await fetch(url);
    if (res.status === 401) return getLocal();
    const data = await res.json();
    if (data.success && data.data) {
      saveLocal(data.data);
      return data.data;
    }
    return getLocal();
  } catch {
    return getLocal();
  }
};

export function useWatchHistory() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: history = [], mutate, isLoading } = useSWR<WatchHistoryItem[]>(
    mounted ? CLOUD_KEY : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const display = history.length === 0 && isLoading && mounted ? getLocal() : history;

  const updateProgress = useCallback(
    async (item: Omit<WatchHistoryItem, "updatedAt">) => {
      // Optimistic local update first (instant feedback)
      const next = (prev: WatchHistoryItem[] = []) => {
        const idx = prev.findIndex((h) => h.animeSlug === item.animeSlug && h.episode === item.episode);
        const copy = [...prev];
        const enriched = { ...item, updatedAt: new Date().toISOString() };
        if (idx >= 0) copy[idx] = { ...copy[idx], ...enriched };
        else copy.unshift(enriched as WatchHistoryItem);
        return copy.slice(0, 20);
      };

      saveLocal(next(display));

      await mutate(
        async (current) => {
          try {
            await fetch("/api/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item),
            });
          } catch {}
          return next(current);
        },
        { optimisticData: next(display), revalidate: false, rollbackOnError: false }
      );
    },
    [mutate, display]
  );

  const getProgress = useCallback(
    (slug: string, ep: number) => display.find((h) => h.animeSlug === slug && h.episode === ep),
    [display]
  );

  return { history: display, isLoading: isLoading || !mounted, updateProgress, getProgress };
}
