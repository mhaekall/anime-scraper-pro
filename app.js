import React, { 
  useState, useEffect, useRef, useCallback, createContext, useContext, useMemo, useReducer 
} from 'react';

// =====================================================================
// 1. UTILITIES & HELPER FUNCTIONS
// =====================================================================

const generateId = () => Math.random().toString(36).substr(2, 9);
const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

// =====================================================================
// 2. CUSTOM HOOKS
// =====================================================================

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
}

function useIntersectionObserver(ref, options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, options);
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);
  return isIntersecting;
}

// =====================================================================
// 3. GLOBAL STATE MANAGEMENT (CONTEXT API)
// =====================================================================

const AppContext = createContext(null);

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

const ACCENT_COLORS = [
  { id: 'blue', hex: '#0A84FF', name: 'Ocean Blue' },
  { id: 'purple', hex: '#BF5AF2', name: 'Neon Purple' },
  { id: 'pink', hex: '#FF375F', name: 'Sakura Pink' },
  { id: 'red', hex: '#FF453A', name: 'Crimson Red' },
  { id: 'orange', hex: '#FF9F0A', name: 'Sunset Orange' },
  { id: 'green', hex: '#30D158', name: 'Emerald Green' },
  { id: 'yellow', hex: '#FFD60A', name: 'Cyber Yellow' },
  { id: 'monochrome', hex: '#FFFFFF', name: 'Monochrome' },
];

export const AppProvider = ({ children }) => {
  const [settings, setSettings] = useLocalStorage('ani_settings_v1', DEFAULT_SETTINGS);
  const [watchlist, setWatchlist] = useLocalStorage('ani_watchlist_v1', []);
  const [watchHistory, setWatchHistory] = useLocalStorage('ani_history_v1', []);
  const [searchHistory, setSearchHistory] = useLocalStorage('ani_search_v1', []);
  const [notifications, setNotifications] = useLocalStorage('ani_notifs_v1', []);
  const [toasts, setToasts] = useState([]);

  // Toast System
  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update Settings Partial
  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, [setSettings]);

  // Watchlist Actions
  const toggleWatchlist = useCallback((anime, status = 'plan_to_watch') => {
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

  const updateWatchlistStatus = useCallback((id, status, progress, note) => {
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

  const removeFromWatchlist = useCallback((id) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
    addToast('Item dihapus secara permanen', 'info');
  }, [setWatchlist, addToast]);

  // Search History Actions
  const addSearchHistory = useCallback((term) => {
    if (!term || term.trim() === '') return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((t) => t.toLowerCase() !== term.toLowerCase());
      return [term, ...filtered].slice(0, 10); // Keep max 10
    });
  }, [setSearchHistory]);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    addToast('Riwayat pencarian dibersihkan', 'info');
  }, [setSearchHistory, addToast]);

  // History Actions (Video Player)
  const saveWatchProgress = useCallback((anime, episodeObj, timeProgress, isCompleted) => {
    if (settings.incognitoMode) return;
    setWatchHistory((prev) => {
      const filtered = prev.filter((h) => h.animeId !== anime.id);
      return [{
        animeId: anime.id,
        animeTitle: anime.title?.english || anime.title?.romaji,
        coverImage: anime.coverImage?.extraLarge || anime.coverImage?.large,
        episodeId: episodeObj.id,
        episodeNumber: episodeObj.number,
        episodeTitle: episodeObj.title,
        timeProgress,
        isCompleted,
        timestamp: Date.now()
      }, ...filtered].slice(0, 50); // Keep last 50
    });
  }, [setWatchHistory, settings.incognitoMode]);

  const value = {
    settings, updateSetting, ACCENT_COLORS,
    watchlist, toggleWatchlist, updateWatchlistStatus, removeFromWatchlist,
    watchHistory, saveWatchProgress,
    searchHistory, addSearchHistory, clearSearchHistory,
    notifications, setNotifications,
    toasts, addToast, removeToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

// =====================================================================
// 4. GRAPHQL API CLIENT (AniList Enterprise)
// ==========================================
const ANILIST_URL = 'https://graphql.anilist.co';

const QUERIES = {
  HOME_DATA: `
    query ($season: MediaSeason, $seasonYear: Int) {
      trending: Page(page: 1, perPage: 15) {
        media(type: ANIME, sort: TRENDING_DESC) { ...MediaFragment }
      }
      season: Page(page: 1, perPage: 12) {
        media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) { ...MediaFragment }
      }
      popular: Page(page: 1, perPage: 12) {
        media(type: ANIME, sort: POPULARITY_DESC) { ...MediaFragment }
      }
      upcoming: Page(page: 1, perPage: 12) {
        media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) { ...MediaFragment }
      }
    }
    fragment MediaFragment on Media {
      id title { romaji english native } coverImage { extraLarge large color } bannerImage 
      description episodes averageScore genres status seasonYear season format duration
      nextAiringEpisode { airingAt timeUntilAiring episode }
    }
  `,
  SEARCH_ADVANCED: `
    query ($search: String, $page: Int, $perPage: Int, $genres: [String], $year: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(search: $search, type: ANIME, genre_in: $genres, seasonYear: $year, sort: $sort) {
          id title { romaji english } coverImage { extraLarge large color } 
          episodes averageScore genres status format seasonYear
        }
      }
    }
  `,
  ANIME_DETAILS: `
    query ($id: Int) {
      Media(id: $id) {
        id title { romaji english native } coverImage { extraLarge large color } bannerImage 
        description episodes averageScore meanScore popularity genres status seasonYear season 
        format duration source hashtag trailer { id site thumbnail }
        characters(sort: ROLE, perPage: 6) {
          edges { role node { id name { full } image { large } } voiceActors(language: JAPANESE) { id name { full } image { large } } }
        }
        relations {
          edges { relationType node { id type title { romaji } coverImage { large } status } }
        }
        recommendations(sort: RATING_DESC, perPage: 6) {
          nodes { mediaRecommendation { id title { romaji english } coverImage { large } averageScore } }
        }
      }
    }
  `
};

const fetchAniList = async (query, variables = {}) => {
  try {
    const response = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    const json = await response.json();
    if (json.errors) throw new Error(json.errors[0].message);
    return json.data;
  } catch (error) {
    console.error("AniList API Error:", error);
    return null;
  }
};

// =====================================================================
// 5. SVG ICON LIBRARY (Enterprise Grade, Optimized)
// =====================================================================
const Icons = {
  // Navigation
  Home: ({ a }) => <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] transition-all" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth={a?0:1.5}><path d={a?"M11.1 2.302a1.5 1.5 0 011.8 0l8.6 6.45c.3.225.5.584.5.973V20.5a1.5 1.5 0 01-1.5 1.5h-5.5a1.5 1.5 0 01-1.5-1.5v-4.5a.5.5 0 00-.5-.5h-2a.5.5 0 00-.5.5v4.5a1.5 1.5 0 01-1.5 1.5H3.5A1.5 1.5 0 012 20.5V9.725c0-.389.2-.748.5-.973l8.6-6.45z":"M3 10.5L12 4l9 6.5V20a1 1 0 01-1 1h-5v-5H9v5H4a1 1 0 01-1-1z"}/></svg>,
  Explore: ({ a }) => <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] transition-all" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth={a?0:1.5}><circle cx="12" cy="12" r={a?"10":"9"}/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" fill={a?"#1C1C1E":"none"} stroke={a?"none":"currentColor"}/></svg>,
  Bookmark: ({ a }) => <svg viewBox="0 0 24 24" className="w-[20px] h-[22px] transition-all" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth={a?0:1.5}><path d="M5 4.5A2.5 2.5 0 017.5 2h9A2.5 2.5 0 0119 4.5v16.326a1 1 0 01-1.547.837L12 18.09l-5.453 3.573A1 1 0 015 20.826V4.5z"/></svg>,
  Profile: ({ a }) => <svg viewBox="0 0 24 24" className="w-[22px] h-[22px] transition-all" fill={a?"currentColor":"none"} stroke="currentColor" strokeWidth={a?0:1.5}><path d={a?"M12 13a5 5 0 100-10 5 5 0 000 10zm-7.693 7.828A8.001 8.001 0 0112 15a8.001 8.001 0 017.693 5.828.75.75 0 01-.722.922H5.029a.75.75 0 01-.722-.922z":"M12 12a4 4 0 100-8 4 4 0 000 8zm-7 8c0-3.5 3-6.5 7-6.5s7 3 7 6.5"}/></svg>,
  
  // Actions
  Search: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>,
  Bell: ({ dot }) => <div className="relative"><svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V5a1 1 0 10-2 0v.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>{dot && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#FF453A] rounded-full border-2 border-black"/>}</div>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>,
  Close: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Back: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>,
  ChevronRight: () => <svg className="w-5 h-5 text-[#8E8E93]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>,
  Check: ({ cls = "w-5 h-5" }) => <svg className={cls} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Share: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>,
  Filter: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>,
  Edit: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>,
  MoreVertical: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>,
  
  // Media Controls
  Play: ({ cls = "w-6 h-6" }) => <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>,
  Pause: ({ cls = "w-6 h-6" }) => <svg className={cls} fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  SkipForward: () => <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zM16 6v12h2V6h-2z"/></svg>,
  SkipBack: () => <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zM16 6v12h2V6h-2z"/></svg>,
  Maximize: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>,
  VolumeUp: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/></svg>,
  VolumeMute: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>,
  Subtitles: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" ry="2"/><line x1="7" y1="15" x2="11" y2="15"/><line x1="13" y1="15" x2="17" y2="15"/><line x1="7" y1="11" x2="17" y2="11"/></svg>,
  
  // Status / Informational
  Star: ({ filled, cls = "w-4 h-4" }) => <svg className={cls} fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  StarHalf: () => <svg className="w-4 h-4 text-[#FFD60A]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2v15.77l6.18 3.25-1.18-6.88L22 9.27l-6.91-1.01L12 2z"/></svg>,
  Clock: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Fire: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2c0 0-4 4-4 10a4 4 0 108 0c0-6-4-10-4-10z"/><path d="M12 10c-1 1-1 3-1 3"/></svg>,
  TrendingUp: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Info: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  ImageOff: () => <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/><line x1="3" y1="3" x2="21" y2="21"/></svg>
};

