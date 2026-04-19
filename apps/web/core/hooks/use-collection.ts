// core/hooks/use-collection.ts — Cloud sync with FastAPI /api/v2/collection

import useSWR from "swr";
import { useCallback, useEffect, useState } from "react";
import { WatchlistItem } from "@/core/stores/app-store"; // Keep the interface from there for now

const API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/collection";
const LOCAL_KEY = "ani-collection-v3";

function getLocal(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveLocal(items: WatchlistItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

const fetcher = async (url: string, userId?: string): Promise<WatchlistItem[]> => {
  if (!userId) return getLocal();
  try {
    const res = await fetch(`${url}?user_id=${userId}`);
    const data = await res.json();
    
    const dataArray = Array.isArray(data) ? data : (data?.data || []);
    // Map backend response back to WatchlistItem frontend format
    const mapped = dataArray.map((h: any) => ({
      id: String(h.animeSlug || h.anilistId),
      title: h.cleanTitle || h.nativeTitle || h.animeTitle || `Anime #${h.animeSlug}`,
      img: h.coverImage || h.animeCover,
      totalEps: h.totalEpisodes || 0,
      status: h.status, // watching, plan_to_watch, completed, dropped
      progress: h.progress || 0,
      addedAt: new Date(h.updatedAt).getTime(),
      updatedAt: new Date(h.updatedAt).getTime()
    }));

    if (mapped.length > 0) saveLocal(mapped);
    return mapped;
  } catch (e) {
    console.error("[Collection Sync] Fetch error:", e);
    return getLocal();
  }
};

export function useCollection(userId?: string) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: collection = [], mutate, isLoading } = useSWR<WatchlistItem[]>(
    mounted && userId ? [API_URL, userId] : null,
    ([url, uid]: [string, string]) => fetcher(url, uid),
    { revalidateOnFocus: false, dedupingInterval: 10_000, keepPreviousData: true }
  );

  const display = collection.length === 0 && isLoading && mounted ? getLocal() : collection;

  const updateStatus = useCallback(
    async (item: Omit<WatchlistItem, "addedAt" | "updatedAt">) => {
      if (!userId) {
        // Fallback to local only if not logged in
        const nextLocal = (prev: WatchlistItem[] = []) => {
          const idx = prev.findIndex((h) => String(h.id) === String(item.id));
          const copy = [...prev];
          const enriched = { ...item, addedAt: Date.now(), updatedAt: Date.now() };
          if (idx >= 0) copy[idx] = { ...copy[idx], ...enriched };
          else copy.unshift(enriched as WatchlistItem);
          return copy;
        };
        saveLocal(nextLocal(display));
        return;
      }

      // Optimistic cloud update
      const next = (prev: WatchlistItem[] = []) => {
        const idx = prev.findIndex((h) => String(h.id) === String(item.id));
        const copy = [...prev];
        const enriched = { ...item, addedAt: Date.now(), updatedAt: Date.now() };
        if (idx >= 0) copy[idx] = { ...copy[idx], ...enriched };
        else copy.unshift(enriched as WatchlistItem);
        return copy;
      };

      await mutate(
        async (current) => {
          try {
            await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: userId,
                anilistId: String(item.id),
                status: item.status,
                progress: item.progress
              }),
            });
            return next(current);
          } catch (e) {
            console.error("Failed to update collection:", e);
            throw e;
          }
        },
        { optimisticData: next(display), rollbackOnError: true, revalidate: false }
      );
    },
    [userId, mutate, display]
  );

  const remove = useCallback(
    async (id: string | number) => {
      if (!userId) {
        const nextLocal = display.filter((h) => String(h.id) !== String(id));
        saveLocal(nextLocal);
        return;
      }

      const next = (prev: WatchlistItem[] = []) => prev.filter((h) => String(h.id) !== String(id));

      await mutate(
        async (current) => {
          try {
            await fetch(`${API_URL}?user_id=${userId}&anilistId=${id}`, {
              method: "DELETE"
            });
            return next(current);
          } catch (e) {
            console.error("Failed to remove from collection:", e);
            throw e;
          }
        },
        { optimisticData: next(display), rollbackOnError: true, revalidate: false }
      );
    },
    [userId, mutate, display]
  );

  const toggle = useCallback(
    (anime: Omit<WatchlistItem, "status" | "progress" | "addedAt" | "updatedAt">, defaultStatus: WatchlistItem["status"] = "plan_to_watch") => {
      const existing = display.find((w) => String(w.id) === String(anime.id));
      if (existing) {
        remove(anime.id);
        return false;
      } else {
        updateStatus({ ...anime, status: defaultStatus, progress: 0 });
        return true;
      }
    },
    [display, remove, updateStatus]
  );

  return { items: display, toggle, updateStatus, remove, isLoading };
}
