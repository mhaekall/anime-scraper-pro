"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "./Icons";
import { useThemeContext } from "./ThemeProvider";
import { useWatchHistory } from "@/hooks/useWatchHistory";

interface Episode {
  title: string;
  url: string;
}

interface EpisodeListProps {
  episodes: Episode[];
  animeId: string;
  coverImage?: string;
}

export function EpisodeList({ episodes, animeId, coverImage }: EpisodeListProps) {
  const [isReversed, setIsReversed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const { settings } = useThemeContext();
  const { history } = useWatchHistory();

  if (!episodes || episodes.length === 0) {
    return (
      <div className="bg-[#1C1C1E] p-12 text-center rounded-[24px] text-[#8E8E93] font-medium flex flex-col items-center justify-center gap-4 border border-white/5">
        <Icons.Play cls="w-12 h-12 opacity-20" />
        Belum ada episode yang tersedia.
      </div>
    );
  }

  const displayEpisodes = isReversed ? [...episodes].reverse() : episodes;
  const currentView = displayEpisodes.slice(0, visibleCount);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-bold text-[18px]">{episodes.length} Episode</h3>
          <span className="text-[#8E8E93] text-[13px] font-medium bg-[#1C1C1E] px-2 py-1 rounded-md border border-white/5">Oploverz</span>
        </div>
        <button 
          onClick={() => setIsReversed(!isReversed)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#1C1C1E] border border-white/10 hover:bg-[#2C2C2E] rounded-[10px] text-[12px] font-bold text-white transition-colors active:scale-95"
        >
          <Icons.ArrowDownUp />
          {isReversed ? "Lama - Baru" : "Baru - Lama"}
        </button>
      </div>

      <div className="flex flex-col gap-3">
          {currentView.map((ep, idx) => {
            const cleanUrl = ep.url.replace(/\/$/, '');
            const epId = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
            
            // Check history
            const watchedEp = history.find(h => h.animeSlug === animeId && h.episode.toString() === epId);
            const isCompleted = watchedEp?.completed;
            const progressPct = watchedEp && watchedEp.durationSec > 0 ? (watchedEp.timestampSec / watchedEp.durationSec) * 100 : 0;

            return (
              <Link key={`ep-${epId}-${idx}`} href={`/watch/${animeId}/${epId}`} className="group block" style={{ WebkitTapHighlightColor: "transparent" }}>
                <div className="flex gap-4 p-3 rounded-[16px] transition-all duration-300 bg-[#1C1C1E]/50 hover:bg-[#2C2C2E] border border-transparent hover:border-white/10 active:scale-[0.98]">
                  
                  {/* Thumbnail / Cover */}
                  <div className="w-[120px] md:w-[140px] aspect-video rounded-[10px] bg-[#2C2C2E] relative overflow-hidden flex-shrink-0 border border-white/5">
                    {coverImage && coverImage !== "" && <img src={coverImage} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" alt="" />}
                    
                    {/* Status Overlays */}
                    {isCompleted && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Icons.Check cls="w-6 h-6 text-white" />
                      </div>
                    )}
                    {!isCompleted && progressPct > 0 && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
                        <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${progressPct}%`, '--accent': settings.accentColor } as any} />
                      </div>
                    )}
                    
                    {/* Hover Play Icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white border border-white/20">
                        <Icons.Play cls="w-4 h-4 ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                    <p className={`text-[14px] md:text-[15px] font-bold line-clamp-2 leading-snug mb-1 transition-colors ${watchedEp ? 'text-[#8E8E93]' : 'text-[#E5E5EA] group-hover:text-white'}`}>{ep.title}</p>
                    <p className="text-[#8E8E93] text-[12px] font-medium">Episode {epId.replace(/-/g, ' ')}</p>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>

      {visibleCount < episodes.length && (
        <button 
          onClick={() => setVisibleCount(prev => prev + 50)}
          className="w-full py-4 mt-2 bg-[#1C1C1E] hover:bg-[#2C2C2E] border border-white/10 text-white rounded-[16px] font-bold transition-all active:scale-95"
        >
          Muat Lebih Banyak ({episodes.length - visibleCount} tersisa)
        </button>
      )}
    </div>
  );
}
