"use client";

import { useEffect } from "react";

export function HistoryTracker({ id, epId, title, poster }: { id: string, epId: string, title: string, poster: string }) {
  useEffect(() => {
    try {
      const historyStr = localStorage.getItem("anime_watch_history");
      let history: any[] = historyStr ? JSON.parse(historyStr) : [];

      // Remove the exact same episode if it exists so we can bump it to the top
      history = history.filter(h => !(h.id === id && h.epId === epId));

      history.unshift({
        id,
        epId,
        title,
        poster,
        timestamp: Date.now()
      });

      // Keep only top 10 recent
      if (history.length > 10) {
        history = history.slice(0, 10);
      }

      localStorage.setItem("anime_watch_history", JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }, [id, epId, title, poster]);

  return null; // Silent component
}
