// core/stores/app-store.ts — Zustand store (replaces mega-context ThemeProvider)
// Split into slices: settings, watchlist, toast — each updates independently.

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ── Settings Slice ─────────────────────────────────────────────
interface Settings {
  autoPlayNext: boolean;
  skipIntro: boolean;
}

interface SettingsSlice {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, val: Settings[K]) => void;
}

export const useSettings = create<SettingsSlice>()(
  persist(
    (set) => ({
      settings: {
        autoPlayNext: true,
        skipIntro: false,
      },
      setSetting: (key, val) =>
        set((s) => ({ settings: { ...s.settings, [key]: val } })),
    }),
    { name: "ani-settings-v3" } // Bump version to clear old schema
  )
);

// ── Watchlist Slice ────────────────────────────────────────────
export interface WatchlistItem {
  id: string | number;
  title: string;
  img?: string;
  totalEps?: number;
  status: "watching" | "plan_to_watch" | "completed" | "dropped";
  progress: number;
  addedAt: number;
  updatedAt: number;
}

interface WatchlistSlice {
  items: WatchlistItem[];
  toggle: (anime: Omit<WatchlistItem, "status" | "progress" | "addedAt" | "updatedAt">, status?: WatchlistItem["status"]) => boolean;
  updateStatus: (id: string | number, status?: WatchlistItem["status"], progress?: number) => void;
  remove: (id: string | number) => void;
}

export const useWatchlist = create<WatchlistSlice>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (anime, status = "plan_to_watch") => {
        const exists = get().items.find((w) => w.id === anime.id);
        if (exists) {
          set((s) => ({ items: s.items.filter((w) => w.id !== anime.id) }));
          return false; // removed
        }
        set((s) => ({
          items: [{ ...anime, status, progress: 0, addedAt: Date.now(), updatedAt: Date.now() }, ...s.items],
        }));
        return true; // added
      },
      updateStatus: (id, status, progress) =>
        set((s) => ({
          items: s.items.map((w) =>
            w.id === id
              ? { ...w, ...(status && { status }), ...(progress !== undefined && { progress }), updatedAt: Date.now() }
              : w
          ),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((w) => w.id !== id) })),
    }),
    { name: "ani-watchlist-v2" }
  )
);

// ── Toast (transient, no persist) ──────────────────────────────
interface Toast {
  id: string;
  message: string;
  type: "info" | "success" | "error";
}

interface ToastSlice {
  toasts: Toast[];
  toast: (message: string, type?: Toast["type"], duration?: number) => void;
  dismiss: (id: string) => void;
}

export const useToast = create<ToastSlice>((set) => ({
  toasts: [],
  toast: (message, type = "info", duration = 3000) => {
    const id = Math.random().toString(36).slice(2, 9);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), duration);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));