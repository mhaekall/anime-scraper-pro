"use client";

import { useState } from "react";
import { AnimeCard } from "./AnimeCard";
import { Icons } from "./Icons";
import { useThemeContext } from "./ThemeProvider";

interface LibraryGridProps {
  animes: any[];
}

export function LibraryGrid({ animes }: LibraryGridProps) {
  const { settings, searchHistory, addSearchHistory, clearSearchHistory } = useThemeContext();
  const [search, setSearch] = useState("");

  if (!animes || animes.length === 0) return null;

  const filtered = animes.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto hide-scrollbar pb-32">
      <div className="sticky top-0 z-20 bg-[#000000]/90 backdrop-blur-xl pt-12 px-5 md:px-8 pb-4 border-b border-white/5">
        <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight mb-5">Eksplorasi</h1>
        
        {/* Advanced Search Input */}
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93] group-focus-within:text-[var(--accent)] transition-colors" style={{ '--accent': settings.accentColor } as any}><Icons.Search /></div>
          <input 
            type="text" 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            onBlur={() => { if(search) addSearchHistory(search); }}
            className="w-full bg-[#1C1C1E] text-white rounded-[20px] py-4 pl-12 pr-12 outline-none text-[16px] placeholder-[#48484A] border border-white/10 focus:border-[var(--accent)] transition-colors shadow-inner" 
            style={{ '--accent': settings.accentColor } as any}
            placeholder="Cari judul anime..." 
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#2C2C2E] rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white"><Icons.Close /></button>}
        </div>
      </div>

      <div className="px-5 md:px-8 pt-6">
        {search ? (
          filtered.length > 0 ? (
            <div className="animate-fade-in">
              <p className="text-[#8E8E93] text-[13px] font-medium mb-4">Menemukan {filtered.length} hasil</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5" style={{ WebkitTapHighlightColor: "transparent" }}>
                {filtered.map((anime: any, idx: number) => {
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
              <p className="text-[#8E8E93] text-[14px]">Coba gunakan kata kunci lain.</p>
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
                    <button key={i} onClick={() => setSearch(term)} className="flex items-center gap-2 px-4 py-2 bg-[#1C1C1E] rounded-[12px] border border-white/5 text-[#D1D1D6] text-[13px] hover:bg-[#2C2C2E] transition-colors">
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
            
            {/* Show some random animes if not searching */}
            <h2 className="text-[18px] font-black text-white mb-4">Mungkin Anda Suka</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5">
                {animes.slice(0, 12).map((anime: any, idx: number) => {
                  const cleanUrl = (anime.url || '').replace(/\/$/, '');
                  const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
                  return <AnimeCard key={id + idx} anime={anime} id={id} idx={idx} />;
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