// =====================================================================
// 6. UI PRIMITIVES & COMPONENTS
// =====================================================================

const Toaster = () => {
  const { toasts, removeToast, settings } = useAppContext();
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

const Switch = ({ checked, onChange, disabled }) => {
  const { settings } = useAppContext();
  return (
    <button 
      disabled={disabled}
      onClick={() => onChange(!checked)} 
      className={`w-12 h-7 rounded-full relative transition-colors duration-300 ease-in-out focus:outline-none ${checked ? 'bg-[var(--accent)]' : 'bg-[#3A3A3C]'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{ '--accent': settings.accentColor }}
    >
      <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
};

const Skeletons = {
  Banner: () => (
    <div className="w-full h-[400px] md:h-[500px] rounded-[24px] bg-[#1C1C1E] animate-pulse flex flex-col justify-end p-6 border border-white/5">
      <div className="w-1/4 h-4 bg-[#2C2C2E] rounded-full mb-4" />
      <div className="w-3/4 h-10 bg-[#2C2C2E] rounded-[12px] mb-6" />
      <div className="flex gap-3">
        <div className="w-32 h-12 bg-[#2C2C2E] rounded-[16px]" />
        <div className="w-12 h-12 bg-[#2C2C2E] rounded-[16px]" />
      </div>
    </div>
  ),
  Card: () => (
    <div className="w-full aspect-[2/3] bg-[#1C1C1E] rounded-[16px] animate-pulse relative border border-white/5">
      <div className="absolute bottom-3 left-3 right-3 space-y-2">
        <div className="h-3 bg-[#2C2C2E] rounded-full w-full" />
        <div className="h-2 bg-[#2C2C2E] rounded-full w-2/3" />
      </div>
    </div>
  ),
  Row: ({ count = 6 }) => (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4 px-5">
      {Array.from({ length: count }).map((_, i) => <Skeletons.Card key={i} />)}
    </div>
  ),
  List: () => (
    <div className="flex gap-3 mb-3">
      <div className="w-20 h-28 bg-[#1C1C1E] rounded-[12px] animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2 py-2">
        <div className="h-4 bg-[#1C1C1E] rounded-full w-3/4 animate-pulse" />
        <div className="h-3 bg-[#1C1C1E] rounded-full w-1/4 animate-pulse" />
        <div className="h-3 bg-[#1C1C1E] rounded-full w-1/2 animate-pulse mt-4" />
      </div>
    </div>
  )
};

// =====================================================================
// 7. COMPLEX ANIMATIONS (Dust Delete Effect)
// =====================================================================
const DustDeleteCard = ({ children, isDeleting, onDeleted }) => {
  const [particles, setParticles] = useState([]);
  const cardRef = useRef(null);

  useEffect(() => {
    if (isDeleting && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const newParticles = Array.from({ length: 25 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 30 + Math.random() * 80;
        return {
          id: i,
          x: rect.width / 2, y: rect.height / 2,
          tx: `${Math.cos(angle) * velocity}px`,
          ty: `${Math.sin(angle) * velocity}px`,
          color: ['#FF453A', '#FF9F0A', '#E5E5EA', '#8E8E93'][Math.floor(Math.random() * 4)],
          size: Math.random() * 4 + 2,
          delay: Math.random() * 0.15
        };
      });
      setParticles(newParticles);
      const timer = setTimeout(() => onDeleted(), 700);
      return () => clearTimeout(timer);
    }
  }, [isDeleting, onDeleted]);

  return (
    <div className="relative w-full">
      {isDeleting && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {particles.map(p => (
            <div key={p.id} className="absolute rounded-full"
              style={{ 
                width: p.size, height: p.size, left: p.x, top: p.y, backgroundColor: p.color, 
                '--tx': p.tx, '--ty': p.ty, animation: `dustFly 0.6s cubic-bezier(0.2, 1, 0.3, 1) ${p.delay}s forwards` 
              }}
            />
          ))}
        </div>
      )}
      <div ref={cardRef} className={`transition-all duration-400 ease-in-out ${isDeleting ? 'scale-90 opacity-0 blur-sm pointer-events-none' : 'opacity-100 scale-100 blur-none'}`}>
        {children}
      </div>
    </div>
  );
};

// =====================================================================
// 8. SHARED COMPONENTS (AnimeCard, Rows)
// =====================================================================

const AnimeCard = ({ anime, onClick, showRank = false, rankIndex = 0 }) => {
  const { settings } = useAppContext();
  const c = anime.coverImage?.color || settings.accentColor;
  const title = anime.title?.english || anime.title?.romaji || 'Unknown Anime';
  const imgUrl = anime.coverImage?.extraLarge || anime.coverImage?.large;

  // Render Stars
  const renderStars = (score) => {
    if (!score) return null;
    const s = score / 20; // 0-100 to 0-5
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(s)) stars.push(<Icons.Star key={i} filled cls="w-2.5 h-2.5 text-[#FFD60A]" />);
      else if (i === Math.ceil(s) && s % 1 !== 0) stars.push(<Icons.StarHalf key={i} />);
      else stars.push(<Icons.Star key={i} cls="w-2.5 h-2.5 text-white/30" />);
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  return (
    <div onClick={() => onClick(anime)} className="group cursor-pointer flex flex-col h-full w-full">
      <div className="w-full aspect-[2/3] rounded-[16px] relative overflow-hidden mb-2 border border-white/5 bg-[#1C1C1E] transition-all duration-300 group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:-translate-y-1">
        {imgUrl ? (
          <img src={imgUrl} alt={title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#2C2C2E]"><Icons.ImageOff /></div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Dynamic Inner Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: `inset 0 -40px 60px -20px ${c}90` }} />
        
        {showRank ? (
          <div className="absolute top-0 left-0 w-8 h-10 bg-black/60 backdrop-blur-md rounded-br-[12px] flex items-center justify-center font-black text-[16px] text-white border-r border-b border-white/10 z-10">
            {rankIndex}
          </div>
        ) : null}

        {/* Status / Format Badge */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
          {anime.format && <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider rounded border border-white/10">{anime.format}</span>}
          {anime.status === 'RELEASING' && <span className="px-1.5 py-0.5 bg-[#FF453A]/90 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider rounded shadow-[0_0_10px_rgba(255,69,58,0.5)]">ON AIR</span>}
        </div>

        {/* Bottom Info inside Card */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-col gap-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          {renderStars(anime.averageScore)}
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <span className="text-white/80 text-[10px] font-medium">{anime.episodes ? `${anime.episodes} Eps` : 'Ongoing'}</span>
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"><Icons.Play cls="w-3 h-3 ml-0.5" /></div>
          </div>
        </div>
      </div>
      <h3 className="text-[#F2F2F7] font-semibold text-[13px] line-clamp-2 leading-[1.3] px-1 transition-colors duration-300 group-hover:text-white">{title}</h3>
      <p className="text-[#8E8E93] text-[11px] px-1 mt-0.5 line-clamp-1">{anime.genres?.slice(0, 2).join(' • ')}</p>
    </div>
  );
};

const ContentRow = ({ title, data, loading, onAnimeClick, showRank = false }) => {
  if (!loading && (!data || data.length === 0)) return null;

  return (
    <div className="mb-8 md:mb-10">
      <div className="flex items-center justify-between mb-4 px-5 md:px-8">
        <h2 className="text-[20px] md:text-[24px] font-black text-white tracking-tight">{title}</h2>
        {!loading && <button className="text-[var(--accent)] text-[13px] md:text-[14px] font-bold active:opacity-70 transition-opacity" style={{ '--accent': useAppContext().settings.accentColor }}>Lihat Semua <Icons.ChevronRight /></button>}
      </div>
      
      {loading ? (
        <Skeletons.Row count={6} />
      ) : (
        <div className="flex gap-3 md:gap-5 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar px-5 md:px-8" onTouchStart={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
          {data.map((anime, idx) => (
            <div key={anime.id} className="snap-start flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]">
              <AnimeCard anime={anime} onClick={onAnimeClick} showRank={showRank} rankIndex={idx + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =====================================================================
// 9. OVERLAYS & MODALS
// =====================================================================

const BottomSheet = ({ isOpen, onClose, children, title, fullHeight = false }) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      // Small delay to allow DOM to render before adding visible class for transition
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 400); // match transition duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end md:justify-center md:items-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-400 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      {/* Sheet / Dialog */}
      <div 
        className={`relative w-full md:w-[600px] lg:w-[800px] bg-[#121212] md:rounded-[24px] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-full md:translate-y-10 md:scale-95'} ${fullHeight ? 'h-[95vh] md:h-[85vh]' : 'max-h-[92vh] md:max-h-[85vh]'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Grabber for mobile */}
        <div className="w-full flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 bg-[#3A3A3C] rounded-full" />
        </div>
        
        {/* Optional Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pb-4 pt-2 md:pt-6 border-b border-white/5">
            <h2 className="text-[20px] md:text-[24px] font-black text-white">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 bg-[#2C2C2E] rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors active:scale-90"><Icons.Close /></button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// Anime Detail Modal
// ---------------------------------------------------------
const AnimeDetailModal = ({ animeId, onClose, onPlay }) => {
  const { settings, watchlist, toggleWatchlist } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!animeId) return;
    const loadDetails = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetchAniList(QUERIES.ANIME_DETAILS, { id: animeId });
        if (res && res.Media) setData(res.Media);
        else throw new Error("Data not found");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [animeId]);

  if (loading) return (
    <BottomSheet isOpen={true} onClose={onClose} fullHeight>
      <div className="p-6 h-full flex flex-col justify-end bg-[#1C1C1E] animate-pulse">
        <div className="w-1/3 h-4 bg-[#2C2C2E] rounded mb-4" />
        <div className="w-3/4 h-10 bg-[#2C2C2E] rounded mb-6" />
      </div>
    </BottomSheet>
  );

  if (error || !data) return (
    <BottomSheet isOpen={true} onClose={onClose} title="Error">
      <div className="p-10 flex flex-col items-center justify-center text-center">
        <Icons.Info />
        <p className="text-white font-bold mt-4 mb-2">Gagal Memuat Data</p>
        <p className="text-[#8E8E93] text-[14px]">{error || 'Anime tidak ditemukan'}</p>
      </div>
    </BottomSheet>
  );

  const isSaved = !!watchlist.find(w => w.id === data.id);
  const c = data.coverImage?.color || settings.accentColor;
  const title = data.title?.english || data.title?.romaji;
  const cleanDesc = data.description?.replace(/<br><br>/g, '\n').replace(/<[^>]*>?/gm, '') || 'Sinopsis tidak tersedia.';

  return (
    <BottomSheet isOpen={true} onClose={onClose} fullHeight>
      {/* Hero Header */}
      <div className="w-full h-[250px] md:h-[350px] relative bg-[#1C1C1E] flex-shrink-0">
        <img src={data.bannerImage || data.coverImage?.extraLarge} className="w-full h-full object-cover" alt="banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/60 to-transparent" />
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 100%, ${c}, transparent 60%)` }} />
        <button onClick={onClose} className="absolute top-4 right-4 md:hidden w-9 h-9 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 active:scale-90 z-20"><Icons.Close /></button>
      </div>

      <div className="px-5 md:px-10 pb-10 -mt-16 md:-mt-24 relative z-10 max-w-5xl mx-auto">
        {/* Title & Cover Row */}
        <div className="flex flex-col md:flex-row gap-5 md:gap-8 mb-6">
          <div className="w-[110px] md:w-[160px] aspect-[2/3] rounded-[16px] md:rounded-[20px] shadow-2xl border border-white/10 overflow-hidden flex-shrink-0 bg-[#1C1C1E]">
            <img src={data.coverImage?.extraLarge} alt="cover" className="w-full h-full object-cover" />
          </div>
          <div className="pt-2 md:pt-10 flex-1 min-w-0">
            <h1 className="text-[26px] md:text-[36px] font-black text-white leading-[1.1] mb-2 md:mb-4">{title}</h1>
            {data.title?.native && <p className="text-[#8E8E93] text-[14px] mb-3">{data.title.native}</p>}
            
            <div className="flex items-center gap-3 text-[12px] md:text-[14px] font-semibold flex-wrap mb-4">
              {data.averageScore && <span className="text-[#30D158] flex items-center gap-1"><Icons.Star filled cls="w-4 h-4" /> {data.averageScore}%</span>}
              <span className="text-[#48484A]">•</span>
              <span className="text-[#E5E5EA]">{data.format || 'TV'}</span>
              <span className="text-[#48484A]">•</span>
              <span className="text-[#E5E5EA]">{data.seasonYear || 'TBA'}</span>
              <span className="text-[#48484A]">•</span>
              <span className="text-[#E5E5EA]">{data.episodes ? `${data.episodes} Eps` : 'Ongoing'}</span>
              {data.duration && <><span className="text-[#48484A]">•</span><span className="text-[#E5E5EA]">{data.duration}m</span></>}
              <span className="px-1.5 py-0.5 border border-[#48484A] rounded text-[#8E8E93] ml-1">HD</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <button onClick={() => { onClose(); onPlay(data); }} className="flex-1 md:flex-none md:px-12 py-3.5 rounded-[16px] text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform" style={{ backgroundColor: c }}>
                <Icons.Play cls="w-5 h-5" /> Putar
              </button>
              <button onClick={() => toggleWatchlist(data)} className={`w-14 md:w-auto md:px-6 py-3.5 rounded-[16px] flex items-center justify-center gap-2 transition-all active:scale-95 border ${isSaved ? 'bg-white/15 border-white/30 text-white' : 'bg-[#1C1C1E] border-white/10 text-[#8E8E93]'}`}>
                <Icons.Bookmark a={isSaved} /> <span className="hidden md:inline font-bold">{isSaved ? 'Tersimpan' : 'Simpan'}</span>
              </button>
              <button className="w-14 py-3.5 rounded-[16px] bg-[#1C1C1E] flex items-center justify-center border border-white/10 active:scale-95 text-[#8E8E93] hover:text-white transition-colors"><Icons.Share /></button>
            </div>
          </div>
        </div>

        {/* Tabs inside Detail */}
        <div className="flex gap-6 border-b border-white/10 mb-6">
          {[['overview', 'Ringkasan'], ['characters', 'Karakter'], ['relations', 'Terkait']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`pb-3 text-[15px] font-bold border-b-2 transition-colors ${activeTab === id ? 'text-white border-white' : 'text-[#8E8E93] border-transparent hover:text-[#D1D1D6]'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-fade-in min-h-[300px]">
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8">
              <div>
                <p className="text-[#E5E5EA] text-[14px] md:text-[15px] leading-relaxed whitespace-pre-line">{cleanDesc}</p>
              </div>
              <div>
                <h3 className="text-white font-bold mb-3">Genre</h3>
                <div className="flex flex-wrap gap-2">
                  {data.genres?.map(g => <span key={g} className="px-4 py-1.5 bg-[#1C1C1E] text-[#D1D1D6] text-[13px] font-medium rounded-full border border-white/5">{g}</span>)}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5"><p className="text-[#8E8E93] text-[11px] uppercase tracking-wider mb-1">Status</p><p className="text-white font-bold">{data.status === 'FINISHED' ? 'Selesai' : data.status === 'RELEASING' ? 'Tayang' : 'TBA'}</p></div>
                <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5"><p className="text-[#8E8E93] text-[11px] uppercase tracking-wider mb-1">Sumber</p><p className="text-white font-bold capitalize">{data.source?.replace(/_/g, ' ').toLowerCase() || '-'}</p></div>
                <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5"><p className="text-[#8E8E93] text-[11px] uppercase tracking-wider mb-1">Musim</p><p className="text-white font-bold capitalize">{data.season ? `${data.season.toLowerCase()} ${data.seasonYear}` : '-'}</p></div>
                <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5"><p className="text-[#8E8E93] text-[11px] uppercase tracking-wider mb-1">Hashtag</p><p className="text-[#0A84FF] font-bold line-clamp-1">{data.hashtag || '-'}</p></div>
              </div>
            </div>
          )}

          {activeTab === 'characters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.characters?.edges?.map((edge, i) => (
                <div key={i} className="flex justify-between items-center bg-[#1C1C1E] rounded-[16px] p-3 border border-white/5">
                  <div className="flex items-center gap-3">
                    <img src={edge.node.image?.large} alt={edge.node.name.full} className="w-12 h-12 rounded-full object-cover bg-[#2C2C2E]" />
                    <div><p className="text-white font-bold text-[13px]">{edge.node.name.full}</p><p className="text-[#8E8E93] text-[11px] capitalize">{edge.role.toLowerCase()}</p></div>
                  </div>
                  {edge.voiceActors?.length > 0 && (
                    <div className="flex items-center gap-3 text-right">
                      <div><p className="text-white font-bold text-[13px]">{edge.voiceActors[0].name.full}</p><p className="text-[#8E8E93] text-[11px]">Japanese</p></div>
                      <img src={edge.voiceActors[0].image?.large} alt={edge.voiceActors[0].name.full} className="w-12 h-12 rounded-full object-cover bg-[#2C2C2E]" />
                    </div>
                  )}
                </div>
              ))}
              {data.characters?.edges?.length === 0 && <p className="text-[#8E8E93]">Tidak ada data karakter.</p>}
            </div>
          )}

          {activeTab === 'relations' && (
            <div className="space-y-4">
              {data.relations?.edges?.filter(e => e.node.type === 'ANIME').map((edge, i) => (
                <div key={i} onClick={() => { onClose(); /* Would trigger new fetch here */ }} className="flex gap-4 bg-[#1C1C1E] rounded-[16px] p-3 border border-white/5 cursor-pointer hover:bg-[#2C2C2E] transition-colors">
                  <div className="w-16 aspect-[2/3] rounded-[8px] overflow-hidden bg-[#2C2C2E] flex-shrink-0"><img src={edge.node.coverImage?.large} className="w-full h-full object-cover" alt="" /></div>
                  <div className="flex-1 py-1">
                    <p className="text-[#0A84FF] text-[10px] font-black uppercase tracking-wider mb-1">{edge.relationType.replace(/_/g, ' ')}</p>
                    <p className="text-white font-bold text-[14px] line-clamp-2">{edge.node.title?.romaji}</p>
                    <p className="text-[#8E8E93] text-[12px] mt-1 capitalize">{edge.node.status.replace(/_/g, ' ').toLowerCase()}</p>
                  </div>
                </div>
              ))}
              {data.relations?.edges?.filter(e => e.node.type === 'ANIME').length === 0 && <p className="text-[#8E8E93]">Tidak ada prekuel/sekuel.</p>}
            </div>
          )}
        </div>
      </div>
    </BottomSheet>
  );
};

// ---------------------------------------------------------
// Video Player Modal (Advanced)
// ---------------------------------------------------------
const ProgressBar = ({ progress, duration, color, onSeek }) => {
  const barRef = useRef(null);
  
  const handleInteract = (e) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const pct = clamp(x / rect.width, 0, 1);
    onSeek(pct);
  };

  return (
    <div className="flex items-center gap-3 w-full px-5 py-2">
      <span className="text-white font-medium text-[12px] w-12 text-right tabular-nums">{formatTime(progress)}</span>
      <div 
        ref={barRef}
        className="flex-1 h-1.5 md:h-2 bg-white/30 rounded-full relative cursor-pointer group"
        onMouseDown={handleInteract}
        onTouchStart={handleInteract}
      >
        {/* Buffer Bar (Fake) */}
        <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full transition-all" style={{ width: `${Math.min((progress/duration)*100 + 10, 100)}%` }} />
        {/* Progress Bar */}
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-200" style={{ width: `${(progress/duration)*100}%`, backgroundColor: color }} />
        {/* Thumb */}
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] opacity-0 group-hover:opacity-100 transition-opacity" style={{ left: `calc(${(progress/duration)*100}% - 8px)` }} />
      </div>
      <span className="text-[#E5E5EA] font-medium text-[12px] w-12 tabular-nums">{formatTime(duration)}</span>
    </div>
  );
};

