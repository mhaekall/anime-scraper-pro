"use client";

import { useState, useEffect } from "react";
import { AnimeCard } from "./AnimeCard";
import { Icons } from "./Icons";
import { useThemeContext } from "./ThemeProvider";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const SEARCH_ADVANCED = `
  query ($search: String, $page: Int, $perPage: Int, $genres: [String], $year: Int, $sort: [MediaSort]) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(search: $search, type: ANIME, genre_in: $genres, seasonYear: $year, sort: $sort) {
        id title { romaji english native } coverImage { extraLarge large color } bannerImage
        episodes averageScore genres status format seasonYear duration
      }
    }
  }
`;

const fetchAniList = async (query: string, variables = {}) => {
  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
      console.warn(`AniList API Error: HTTP ${response.status}`);
      return { error: true, status: response.status };
    }
    const json = await response.json();
    if (json.errors) {
      console.warn("AniList API GraphQL Error:", json.errors[0].message);
      return { error: true, status: 400 };
    }
    return json.data;
  } catch (error) {
    console.error("AniList API Network Error:", error);
    return { error: true, status: 500 };
  }
};

interface LibraryGridProps {
  animes: any[];
}

export function LibraryGrid({ animes }: LibraryGridProps) {
  const { settings, searchHistory, addSearchHistory, clearSearchHistory, addToast } = useThemeContext();
  const [query, setQuery] = useState('');
  const dq = useDebounce(query, 800); // 800ms debounce for API
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const GENRES = ['Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Comedy', 'Drama', 'Horror', 'Sports', 'Mecha', 'Slice of Life', 'Mystery', 'Psychological'];

  useEffect(() => {
    const fetchSearch = async () => {
      if (dq.length < 2 && !activeFilter) { 
        setResults([]); 
        setApiError(null);
        return; 
      }
      setLoading(true);
      setApiError(null);
      const vars: any = { page: 1, perPage: 24 };
      if (dq) vars.search = dq;
      if (activeFilter) vars.genres = [activeFilter];
      
      const data = await fetchAniList(SEARCH_ADVANCED, vars);
      
      if (data?.error) {
        setResults([]);
        if (data.status === 429) {
          setApiError("Terlalu banyak permintaan (Rate Limit). Mohon tunggu sebentar.");
          addToast("Server AniList kelebihan beban. Tunggu 1 menit.", "error");
        } else {
          setApiError("Gagal mengambil data dari AniList.");
        }
      } else if (data && data.Page) {
        const mapped = data.Page.media.map((m: any) => ({
          title: m.title.english || m.title.romaji || m.title.native,
          img: m.coverImage.extraLarge || m.coverImage.large,
          banner: m.bannerImage,
          score: m.averageScore,
          color: m.coverImage.color,
          episodes: m.episodes,
          status: m.status,
          format: m.format,
          genres: m.genres,
          duration: m.duration,
          seasonYear: m.seasonYear,
          url: `/search?q=${encodeURIComponent(m.title.english || m.title.romaji)}` // Pseudo-URL
        }));
        setResults(mapped);
      } else {
        setResults([]);
      }
      
      setLoading(false);
      if (dq && data?.Page?.media?.length > 0) addSearchHistory(dq);
    };
    fetchSearch();
  }, [dq, activeFilter, addSearchHistory, addToast]);

  return (
    <div className="h-full overflow-y-auto hide-scrollbar pb-32">
      <div className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-xl pt-12 px-5 md:px-8 pb-4 border-b border-white/5">
        <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight mb-5">Eksplorasi</h1>
        
        {/* Advanced Search Input */}
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93] group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': settings.accentColor } as any}><Icons.Search /></div>
          <input 
            type="text" 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-[#1C1C1E] text-white rounded-[20px] py-4 pl-12 pr-12 outline-none text-[16px] placeholder-[#48484A] border border-white/10 focus:border-[var(--accent)] transition-colors shadow-inner" 
            style={{ '--accent': settings.accentColor } as any}
            placeholder="Cari judul anime, genre, atau studio..." 
          />
          {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#2C2C2E] rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white"><Icons.Close /></button>}
        </div>

        {/* Genre Filters (Horizontal Scroll) */}
        {!query && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar mt-5 pb-1 -mx-5 px-5 md:mx-0 md:px-0">
            <button onClick={() => setActiveFilter('')} className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${!activeFilter ? 'bg-white text-black' : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/10 hover:bg-[#2C2C2E]'}`}>Semua</button>
            {GENRES.map(g => (
              <button key={g} onClick={() => setActiveFilter(g)} className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-all ${activeFilter === g ? 'bg-[var(--accent)] text-white' : 'bg-[#1C1C1E] text-[#8E8E93] border border-white/10 hover:bg-[#2C2C2E]'}`} style={{ '--accent': settings.accentColor } as any}>{g}</button>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 md:px-8 pt-6">
        {query || activeFilter ? (
          loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="w-full aspect-[2/3] bg-[#1C1C1E] rounded-[16px] animate-pulse border border-white/5" />
              ))}
            </div>
          ) : apiError ? (
            <div className="flex flex-col items-center justify-center pt-20 text-center animate-fade-in">
              <Icons.Info />
              <h3 className="text-[#FF453A] font-black text-[20px] mt-4 mb-2">Terjadi Kesalahan</h3>
              <p className="text-[#8E8E93] text-[14px]">{apiError}</p>
            </div>
          ) : results.length > 0 ? (
            <div className="animate-fade-in">
              <p className="text-[#8E8E93] text-[13px] font-medium mb-4">Menemukan {results.length} hasil</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5" style={{ WebkitTapHighlightColor: "transparent" }}>
                {results.map((anime: any, idx: number) => {
                  const cleanUrl = (anime.url || '').replace(/\/$/, '');
                  const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
                  return <AnimeCard key={id + idx} anime={anime} id={id} idx={idx} />;
                })}
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
          <div className="animate-slide-up" style={{ WebkitTapHighlightColor: "transparent" }}>
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
                { t: "Pemenang Anime Awards 2024", q: "Frieren", img: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/154587-nNgE6mD0r6vM.jpg", color: "#FFD60A" },
                { t: "Masterpiece Studio MAPPA", q: "Jujutsu Kaisen", img: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/145064-1S0e047W4Tus.jpg", color: "#FF453A" },
                { t: "Isekai Reinkarnasi Overpower", q: "Tensei shitara Slime", img: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/108465-RgsMpKMZQaSm.jpg", color: "#BF5AF2" },
                { t: "Romansa Bikin Baper", q: "Kaguya-sama", img: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/114535-1L6oW3Xp2aFm.jpg", color: "#FF375F" }
              ].map((c, i) => (
                <div key={i} onClick={() => setQuery(c.q)} className="h-[120px] rounded-[20px] relative overflow-hidden group cursor-pointer border border-white/10 bg-[#1C1C1E]">
                  <img src={c.img} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 z-0" alt={c.t} loading="lazy" />
                  <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors z-10" />
                  <div className="absolute inset-y-0 left-0 w-3/4 opacity-80 mix-blend-overlay pointer-events-none z-10" style={{ background: `linear-gradient(to right, ${c.color}, transparent)` }} />
                  <h3 className="absolute bottom-4 left-5 right-5 text-white font-black text-[18px] leading-tight drop-shadow-md z-20">{c.t}</h3>
                </div>
              ))}
            </div>

            {/* Show some random animes if not searching */}
            {animes && animes.length > 0 && (
              <>
                <h2 className="text-[18px] font-black text-white mb-4">Mungkin Anda Suka</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5 pb-10">
                    {animes.slice(0, 18).map((anime: any, idx: number) => {
                      const cleanUrl = (anime.url || '').replace(/\/$/, '');
                      const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
                      return <AnimeCard key={id + idx} anime={anime} id={id} idx={idx} />;
                    })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
