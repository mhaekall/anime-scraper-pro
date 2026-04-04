"use client";

import { useState } from "react";
import { AnimeCard } from "./AnimeCard";

interface LibraryGridProps {
  animes: any[];
}

export function LibraryGrid({ animes }: LibraryGridProps) {
  const [search, setSearch] = useState("");

  if (!animes || animes.length === 0) return null;

  const filtered = animes.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="flex flex-col gap-6 w-full">
      
      {/* Search Bar */}
      <div className="relative w-full max-w-xl mx-auto mb-6">
        <input 
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari dari A-Z..."
          className="w-full bg-zinc-900 border border-white/10 rounded-full px-6 py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-xl transition-all"
        />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-zinc-500">
          <span className="text-xs font-bold px-2 py-1 bg-zinc-800 rounded-md border border-white/5">{filtered.length} Hasil</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
        {filtered.map((anime: any, idx: number) => {
          const cleanUrl = (anime.url || '').replace(/\/$/, '');
          const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);

          return (
            <AnimeCard key={id + idx} anime={anime} id={id} idx={idx} />
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="w-full py-20 text-center text-zinc-500 font-medium">
          Tidak ada anime yang cocok dengan kata kunci "{search}".
        </div>
      )}
    </section>
  );
}