const VideoPlayerModal = ({ anime, onClose }) => {
  const { settings, saveWatchProgress, updateWatchlistStatus, watchlist, addToast } = useAppContext();
  const c = anime.coverImage?.color || settings.accentColor;
  const title = anime.title?.english || anime.title?.romaji;
  
  const [playing, setPlaying] = useState(settings.autoPlayNext);
  const [showControls, setShowControls] = useState(true);
  const [activeTab, setActiveTab] = useState('episodes');
  const [currentEpIdx, setCurrentEpIdx] = useState(0);
  
  // Fake Player State
  const duration = 1425; // 23m 45s
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(80);
  const [showMuted, setShowMuted] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Sync to history periodically
  useEffect(() => {
    let t;
    if (playing) {
      t = setInterval(() => {
        setProgress(p => {
          const np = Math.min(p + speed, duration);
          if (np >= duration) {
            setPlaying(false);
            if (settings.autoPlayNext && currentEpIdx < MOCK_EPISODES.length - 1) {
              setCurrentEpIdx(idx => idx + 1);
              return 0; // reset for next ep
            }
          }
          return np;
        });
      }, 1000);
    }
    return () => clearInterval(t);
  }, [playing, speed, duration, currentEpIdx, settings.autoPlayNext]);

  // Save progress on unmount or episode change
  useEffect(() => {
    return () => {
      if (progress > 0) {
        const ep = MOCK_EPISODES[currentEpIdx];
        const isCompleted = progress > duration * 0.9;
        saveWatchProgress(anime, ep, progress, isCompleted);
        // Also update watchlist implicitly
        const exists = watchlist.find(w => w.id === anime.id);
        if (exists) {
          updateWatchlistStatus(anime.id, isCompleted ? (currentEpIdx === anime.episodes - 1 ? 'completed' : 'watching') : 'watching', currentEpIdx + (isCompleted ? 1 : 0));
        }
      }
    };
  }, [anime, currentEpIdx, progress, duration, saveWatchProgress, updateWatchlistStatus, watchlist]);

  // Auto hide controls
  useEffect(() => {
    let t;
    if (playing && showControls) {
      t = setTimeout(() => setShowControls(false), 3000);
    }
    return () => clearTimeout(t);
  }, [playing, showControls]);

  const togglePlay = (e) => { e?.stopPropagation(); setPlaying(!playing); };
  const skip = (amount, e) => { e?.stopPropagation(); setProgress(p => clamp(p + amount, 0, duration)); };
  
  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col md:flex-row animate-fade-in">
      {/* ---------------- PLAYER AREA ---------------- */}
      <div 
        className="relative bg-black w-full md:flex-1 flex-shrink-0 md:h-full flex flex-col justify-center" 
        style={{ aspectRatio: window.innerWidth < 768 ? '16/9' : 'auto' }}
        onClick={() => setShowControls(!showControls)}
      >
        {/* Video Element Fake */}
        <img src={anime.bannerImage || anime.coverImage?.extraLarge} className="absolute inset-0 w-full h-full object-cover opacity-50 blur-[2px]" alt="bg" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`text-white text-[80px] font-black opacity-30 transition-transform duration-300 ${playing ? 'scale-110' : 'scale-100'}`}>
            {playing ? '▶' : '⏸'}
          </div>
        </div>

        {/* Double Tap Zones (Mobile) */}
        <div className="absolute inset-y-0 left-0 w-1/3 z-10" onDoubleClick={(e) => skip(-10, e)} />
        <div className="absolute inset-y-0 right-0 w-1/3 z-10" onDoubleClick={(e) => skip(10, e)} />

        {/* Overlay Controls */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/80 transition-opacity duration-300 z-20 flex flex-col ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          
          {/* Top Bar */}
          <div className="flex items-center gap-4 p-4 md:p-6">
            <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"><Icons.Back /></button>
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-bold text-[16px] md:text-[20px] truncate">{title}</h2>
              <p className="text-[#E5E5EA] text-[12px] md:text-[14px]">Episode {MOCK_EPISODES[currentEpIdx].id} • {MOCK_EPISODES[currentEpIdx].subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={(e) => { e.stopPropagation(); setSpeed(s => s === 1 ? 1.5 : s === 1.5 ? 2 : 1); }} className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full text-white text-[12px] font-bold border border-white/10 hover:bg-white/20">
                {speed}x
              </button>
              <button onClick={(e) => { e.stopPropagation(); setShowMuted(!showMuted); }} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 hidden md:flex">
                {showMuted ? <Icons.VolumeMute /> : <Icons.VolumeUp />}
              </button>
            </div>
          </div>

          <div className="flex-1" />

          {/* Center Play Controls (Visible mainly on mobile or hover) */}
          <div className="flex items-center justify-center gap-8 md:gap-12 mb-4">
            <button onClick={(e) => skip(-10, e)} className="text-white/80 hover:text-white active:scale-90 transition-transform"><Icons.SkipBack /></button>
            <button onClick={togglePlay} className="w-16 h-16 md:w-20 md:h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center text-white border border-white/30 hover:bg-white/30 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              {playing ? <Icons.Pause /> : <Icons.Play cls="w-8 h-8 ml-1" />}
            </button>
            <button onClick={(e) => skip(10, e)} className="text-white/80 hover:text-white active:scale-90 transition-transform"><Icons.SkipForward /></button>
          </div>

          <div className="flex-1" />

          {/* Bottom Bar */}
          <div className="pb-4 pt-8 bg-gradient-to-t from-black to-transparent" onClick={e => e.stopPropagation()}>
            <ProgressBar progress={progress} duration={duration} color={c} onSeek={(pct) => setProgress(pct * duration)} />
            <div className="flex justify-between px-5 mt-2">
              <button className="text-white/80 text-[12px] font-bold flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors"><Icons.Subtitles /> {settings.subtitleLang}</button>
              <button className="text-white/80 hover:text-white"><Icons.Maximize /></button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- SIDE/BOTTOM PANEL ---------------- */}
      <div className="flex-1 md:w-[400px] md:flex-none bg-[#121212] flex flex-col md:border-l border-[#2C2C2E]">
        {/* Tabs */}
        <div className="flex border-b border-[#2C2C2E] px-4 pt-2">
          {[['episodes', 'Episodes'], ['comments', 'Komentar']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`pb-3 mr-6 text-[15px] font-bold border-b-2 transition-colors ${activeTab === id ? 'text-white border-white' : 'text-[#8E8E93] border-transparent hover:text-white'}`}>{label}</button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
          {activeTab === 'episodes' && (
            <div className="space-y-2 animate-fade-in">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-white font-bold">{anime.episodes || 24} Episode</h3>
                <span className="text-[#8E8E93] text-[13px]">Season 1</span>
              </div>
              {MOCK_EPISODES.map((ep, i) => (
                <div key={ep.id} onClick={() => { setCurrentEpIdx(i); setProgress(0); setPlaying(true); }} 
                  className={`flex gap-3 p-3 rounded-[16px] cursor-pointer transition-all active:scale-95 border ${currentEpIdx === i ? 'bg-[#1C1C1E] border-white/10 shadow-lg' : 'bg-transparent border-transparent hover:bg-[#1C1C1E]/50'}`}>
                  <div className="w-[120px] aspect-video rounded-[8px] bg-[#2C2C2E] relative overflow-hidden flex-shrink-0 border border-white/5">
                    {ep.watched && i !== currentEpIdx && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Icons.Check cls="w-6 h-6 text-white" /></div>}
                    {currentEpIdx === i && <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /><span className="text-white text-[10px] font-bold">PLAYING</span></div>}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className={`text-[13px] font-bold line-clamp-1 ${currentEpIdx === i ? 'text-white' : 'text-[#E5E5EA]'}`}>{ep.title}: {ep.subtitle}</p>
                    <p className="text-[#8E8E93] text-[11px] mb-1.5">{ep.duration}</p>
                    {ep.progress > 0 && i !== currentEpIdx && <div className="h-0.5 bg-[#2C2C2E] rounded-full w-full"><div className="h-full rounded-full" style={{ width: `${ep.progress}%`, backgroundColor: c }} /></div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="animate-fade-in space-y-4">
              <div className="flex gap-3 bg-[#1C1C1E] p-3 rounded-[16px] border border-white/5">
                <div className="w-9 h-9 rounded-full bg-[#2C2C2E]" />
                <input type="text" placeholder="Tulis pendapatmu..." className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder-[#8E8E93]" />
              </div>
              <p className="text-[#8E8E93] text-[12px] font-medium pl-1">{MOCK_COMMENTS.length} Komentar</p>
              {MOCK_COMMENTS.map(c => (
                <div key={c.id} className="flex gap-3">
                  <img src={c.avatar} className="w-10 h-10 rounded-full bg-[#2C2C2E] border border-white/10" alt="" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1"><span className="text-white text-[13px] font-bold">{c.user}</span><span className="text-[#48484A] text-[10px]">{c.time}</span></div>
                    <p className="text-[#E5E5EA] text-[14px] leading-relaxed mb-2">{c.text}</p>
                    <div className="flex gap-2">
                      {Object.entries(c.reactions).map(([e, count]) => <span key={e} className="px-2.5 py-1 bg-[#1C1C1E] rounded-full text-[12px] text-[#D1D1D6] border border-white/5">{e} {count}</span>)}
                      <button className="px-2.5 py-1 bg-[#1C1C1E] rounded-full text-[12px] text-[#8E8E93] border border-white/5 active:scale-90">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// Settings Modal (Deep Dive)
// ---------------------------------------------------------
const SettingsModal = ({ isOpen, onClose }) => {
  const { settings, updateSetting, ACCENT_COLORS } = useAppContext();
  
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Pengaturan" fullHeight>
      <div className="p-6 space-y-8 animate-fade-in">
        
        {/* Appearance */}
        <div>
          <h3 className="text-[#8E8E93] text-[13px] font-bold tracking-wider uppercase mb-3">Tampilan & Warna</h3>
          <div className="bg-[#1C1C1E] rounded-[20px] p-4 border border-white/5 space-y-5">
            <div>
              <p className="text-white text-[15px] font-medium mb-3">Warna Aksen</p>
              <div className="flex gap-3 flex-wrap">
                {ACCENT_COLORS.map(c => (
                  <button key={c.id} onClick={() => updateSetting('accentColor', c.hex)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${settings.accentColor === c.hex ? 'ring-2 ring-white scale-110' : 'ring-0 scale-100 hover:scale-105'}`} style={{ backgroundColor: c.hex }}>
                    {settings.accentColor === c.hex && <Icons.Check cls="w-5 h-5 text-white" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between pt-5 border-t border-[#2C2C2E]">
              <div>
                <p className="text-white text-[15px] font-medium">Tema Gelap (Dark Mode)</p>
                <p className="text-[#8E8E93] text-[12px]">Gunakan latar hitam pekat</p>
              </div>
              <Switch checked={settings.appTheme === 'dark'} onChange={(v) => updateSetting('appTheme', v ? 'dark' : 'light')} />
            </div>
          </div>
        </div>

        {/* Video Preferences */}
        <div>
          <h3 className="text-[#8E8E93] text-[13px] font-bold tracking-wider uppercase mb-3">Preferensi Tontonan</h3>
          <div className="bg-[#1C1C1E] rounded-[20px] overflow-hidden border border-white/5">
            <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E]">
              <p className="text-white text-[15px] font-medium">Kualitas Video Default</p>
              <select value={settings.videoQuality} onChange={(e) => updateSetting('videoQuality', e.target.value)} className="bg-transparent text-[#0A84FF] font-medium text-[15px] outline-none text-right cursor-pointer">
                {['Auto', '1080p', '720p', '480p', 'Data Saver'].map(q => <option key={q} value={q} className="bg-[#2C2C2E] text-white">{q}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E]">
              <p className="text-white text-[15px] font-medium">Bahasa Subtitle</p>
              <select value={settings.subtitleLang} onChange={(e) => updateSetting('subtitleLang', e.target.value)} className="bg-transparent text-[#0A84FF] font-medium text-[15px] outline-none text-right cursor-pointer">
                {['Indonesia', 'English', 'Off'].map(q => <option key={q} value={q} className="bg-[#2C2C2E] text-white">{q}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E]">
              <div><p className="text-white text-[15px] font-medium">Putar Otomatis (Auto-play)</p></div>
              <Switch checked={settings.autoPlayNext} onChange={(v) => updateSetting('autoPlayNext', v)} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div><p className="text-white text-[15px] font-medium">Lewati Intro (Skip Opening)</p></div>
              <Switch checked={settings.skipIntro} onChange={(v) => updateSetting('skipIntro', v)} />
            </div>
          </div>
        </div>

        {/* Privacy & Storage */}
        <div>
          <h3 className="text-[#8E8E93] text-[13px] font-bold tracking-wider uppercase mb-3">Privasi & Data</h3>
          <div className="bg-[#1C1C1E] rounded-[20px] overflow-hidden border border-white/5">
            <div className="flex items-center justify-between p-4 border-b border-[#2C2C2E]">
              <div>
                <p className="text-white text-[15px] font-medium flex items-center gap-2">Mode Penyamaran <span className="px-1.5 bg-[#FF453A]/20 text-[#FF453A] text-[9px] rounded font-bold">BETA</span></p>
                <p className="text-[#8E8E93] text-[12px]">Jangan simpan riwayat tontonan baru</p>
              </div>
              <Switch checked={settings.incognitoMode} onChange={(v) => updateSetting('incognitoMode', v)} />
            </div>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full text-left p-4 text-[#FF453A] font-medium text-[15px] active:bg-[#2C2C2E] transition-colors">
              Hapus Semua Data Aplikasi (Reset)
            </button>
          </div>
        </div>

        <div className="pt-4 text-center">
          <p className="text-[#48484A] text-[12px] font-medium mb-1">AniStream Ultra v3.0.0 Enterprise</p>
          <p className="text-[#48484A] text-[10px]">Dibuat dengan ❤️ di Indonesia</p>
        </div>
      </div>
    </BottomSheet>
  );
};


// =====================================================================
// 10. MAIN PAGES
// =====================================================================

// ---------------------------------------------------------
// Home Page
// ---------------------------------------------------------
const HomePage = ({ onAnimeClick }) => {
  const [data, setData] = useState({ trending: [], season: [], popular: [], upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);
  const { watchHistory, settings } = useAppContext();

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetchAniList(QUERIES.HOME_DATA, { season: 'SPRING', seasonYear: 2025 });
      if (res) setData({ trending: res.trending.media, season: res.season.media, popular: res.popular.media, upcoming: res.upcoming.media });
      setLoading(false);
    })();
  }, []);

  const heroes = data.trending.slice(0, 6);
  const greeting = new Date().getHours() < 12 ? 'Ohayou' : new Date().getHours() < 18 ? 'Konnichiwa' : 'Konbanwa';

  return (
    <div className="pt-12 pb-32 h-full overflow-y-auto hide-scrollbar">
      {/* Header */}
      <div className="px-5 md:px-8 mb-6 flex justify-between items-end animate-fade-in">
        <div>
          <p className="text-[#8E8E93] text-[13px] font-bold tracking-[0.15em] uppercase mb-1">{greeting}, User</p>
          <h1 className="text-[28px] md:text-[34px] font-black text-white leading-[1.1] tracking-tight">Temukan anime<br/>favorit barumu.</h1>
        </div>
      </div>

      {/* Hero Carousel */}
      <div className="mb-10">
        {loading ? <div className="px-5 md:px-8"><Skeletons.Banner /></div> : (
          <div className="relative group">
            <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-5 md:px-8 gap-4 md:gap-6" 
                 onScroll={e => setHeroIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth))}
                 onTouchStart={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}>
              {heroes.map((anime, i) => {
                const title = anime.title?.english || anime.title?.romaji;
                const c = anime.coverImage?.color || settings.accentColor;
                return (
                  <div key={anime.id} onClick={() => onAnimeClick(anime)} className="min-w-full snap-center relative h-[420px] md:h-[500px] lg:h-[600px] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl cursor-pointer border border-white/5 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500">
                    {/* Parallax-like Image */}
                    <img src={anime.bannerImage || anime.coverImage?.extraLarge} className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] ease-out group-hover:scale-110" alt={title} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-[#0A0C10]/40 to-transparent" />
                    <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{ background: `linear-gradient(to top, ${c}, transparent)` }} />
                    
                    <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 flex flex-col md:items-start items-center text-center md:text-left">
                      <div className="flex gap-2 mb-3">
                        <span className="px-3 py-1 bg-white text-black text-[10px] md:text-[12px] font-black rounded-sm uppercase tracking-widest shadow-lg">TRENDING #{i+1}</span>
                        {anime.format === 'MOVIE' && <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] md:text-[12px] font-bold rounded-sm border border-white/20">MOVIE</span>}
                      </div>
                      <h2 className="text-[32px] md:text-[48px] font-black text-white leading-[1.05] mb-4 drop-shadow-xl">{title}</h2>
                      <p className="text-[#E5E5EA] text-[13px] md:text-[15px] font-medium line-clamp-2 md:line-clamp-3 mb-6 max-w-2xl drop-shadow-md hidden md:block">{anime.description?.replace(/<[^>]*>?/gm, '')}</p>
                      
                      <div className="flex gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none md:px-10 bg-white text-black font-black py-3.5 md:py-4 rounded-[16px] flex justify-center items-center gap-2 text-[14px] md:text-[16px] active:scale-95 transition-transform hover:bg-gray-200">
                          <Icons.Play cls="w-5 h-5" /> Putar
                        </button>
                        <button className="w-12 h-12 md:w-14 md:h-14 rounded-[16px] bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform hover:bg-white/20">
                          <Icons.Info />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {heroes.map((_, i) => (
                <div key={i} className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ease-out ${heroIdx === i ? 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'w-2 bg-[#3A3A3C]'}`} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History Row (If exists) */}
      {watchHistory.length > 0 && (
        <div className="mb-10 px-5 md:px-8">
          <h2 className="text-[20px] md:text-[24px] font-black text-white mb-4">Lanjutkan Menonton</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar" onTouchStart={e => e.stopPropagation()}>
            {watchHistory.map(h => (
              <div key={h.animeId} onClick={() => onAnimeClick({id: h.animeId})} className="min-w-[240px] md:min-w-[280px] snap-center cursor-pointer group">
                <div className="w-full aspect-video rounded-[16px] bg-[#1C1C1E] relative overflow-hidden mb-3 border border-white/5 group-hover:border-white/20 transition-colors">
                  <img src={h.coverImage} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 text-white shadow-lg group-hover:bg-[var(--accent)] group-hover:border-transparent transition-colors" style={{ '--accent': settings.accentColor }}><Icons.Play /></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20"><div className="h-full transition-all" style={{ width: `${(h.timeProgress / 1425) * 100}%`, backgroundColor: settings.accentColor }} /></div>
                </div>
                <h3 className="text-white font-bold text-[14px] line-clamp-1">{h.animeTitle}</h3>
                <p className="text-[#8E8E93] text-[12px]">Ep {h.episodeNumber} • {formatTime(h.timeProgress)} / 23:45</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <ContentRow title="Populer Musim Ini" data={data.season} loading={loading} onAnimeClick={onAnimeClick} />
      <ContentRow title="Sedang Trending" data={data.trending.slice(6)} loading={loading} onAnimeClick={onAnimeClick} showRank />
      <ContentRow title="Rilis Mendatang" data={data.upcoming} loading={loading} onAnimeClick={onAnimeClick} />
      <ContentRow title="Top Sepanjang Masa" data={data.popular} loading={loading} onAnimeClick={onAnimeClick} />
    </div>
  );
};

// ---------------------------------------------------------
// Explore Page
// ---------------------------------------------------------
const ExplorePage = ({ onAnimeClick }) => {
  const { searchHistory, addSearchHistory, clearSearchHistory, settings } = useAppContext();
  const [query, setQuery] = useState('');
  const dq = useDebounce(query, 800); // 800ms debounce for API
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');

  const GENRES = ['Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Comedy', 'Drama', 'Horror', 'Sports', 'Mecha', 'Slice of Life', 'Mystery', 'Psychological'];

  useEffect(() => {
    const fetchSearch = async () => {
      if (dq.length < 2 && !activeFilter) { setResults([]); return; }
      setLoading(true);
      const vars = { page: 1, perPage: 24 };
      if (dq) vars.search = dq;
      if (activeFilter) vars.genres = [activeFilter];
      const data = await fetchAniList(QUERIES.SEARCH_ADVANCED, vars);
      if (data && data.Page) setResults(data.Page.media);
      setLoading(false);
      if (dq && data?.Page?.media?.length > 0) addSearchHistory(dq);
    };
    fetchSearch();
  }, [dq, activeFilter, addSearchHistory]);

  return (
    <div className="h-full overflow-y-auto hide-scrollbar pb-32">
      <div className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-xl pt-12 px-5 md:px-8 pb-4 border-b border-white/5">
        <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight mb-5">Eksplorasi</h1>
        
        {/* Advanced Search Input */}
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93] group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': settings.accentColor }}><Icons.Search /></div>
          <input 
            type="text" value={query} onChange={e => setQuery(e.target.value)} 
            className="w-full bg-[#1C1C1E] text-white rounded-[20px] py-4 pl-12 pr-12 outline-none text-[16px] placeholder-[#48484A] border border-white/10 focus:border-[var(--accent)] transition-colors shadow-inner" 
            style={{ '--accent': settings.accentColor }}
            placeholder="Cari judul, studio, atau karakter..." 
          />
          {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#2C2C2E] rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white"><Icons.Close /></button>}
        </div>

        {/* Genre Filters (Horizontal Scroll) */}
        {!query && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar mt-5 pb-1 -mx-5 px-5 md:mx-0 md:px-0">
            <button onClick={() => setActiveFilter('')} className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${!activeFilter ? 'bg-white text-black' : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/10 hover:bg-[#2C2C2E]'}`}>Semua</button>
            {GENRES.map(g => (
              <button key={g} onClick={() => setActiveFilter(g)} className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${activeFilter === g ? 'bg-[var(--accent)] text-white' : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/10 hover:bg-[#2C2C2E]'}`} style={{ '--accent': settings.accentColor }}>{g}</button>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 md:px-8 pt-6">
        {query || activeFilter ? (
          loading ? (
            <Skeletons.Row count={12} />
          ) : results.length > 0 ? (
            <div className="animate-fade-in">
              <p className="text-[#8E8E93] text-[13px] font-medium mb-4">Menemukan {results.length} hasil</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5" onTouchStart={e => e.stopPropagation()}>
                {results.map(a => <AnimeCard key={a.id} anime={a} onClick={onAnimeClick} />)}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center pt-20 text-center animate-fade-in">
              <Icons.Search />
              <h3 className="text-white font-black text-[20px] mt-4 mb-2">Tidak Ditemukan</h3>
              <p className="text-[#8E8E93] text-[14px]">Coba gunakan kata kunci atau filter lain.</p>
            </div>
          )
        ) : (
          <div className="animate-slide-up" onTouchStart={e => e.stopPropagation()}>
            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-[18px] font-black text-white">Riwayat Pencarian</h2>
                  <button onClick={clearSearchHistory} className="text-[#8E8E93] text-[12px] font-medium hover:text-white">Bersihkan</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHistory.map((term, i) => (
                    <button key={i} onClick={() => setQuery(term)} className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] rounded-[12px] border border-white/5 text-[#D1D1D6] text-[13px] hover:bg-[#2C2C2E] transition-colors">
                      <Icons.Clock /> {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Curated Collections (Visuals) */}
            <h2 className="text-[18px] font-black text-white mb-4">Koleksi Pilihan</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {[
                { t: "Pemenang Anime Awards 2024", img: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-nNgE6mD0r6vM.jpg", color: "#FFD60A" },
                { t: "Masterpiece Studio MAPPA", img: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/145064-1S0e047W4Tus.jpg", color: "#FF453A" },
                { t: "Isekai Reinkarnasi Overpower", img: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/108465-RgsMpKMZQaSm.jpg", color: "#BF5AF2" },
                { t: "Romansa Bikin Baper", img: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/114535-1L6oW3Xp2aFm.jpg", color: "#FF375F" }
              ].map((c, i) => (
                <div key={i} className="h-[120px] rounded-[20px] relative overflow-hidden group cursor-pointer border border-white/10">
                  <img src={c.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute inset-y-0 left-0 w-1/2 opacity-60" style={{ background: `linear-gradient(to right, ${c.color}, transparent)` }} />
                  <h3 className="absolute bottom-4 left-5 right-5 text-white font-black text-[18px] leading-tight drop-shadow-md z-10">{c.t}</h3>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// Watchlist Page
// ---------------------------------------------------------
const WatchlistPage = ({ onAnimeClick }) => {
  const { watchlist, updateWatchlistStatus, removeFromWatchlist } = useAppContext();
  const [activeTab, setActiveTab] = useState('watching');
  const [deletingId, setDeletingId] = useState(null);

  const TABS = [
    { id: 'watching', label: 'Ditonton' },
    { id: 'plan_to_watch', label: 'Disimpan' },
    { id: 'completed', label: 'Selesai' }
  ];

  const filtered = watchlist.filter(w => w.status === activeTab).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleRemove = (id) => {
    setDeletingId(id);
    // Real removal is handled by DustDeleteCard callback
  };

  return (
    <div className="h-full overflow-y-auto hide-scrollbar pb-32 bg-[#000]">
      <div className="pt-12 px-5 md:px-8 mb-6 sticky top-0 bg-[#000]/90 backdrop-blur-xl z-20 pb-4 border-b border-white/5">
        <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight mb-6">Ruang Tonton</h1>
        
        {/* Custom Tab Selector */}
        <div className="flex bg-[#1C1C1E] p-1.5 rounded-[16px] border border-white/5 relative">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-2.5 text-[14px] font-bold rounded-[12px] transition-all z-10 ${activeTab === t.id ? 'text-white shadow-md' : 'text-[#8E8E93] hover:text-[#D1D1D6]'}`}>
              {t.label}
              <span className="ml-2 text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">{watchlist.filter(w => w.status === t.id).length}</span>
            </button>
          ))}
          {/* Animated Pill Background */}
          <div className="absolute top-1.5 bottom-1.5 bg-[#2C2C2E] rounded-[12px] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" 
               style={{ width: `calc(33.333% - 4px)`, transform: `translateX(calc(${TABS.findIndex(t => t.id === activeTab) * 100}% + ${TABS.findIndex(t => t.id === activeTab) * 6}px))` }} />
        </div>
      </div>

      <div className="px-5 md:px-8" onTouchStart={e => e.stopPropagation()}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <Icons.Bookmark a={false} />
            <h3 className="text-white font-black text-[20px] mt-4 mb-2">Masih Kosong</h3>
            <p className="text-[#8E8E93] text-[14px]">Tambahkan anime ke kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
            {filtered.map(item => (
              <DustDeleteCard key={item.id} isDeleting={deletingId === item.id} onDeleted={() => { removeFromWatchlist(item.id); setDeletingId(null); }}>
                <div className="flex gap-4 p-3 bg-[#1C1C1E] rounded-[24px] border border-white/5 group hover:border-white/10 transition-colors">
                  <div onClick={() => onAnimeClick(item)} className="w-[90px] h-[120px] rounded-[16px] bg-[#2C2C2E] bg-cover bg-center cursor-pointer flex-shrink-0 border border-white/10" style={{ backgroundImage: `url(${item.coverImage?.large})` }} />
                  <div className="flex-1 min-w-0 py-1 flex flex-col">
                    <h3 onClick={() => onAnimeClick(item)} className="text-white font-bold text-[16px] line-clamp-2 mb-1 cursor-pointer">{item.title?.english || item.title?.romaji}</h3>
                    
                    {/* Progress Control */}
                    {activeTab === 'watching' && item.totalEps > 0 && (
                      <div className="mt-auto mb-2">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[12px] font-bold text-[#0A84FF]">Ep {item.progress} <span className="text-[#8E8E93] font-medium">/ {item.totalEps}</span></span>
                          <div className="flex gap-1">
                            <button onClick={() => updateWatchlistStatus(item.id, undefined, Math.max(0, item.progress - 1))} className="w-6 h-6 bg-[#2C2C2E] rounded-md flex items-center justify-center text-white font-bold active:scale-90">-</button>
                            <button onClick={() => updateWatchlistStatus(item.id, undefined, Math.min(item.totalEps, item.progress + 1))} className="w-6 h-6 bg-[#0A84FF] rounded-md flex items-center justify-center text-white font-bold active:scale-90">+</button>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#2C2C2E] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0A84FF] rounded-full transition-all" style={{ width: `${(item.progress / item.totalEps) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {activeTab === 'plan_to_watch' && <p className="text-[#8E8E93] text-[12px] mt-auto">Ditambahkan {new Date(item.addedAt).toLocaleDateString('id-ID')}</p>}
                    {activeTab === 'completed' && <p className="text-[#30D158] text-[12px] font-bold mt-auto flex items-center gap-1"><Icons.Check cls="w-4 h-4" /> Tamat ({item.totalEps} Eps)</p>}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[#2C2C2E]">
                      {activeTab !== 'watching' && <button onClick={() => updateWatchlistStatus(item.id, 'watching')} className="flex-1 py-1.5 bg-[#2C2C2E] rounded-[10px] text-[11px] font-bold text-white hover:bg-[#3A3A3C] transition-colors">Tonton</button>}
                      {activeTab !== 'completed' && <button onClick={() => updateWatchlistStatus(item.id, 'completed', item.totalEps)} className="flex-1 py-1.5 bg-[#2C2C2E] rounded-[10px] text-[11px] font-bold text-[#30D158] hover:bg-[#3A3A3C] transition-colors">Tamat</button>}
                      <button onClick={() => handleRemove(item.id)} className="px-3 py-1.5 bg-[#FF453A]/10 text-[#FF453A] rounded-[10px] hover:bg-[#FF453A]/20 transition-colors"><Icons.Trash /></button>
                    </div>
                  </div>
                </div>
              </DustDeleteCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------
// Profile & Settings Page
// ---------------------------------------------------------
const ProfilePage = () => {
  const { watchlist, watchHistory, settings } = useAppContext();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const stats = useMemo(() => {
    const completed = watchlist.filter(w => w.status === 'completed').length;
    const totalWatchedEps = watchHistory.length + watchlist.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    const days = (totalWatchedEps * 24) / 60 / 24; // approx 24 mins per ep
    return { completed, totalWatchedEps, days: days.toFixed(1) };
  }, [watchlist, watchHistory]);

  return (
    <div className="h-full overflow-y-auto hide-scrollbar pb-32">
      <div className="pt-12 px-5 md:px-8 mb-8 flex justify-between items-center">
        <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight">Profil</h1>
        <button onClick={() => setShowSettingsModal(true)} className="w-12 h-12 bg-[#1C1C1E] rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-[#2C2C2E] transition-colors active:scale-90 shadow-lg">
          <Icons.Settings />
        </button>
      </div>
      
      <div className="px-5 md:px-8 max-w-4xl mx-auto">
        {/* ID Card */}
        <div className="w-full rounded-[32px] p-6 md:p-8 bg-gradient-to-br from-[#1C1C1E] to-[#0A0C10] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden mb-8 group">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-30 pointer-events-none transition-colors duration-1000" style={{ backgroundColor: settings.accentColor }} />
          
          <div className="flex items-center gap-5 md:gap-8 relative z-10">
            <div className="w-[88px] h-[88px] md:w-[120px] md:h-[120px] rounded-[28px] overflow-hidden border-2 border-white/20 bg-[#2C2C2E] shadow-2xl group-hover:scale-105 transition-transform duration-500">
              <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Hikari" alt="Avatar" className="w-full h-full object-cover bg-white" />
            </div>
            <div>
              <h2 className="text-[26px] md:text-[36px] font-black text-white leading-tight mb-2">Guest_User</h2>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white text-black text-[11px] md:text-[13px] font-black rounded-lg uppercase tracking-widest shadow-md">FREE TIER</span>
                <span className="px-3 py-1 bg-[#1C1C1E] text-white text-[11px] md:text-[13px] font-bold rounded-lg border border-white/10">Lv. 12</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6 mt-8 pt-6 border-t border-white/10 relative z-10">
            <div><p className="text-[#8E8E93] text-[11px] md:text-[13px] uppercase tracking-wider mb-1 font-bold">Selesai</p><p className="text-white text-[24px] md:text-[32px] font-black tabular-nums">{stats.completed}</p></div>
            <div><p className="text-[#8E8E93] text-[11px] md:text-[13px] uppercase tracking-wider mb-1 font-bold">Episode</p><p className="text-white text-[24px] md:text-[32px] font-black tabular-nums">{stats.totalWatchedEps}</p></div>
            <div><p className="text-[#8E8E93] text-[11px] md:text-[13px] uppercase tracking-wider mb-1 font-bold">Waktu</p><p className="text-[var(--accent)] text-[24px] md:text-[32px] font-black tabular-nums" style={{ '--accent': settings.accentColor }}>{stats.days}<span className="text-[14px] md:text-[16px] text-white ml-1">Hari</span></p></div>
          </div>
        </div>

        <h2 className="text-[20px] font-black text-white mb-4">Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {ACHIEVEMENTS.map(a => (
            <div key={a.id} className={`p-4 rounded-[24px] border transition-all ${a.unlocked ? 'bg-[#1C1C1E] border-white/10 hover:border-white/20' : 'bg-[#0A0A0A] border-white/5 opacity-50'}`}>
              <div className="flex items-center gap-4 mb-3">
                <div className={`w-14 h-14 rounded-[16px] flex items-center justify-center text-[28px] ${a.unlocked ? 'bg-[var(--accent)]/20 shadow-inner' : 'bg-[#2C2C2E]'}`} style={{ '--accent': settings.accentColor }}>{a.icon}</div>
                <div>
                  <h3 className={`font-black text-[16px] ${a.unlocked ? 'text-white' : 'text-[#8E8E93]'}`}>{a.title}</h3>
                  <p className="text-[#8E8E93] text-[12px]">{a.desc}</p>
                </div>
              </div>
              {!a.unlocked && (
                <div className="h-1.5 bg-[#2C2C2E] rounded-full overflow-hidden mt-1"><div className="h-full bg-[#8E8E93] rounded-full" style={{ width: `${a.progress}%` }}/></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </div>
  );
};


// =====================================================================
// 11. MAIN APP SHELL & ROUTING
// =====================================================================

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

const AppShell = () => {
  const { settings } = useAppContext();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [playerAnime, setPlayerAnime] = useState(null);

  // Swipe logic for main views
  const [touchStart, setTouchStart] = useState({ x: 0, y: 0 });
  const handleTouchStart = (e) => setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  const handleTouchEnd = (e) => {
    if (selectedAnime || playerAnime) return; // Prevent swipe if modal is open
    const dx = touchStart.x - e.changedTouches[0].clientX;
    const dy = touchStart.y - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
      if (dx > 0 && activeTab < 3) setActiveTab(p => p + 1);
      else if (dx < 0 && activeTab > 0) setActiveTab(p => p - 1);
    }
  };

  const TABS = [
    { id: 'home', Icon: Icons.Home, label: 'Beranda' },
    { id: 'explore', Icon: Icons.Explore, label: 'Eksplorasi' },
    { id: 'watchlist', Icon: Icons.Bookmark, label: 'Koleksi' },
    { id: 'profile', Icon: Icons.Profile, label: 'Profil' }
  ];

  // Map settings.appTheme to actual CSS if needed, but for anime app, dark mode is forced baseline
  const bgClass = settings.appTheme === 'dark' ? 'bg-[#000000]' : 'bg-[#000000]'; // Forced dark for aesthetics, real implementation would swap classes

  return (
    <div className={`w-full h-screen ${bgClass} overflow-hidden flex flex-col relative select-none antialiased`} style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif" }}>
      <Toaster />

      {/* Global Styles for extreme UI effects */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideDownToast { 0% { transform: translateY(-150%); opacity: 0; } 10% { transform: translateY(0); opacity: 1; } 90% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-150%); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes dustFly { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; } }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.32, 0.72, 0, 1) both; }
        .animate-slide-down-toast { animation: slideDownToast 3s cubic-bezier(0.32, 0.72, 0, 1) both; }
        .animate-fade-in { animation: fadeIn 0.3s ease-out both; }
        
        /* Ultra Premium Glass Nav - Adapts slightly to accent color */
        .lux-ios-glass {
          background: rgba(28, 28, 30, 0.75);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 0.5px solid rgba(255, 255, 255, 0.15);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 20px 40px rgba(0, 0, 0, 0.8);
        }
      `}} />

      {/* Main Viewport Container */}
      <div className="flex-1 w-full h-full relative" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div className="flex w-full h-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]" style={{ transform: `translate3d(-${activeTab * 100}%, 0, 0)` }}>
          <div className="w-full h-full flex-shrink-0 relative"><HomePage onAnimeClick={setSelectedAnime} /></div>
          <div className="w-full h-full flex-shrink-0 relative"><ExplorePage onAnimeClick={setSelectedAnime} /></div>
          <div className="w-full h-full flex-shrink-0 relative"><WatchlistPage onAnimeClick={setSelectedAnime} /></div>
          <div className="w-full h-full flex-shrink-0 relative"><ProfilePage /></div>
        </div>
      </div>

      {/* MAGNUM OPUS: Bottom Navigation */}
      {/* Requirement: White Icons, floating, rounded */}
      <div className={`absolute bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-safe transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${selectedAnime || playerAnime ? 'translate-y-32 opacity-0' : 'translate-y-0 opacity-100'}`}>
        <nav className="pointer-events-auto w-full max-w-[320px] md:max-w-[400px] h-[64px] lux-ios-glass rounded-full flex items-center px-1.5 relative">
          
          {/* Active Indicator Pill (Glassy White) */}
          <div className="absolute top-1.5 bottom-1.5 bg-white/10 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
               style={{ width: `calc(25% - 3px)`, transform: `translateX(calc(${activeTab * 100}% + ${activeTab * 0}px))` }}>
                 <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full blur-[2px] opacity-60" style={{ backgroundColor: '#FFF' }} />
          </div>

          {TABS.map(({ id, Icon, label }, i) => {
            const active = activeTab === i;
            return (
              <button key={id} onClick={() => setActiveTab(i)} style={{ WebkitTapHighlightColor: 'transparent', color: active ? '#FFFFFF' : '#8E8E93' }}
                className="relative z-10 flex-1 h-full flex flex-col items-center justify-center gap-[4px] transition-all duration-300 active:scale-90">
                <div className={`transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center ${active ? 'scale-110 -translate-y-0.5' : 'scale-100 hover:text-[#D1D1D6]'}`}>
                  <Icon a={active} />
                </div>
                <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 ${active ? 'opacity-100' : 'opacity-0 translate-y-2 absolute'}`}>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Modals */}
      {selectedAnime && !playerAnime && <AnimeDetailModal animeId={selectedAnime.id} onClose={() => setSelectedAnime(null)} onPlay={setPlayerAnime} />}
      {playerAnime && <VideoPlayerModal anime={playerAnime} onClose={() => setPlayerAnime(null)} />}
    </div>
  );
}