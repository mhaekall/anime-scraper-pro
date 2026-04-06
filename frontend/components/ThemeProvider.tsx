"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Icons } from './Icons';

const generateId = () => Math.random().toString(36).substr(2, 9);

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

export const ACCENT_COLORS = [
  { id: 'blue', hex: '#0A84FF', name: 'Ocean Blue' },
  { id: 'purple', hex: '#BF5AF2', name: 'Neon Purple' },
  { id: 'pink', hex: '#FF375F', name: 'Sakura Pink' },
  { id: 'red', hex: '#FF453A', name: 'Crimson Red' },
  { id: 'orange', hex: '#FF9F0A', name: 'Sunset Orange' },
  { id: 'green', hex: '#30D158', name: 'Emerald Green' },
  { id: 'yellow', hex: '#FFD60A', name: 'Cyber Yellow' },
  { id: 'monochrome', hex: '#FFFFFF', name: 'Monochrome' },
];

const DEFAULT_SETTINGS = {
  videoQuality: 'Auto',
  subtitleLang: 'Indonesia',
  autoPlayNext: true,
  skipIntro: false,
  downloadWifiOnly: true,
  pushNotifications: true,
  appTheme: 'dark',
  accentColor: '#0A84FF', // Apple Blue Default
  dataSaver: false,
  incognitoMode: false,
};

type AppContextType = {
  settings: typeof DEFAULT_SETTINGS;
  updateSetting: (key: keyof typeof DEFAULT_SETTINGS, value: any) => void;
  toasts: any[];
  addToast: (message: string, type?: 'info' | 'success' | 'error', duration?: number) => void;
  removeToast: (id: string) => void;
  watchlist: any[];
  toggleWatchlist: (anime: any, status?: string) => void;
  updateWatchlistStatus: (id: number | string, status?: string, progress?: number, note?: string) => void;
  removeFromWatchlist: (id: number | string) => void;
  searchHistory: string[];
  addSearchHistory: (term: string) => void;
  clearSearchHistory: () => void;
};

const AppContext = createContext<AppContextType | null>(null);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useLocalStorage('ani_settings_v1', DEFAULT_SETTINGS);
  const [watchlist, setWatchlist] = useLocalStorage<any[]>('ani_watchlist_v1', []);
  const [searchHistory, setSearchHistory] = useLocalStorage<string[]>('ani_search_v1', []);
  const [toasts, setToasts] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info', duration = 3000) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateSetting = useCallback((key: keyof typeof DEFAULT_SETTINGS, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, [setSettings]);

  const toggleWatchlist = useCallback((anime: any, status = 'plan_to_watch') => {
    setWatchlist((prev) => {
      const exists = prev.find((w) => w.id === anime.id);
      if (exists) {
        addToast(`Dihapus dari Daftar Tontonan`, 'error');
        return prev.filter((w) => w.id !== anime.id);
      } else {
        addToast(`Ditambahkan ke Daftar Tontonan`, 'success');
        return [{ ...anime, status, progress: 0, addedAt: Date.now() }, ...prev];
      }
    });
  }, [setWatchlist, addToast]);

  const updateWatchlistStatus = useCallback((id: number | string, status?: string, progress?: number, note?: string) => {
    setWatchlist((prev) => prev.map((w) => {
      if (w.id === id) {
        return { 
          ...w, 
          status: status !== undefined ? status : w.status,
          progress: progress !== undefined ? progress : w.progress,
          note: note !== undefined ? note : w.note,
          updatedAt: Date.now()
        };
      }
      return w;
    }));
  }, [setWatchlist]);

  const removeFromWatchlist = useCallback((id: number | string) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
    addToast('Item dihapus secara permanen', 'info');
  }, [setWatchlist, addToast]);

  const addSearchHistory = useCallback((term: string) => {
    if (!term || term.trim() === '') return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((t) => t.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, 10);
    });
  }, [setSearchHistory]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    addToast('Riwayat pencarian dibersihkan', 'info');
  }, [setSearchHistory, addToast]);

  const value = {
    settings, updateSetting,
    toasts, addToast, removeToast,
    watchlist, toggleWatchlist, updateWatchlistStatus, removeFromWatchlist,
    searchHistory, addSearchHistory, clearSearchHistory
  };

  return (
    <AppContext.Provider value={value}>
      {!mounted ? (
        <div style={{ visibility: 'hidden' }}>{children}</div>
      ) : (
        <>
          <Toaster />
          {children}
        </>
      )}
    </AppContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useThemeContext must be used within ThemeProvider');
  return context;
};

// Internal Toaster Component
const Toaster = () => {
  const { toasts, removeToast } = useThemeContext();
  return (
    <div className="fixed top-safe pt-4 left-0 right-0 z-[999] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto max-w-md w-full bg-[#2C2C2E]/95 backdrop-blur-xl rounded-[16px] p-3 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-between animate-slide-down-toast">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'success' ? 'bg-[#30D158]/20 text-[#30D158]' : t.type === 'error' ? 'bg-[#FF453A]/20 text-[#FF453A]' : 'bg-[#0A84FF]/20 text-[#0A84FF]'}`}>
              {t.type === 'success' ? <Icons.Check /> : t.type === 'error' ? <Icons.Close /> : <Icons.Info />}
            </div>
            <p className="text-white text-[13px] font-medium leading-tight">{t.message}</p>
          </div>
          <button onClick={() => removeToast(t.id)} className="text-[#8E8E93] p-1 active:scale-90"><Icons.Close /></button>
        </div>
      ))}
    </div>
  );
};
