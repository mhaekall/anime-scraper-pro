// features/explore/ExploreView.tsx — Search-first explore with AniList proxy
// KEY FIX: Uses debounced search, genre filter from AniList,
// but NO per-card image fetching. Images come from search results.

"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { api } from "@/core/lib/api";
import { AnimeCard } from "@/ui/cards/AnimeCard";
import { IconSearch, IconClose, IconClock } from "@/ui/icons";
import { useSettings } from "@/core/stores/app-store";

const GENRES = [
  { name: "Action", gradient: "from-[#FF3B30] to-[#FF2D55]" },
  { name: "Romance", gradient: "from-[#FF2D55] to-[#FF375F]" },
  { name: "Fantasy", gradient: "from-[#5856D6] to-[#AF52DE]" },
  { name: "Sci-Fi", gradient: "from-[#007AFF] to-[#5AC8FA]" },
  { name: "Comedy", gradient: "from-[#FFCC00] to-[#FFD60A]" },
  { name: "Drama", gradient: "from-[#FF9500] to-[#FFAC33]" },
  { name: "Horror", gradient: "from-[#1C1C1E] to-[#2C2C2E]" },
  { name: "Sports", gradient: "from-[#34C759] to-[#30D158]" },
  { name: "Mecha", gradient: "from-[#64D2FF] to-[#5AC8FA]" },
  { name: "Slice of Life", gradient: "from-[#FF9500] to-[#FFD60A]" },
  { name: "Mystery", gradient: "from-[#AF52DE] to-[#BF5AF2]" },
  { name: "Psychological", gradient: "from-[#5E5CE6] to-[#66d2ff]" },
];

const SEARCH_Q = `
  query ($search: String, $page: Int, $perPage: Int, $genres: [String], $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, type: ANIME, genre_in: $genres, sort: $sort) {
        id title { romaji english native } coverImage { extraLarge large color }
        averageScore status seasonYear
      }
    }
  }
`;

function useDebounce(val: string, ms: number) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), ms); return () => clearTimeout(t); }, [val, ms]);
  return d;
}

// Search history stored locally
function getSearchHist(): string[] {
  try { return JSON.parse(localStorage.getItem("ani-search-v2") || "[]"); } catch { return []; }
}
function saveSearchHist(terms: string[]) {
  localStorage.setItem("ani-search-v2", JSON.stringify(terms.slice(0, 10)));
}

export default function ExploreView() {
  const accent = useSettings((s) => s.settings.accentColor);
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHist, setSearchHist] = useState<string[]>([]);
  const dq = useDebounce(query, 600);

  useEffect(() => setSearchHist(getSearchHist()), []);

  useEffect(() => {
    // CASE A: Initial state or user cleared search/genre
    if (!dq && !genre) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // CASE B: Search mode (AniList Proxy)
    const vars: any = { page: 1, perPage: 24, search: dq || undefined };
    if (genre) vars.genres = [genre];
    vars.sort = ["POPULARITY_DESC"];

    api.anilist(SEARCH_Q, vars)
      .then((data) => {
        const media = data?.data?.Page?.media || [];
        setResults(media.map((m: any) => ({
          id: String(m.id),
          title: m.title.english || m.title.romaji || m.title.native || "",
          img: m.coverImage?.extraLarge || m.coverImage?.large,
          score: m.averageScore,
          color: m.coverImage?.color,
          status: m.status,
          seasonYear: m.seasonYear,
        })));
        if (dq && media.length > 0) {
          const updated = [dq, ...getSearchHist().filter((t) => t.toLowerCase() !== dq.toLowerCase())].slice(0, 10);
          saveSearchHist(updated);
          setSearchHist(updated);
        }
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));

  }, [dq, genre]);

  return (
    <div className="w-full pb-32">
      {/* Sticky Search Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl px-5 md:px-8 pt-4 pb-4 border-b border-white/5">
        <div className="relative max-w-2xl mx-auto">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"><IconSearch className="w-5 h-5" /></div>
          <input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            className="w-full bg-[#1c1c1e] text-white rounded-[16px] py-3.5 pl-12 pr-10 outline-none text-[16px] placeholder-white/30 border border-white/10 focus:border-white/20 transition-all shadow-lg" 
            placeholder="Anime, genre, atau studio..." 
          />
          {(query || genre) && (
            <button 
              onClick={() => { setQuery(""); setGenre(""); setResults([]); }} 
              className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 transition-colors"
            >
              <IconClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-5 md:px-8 pt-6">
        {query || genre ? (
          loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="w-full aspect-[2/3] bg-[#1c1c1e] rounded-2xl animate-pulse" />)}
            </div>
          ) : results.length > 0 ? (
            <div className="anim-fade">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">{genre ? `Genre: ${genre}` : "Hasil Pencarian"}</h2>
                <span className="text-white/40 text-[11px] font-medium">{results.length} item</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 lg:gap-4">
                {results.map((a, i) => <AnimeCard key={a.id} id={a.id} title={a.title} img={a.img} score={a.score} color={a.color} />)}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center pt-20 text-center anim-fade">
              <div className="w-16 h-16 bg-[#1c1c1e] rounded-full flex items-center justify-center mb-6">
                <IconSearch className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-white font-bold text-xl">Tidak Ditemukan</h3>
              <p className="text-white/40 text-sm mt-2 max-w-[200px]">Coba kata kunci atau filter genre yang berbeda.</p>
            </div>
          )
        ) : (
          <div className="anim-up max-w-2xl mx-auto">
            {searchHist.length > 0 && (
              <div className="mb-10">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-white">Terakhir dicari</h2>
                  <button onClick={() => { saveSearchHist([]); setSearchHist([]); }} className="text-[#0A84FF] text-[13px] font-medium active:opacity-50 transition-opacity">Hapus Semua</button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {searchHist.map((t, i) => (
                    <button key={i} onClick={() => setQuery(t)} className="flex items-center gap-2 px-4 py-2 bg-[#1c1c1e] hover:bg-[#2c2c2e] rounded-full border border-white/5 text-white/80 text-[13px] transition-colors">
                      <IconClock className="w-3.5 h-3.5 text-white/30" /> {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-bold text-white mb-5">Telusuri Genre</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {GENRES.map((g) => (
                  <button 
                    key={g.name} 
                    onClick={() => setGenre(g.name)} 
                    className="relative overflow-hidden h-24 rounded-[20px] transition-all active:scale-95 group shadow-lg shadow-black/20"
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br ${g.gradient} opacity-90 group-hover:opacity-100 transition-opacity`} />
                    <div className="absolute inset-0 bg-black/10 group-active:bg-black/30 transition-colors" />
                    <span className="absolute bottom-4 left-4 text-white font-black text-lg tracking-tight drop-shadow-sm">{g.name}</span>
                    <div className="absolute -right-2 -top-2 w-12 h-12 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
