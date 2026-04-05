"use client";

import { useState } from "react";
import Link from "next/link";
import { PlayCircle, ArrowDownUp } from "lucide-react";

interface Episode {
  title: string;
  url: string;
}

interface EpisodeListProps {
  episodes: Episode[];
  animeId: string;
}

export function EpisodeList({ episodes, animeId }: EpisodeListProps) {
  const [isReversed, setIsReversed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50); // initial load limit

  if (!episodes || episodes.length === 0) {
    return (
      <div className="glass-panel p-12 text-center rounded-3xl text-zinc-500 font-medium flex flex-col items-center justify-center gap-4">
        <PlayCircle className="w-12 h-12 opacity-20" />
        Mencari daftar episode di server...
      </div>
    );
  }

  // Oploverz typically returns oldest first or newest first, let's just reverse the array based on state
  const displayEpisodes = isReversed ? [...episodes].reverse() : episodes;
  const currentView = displayEpisodes.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <button 
          onClick={() => setIsReversed(!isReversed)}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-white/10 hover:bg-white/10 rounded-full text-sm font-medium text-white/80 transition-colors"
        >
          <ArrowDownUp className="w-4 h-4" />
          Urutkan: {isReversed ? "Lama ke Baru" : "Terbaru ke Lama"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {currentView.map((ep, idx) => {
            const cleanUrl = ep.url.replace(/\/$/, '');
            const epId = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);

            return (
              <div
                key={`ep-${epId}-${idx}`}
                className="animate-in fade-in zoom-in-95 duration-200"
              >
                <Link href={`/watch/${animeId}/${epId}`}>
                  <div className="glass-panel group flex flex-col justify-center gap-2 overflow-hidden rounded-2xl p-3 sm:p-4 transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 hover:shadow-[0_10px_20px_rgba(59,130,246,0.15)] border border-white/5 hover:border-blue-500/30">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white/90 group-hover:text-white transition-colors text-sm sm:text-base line-clamp-1">{ep.title}</span>
                      <PlayCircle className="h-5 w-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
      </div>

      {visibleCount < episodes.length && (
        <div className="flex justify-center mt-4">
          <button 
            onClick={() => setVisibleCount(prev => prev + 50)}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95"
          >
            Muat Lebih Banyak ({episodes.length - visibleCount} tersisa)
          </button>
        </div>
      )}
    </div>
  );
}
