// features/explore/ExploreView.tsx — Search-first explore with AniList proxy
// KEY FIX: Uses debounced search, genre filter from AniList,
// but NO per-card image fetching. Images come from search results.

"use client";

import { useState, useEffect, useCallback, memo } from "react";
import useSWR from "swr";
import { api } from "@/core/lib/api";
import { AnimeCard } from "@/ui/cards/AnimeCard";
import { IconSearch, IconClose, IconClock } from "@/ui/icons";
import { useSettings } from "@/core/stores/app-store";

const GENRES = ["Action", "Romance", "Fantasy", "Sci-Fi", "Comedy", "Drama", "Horror", "Sports", "Mecha", "Slice of Life", "Mystery", "Psychological"];

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
    setLoading(true);
    
    // CASE A: Search mode (AniList Proxy)
    if (dq.length >= 2) {
      const vars: any = { page: 1, perPage: 24, search: dq };
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
      return;
    }

    // CASE B: Browse mode (Local DB)
    api.browse({ genre: genre || undefined, sort: "score" })
      .then((res) => {
        if (res.success) {
          setResults(res.data.map((m: any) => ({
            id: String(m.anilistId),
            title: m.cleanTitle || m.nativeTitle || "",
            img: m.coverImage,
            score: m.score,
            color: null, // DB doesn't have color yet
            status: m.status,
            seasonYear: m.year,
          })));
        } else {
          setResults([]);
        }
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));

  }, [dq, genre]);

  return (
    <div className="w-full pb-24">
      <div className="pt-10 px-5 md:px-8 mb-4">
        <h1 className="text-3xl font-black text-white">Eksplorasi</h1>
        {!dq && !genre && <p className="text-[#8e8e93] text-[12px] mt-1">Menampilkan katalog perpustakaan lokal</p>}
      </div>

      {/* Search bar + genre filter — sticky */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl px-5 md:px-8 pb-3 border-b border-white/5">
        <div className="relative pt-3">
          <div className="absolute left-4 top-[calc(50%+6px)] -translate-y-1/2 text-[#8e8e93]"><IconSearch /></div>
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="w-full bg-[#1c1c1e] text-white rounded-2xl py-3.5 pl-12 pr-10 outline-none text-[15px] placeholder-[#48484a] border border-white/10 focus:border-[color:var(--accent)] transition-colors" style={{ "--accent": accent } as any} placeholder="Cari judul anime, genre, atau studio..." />
          {query && <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-4 top-[calc(50%+6px)] -translate-y-1/2 w-6 h-6 bg-[#2c2c2e] rounded-full flex items-center justify-center text-[#8e8e93]"><IconClose /></button>}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1 -mx-5 px-5 md:mx-0 md:px-0">
          <button onClick={() => setGenre("")} className={`px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap ${!genre ? "bg-white text-black" : "bg-[#1c1c1e] text-[#8e8e93] border border-white/10"}`}>Semua</button>
          {GENRES.map((g) => (
            <button key={g} onClick={() => setGenre(g === genre ? "" : g)} className={`px-4 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-colors ${genre === g ? "text-white" : "bg-[#1c1c1e] text-[#8e8e93] border border-white/10"}`} style={genre === g ? { backgroundColor: accent } : undefined}>{g}</button>
          ))}
        </div>
      </div>

      <div className="px-5 md:px-8 pt-5">
        {query || genre ? (
          loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {Array.from({ length: 12 }).map((_, i) => <div key={i} className="w-full aspect-[2/3] bg-[#1c1c1e] rounded-2xl animate-pulse" />)}
            </div>
          ) : results.length > 0 ? (
            <div className="anim-fade">
              <p className="text-[#8e8e93] text-[12px] mb-3">{results.length} hasil</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {results.map((a, i) => <AnimeCard key={a.id} id={a.id} title={a.title} img={a.img} score={a.score} color={a.color} />)}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center pt-20 text-center anim-fade">
              <IconSearch className="w-10 h-10 text-[#48484a]" />
              <h3 className="text-white font-black text-lg mt-4">Tidak Ditemukan</h3>
              <p className="text-[#8e8e93] text-sm">Coba kata kunci atau filter lain.</p>
            </div>
          )
        ) : (
          <div className="anim-up">
            {searchHist.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-base font-black text-white">Riwayat Pencarian</h2>
                  <button onClick={() => { saveSearchHist([]); setSearchHist([]); }} className="text-[#8e8e93] text-[11px]">Bersihkan</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchHist.map((t, i) => (
                    <button key={i} onClick={() => setQuery(t)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c1e] rounded-xl border border-white/5 text-[#d1d1d6] text-[12px]">
                      <IconClock className="w-3 h-3" /> {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
