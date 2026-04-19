// features/home/ContinueWatching.tsx — Apple Glassmorphism Style

"use client";

import { memo } from "react";
import Link from "next/link";
import { IconPlay } from "@/ui/icons";
import { useWatchHistory } from "@/core/hooks/use-watch-history";

const fmt = (s: number) => {
  if (!s) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
};

function ContinueWatchingInner({ userId }: { userId?: string }) {
  const { history, isLoading } = useWatchHistory(userId);
  const accent = "#0A84FF";

  if (isLoading) return (
    <div className="mb-8 px-6 md:px-10">
      <h2 className="text-[20px] font-black text-white tracking-tight mb-4">Lanjutkan Menonton</h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shrink-0 w-[240px] md:w-[280px] aspect-video bg-[#1c1c1e] rounded-[22px] animate-pulse border border-white/5" />
        ))}
      </div>
    </div>
  );

  // In-progress episodes that haven't been completed yet
  const inProgress = history
    .filter((h) => !h.completed && h.timestampSec > 5)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  if (inProgress.length === 0) return null;

  return (
    <section className="mb-8 px-6 md:px-10 overflow-hidden anim-fade-up">
      <h2 className="text-[20px] font-black text-white tracking-tight mb-4">Lanjutkan Menonton</h2>
      <div className="flex gap-5 overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
        {inProgress.map((item, i) => {
          const pct = item.durationSec > 0 ? Math.min((item.timestampSec / item.durationSec) * 100, 100) : 0;
          return (
            <Link 
              key={`${item.anilistId}-${item.episode}-${i}`} 
              href={`/watch/${item.anilistId}/${item.episode}`} 
              className="min-w-[240px] md:min-w-[300px] snap-start group block"
            >
              {/* Card — HIG: Glassmorphism / Large Rounded Corners */}
              <div className="w-full aspect-video rounded-[22px] bg-[#1c1c1e] relative overflow-hidden mb-3 border border-white/[0.08] group-hover:border-white/[0.18] transition-all duration-300 shadow-lg">
                <img 
                  src={item.animeCover || `https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx${item.anilistId}.jpg`} 
                  className="w-full h-full object-cover opacity-60 group-hover:scale-[1.03] group-hover:opacity-80 transition-all duration-700 ease-out" 
                  alt="" 
                  loading="lazy"
                  onError={(e) => { e.currentTarget.src = "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg"; }}
                />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-2xl">
                    <IconPlay className="w-4 h-4 ml-0.5 fill-current" />
                  </div>
                </div>

                {/* Progress Bar — HIG Style */}
                <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/40 backdrop-blur-sm">
                  <div 
                    className="h-full bg-[#0A84FF] shadow-[0_0_10px_#0A84FF] transition-all duration-500" 
                    style={{ width: `${pct}%` }} 
                  />
                </div>

                {/* Episode Badge */}
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-black text-white tracking-wider uppercase">
                  Eps {item.episode}
                </div>
              </div>

              <div className="flex justify-between items-start px-1">
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-[14px] leading-tight tracking-tight line-clamp-1 group-hover:text-[#0A84FF] transition-colors">
                    {item.animeTitle || `Anime #${item.anilistId}`}
                  </h3>
                  <p className="text-[#8e8e93] text-[11px] font-medium tracking-tight mt-0.5">
                    Tersisa {fmt(item.durationSec - item.timestampSec)}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export const ContinueWatching = memo(ContinueWatchingInner);
