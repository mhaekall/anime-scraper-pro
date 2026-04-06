"use client";

import { useWatchHistory } from "@/hooks/useWatchHistory";
import Link from "next/link";
import { Icons } from "./Icons";
import { useThemeContext } from "./ThemeProvider";

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export function ContinueWatching() {
  const { history, isLoading } = useWatchHistory();
  const { settings } = useThemeContext();

  if (isLoading) {
    return (
      <div className="mb-10 px-5 md:px-8 w-full">
        <h2 className="text-[20px] md:text-[24px] font-black text-white mb-4">Lanjutkan Menonton</h2>
        <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
          {[1, 2, 3].map(i => (
            <div key={i} className="shrink-0 w-[240px] md:w-[280px] aspect-video bg-[#1C1C1E] rounded-[16px] animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const inProgress = history
    .filter(item => !item.completed && item.timestampSec > 0)
    .slice(0, 10);

  if (inProgress.length === 0) return null;

  return (
    <div className="mb-10 px-5 md:px-8 w-full overflow-hidden">
      <h2 className="text-[20px] md:text-[24px] font-black text-white mb-4">Lanjutkan Menonton</h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
        {inProgress.map((item, idx) => {
          const progressPct = item.durationSec > 0
            ? Math.min((item.timestampSec / item.durationSec) * 100, 100)
            : 0;

          return (
            <Link key={`${item.animeSlug}-${item.episode}-${idx}`} href={`/watch/${item.animeSlug}/${item.episode}`} className="min-w-[240px] md:min-w-[280px] snap-center cursor-pointer group animate-fade-in block" style={{ WebkitTapHighlightColor: "transparent" }}>
              <div className="w-full aspect-video rounded-[16px] bg-[#1C1C1E] relative overflow-hidden mb-3 border border-white/5 group-hover:border-white/20 transition-colors shadow-lg">
                {item.animeCover ? (
                  <img src={item.animeCover} className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-500" alt={item.animeTitle} />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#2C2C2E]">
                    <Icons.ImageOff />
                  </div>
                )}
                
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:bg-[var(--accent)] group-hover:border-transparent transition-colors" style={{ '--accent': settings.accentColor } as any}>
                    <Icons.Play />
                  </div>
                </div>
                
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20">
                  <div className="h-full transition-all" style={{ width: `${progressPct}%`, backgroundColor: settings.accentColor }} />
                </div>
              </div>
              <div className="flex justify-between items-start mt-2">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-white font-bold text-[14px] line-clamp-1 group-hover:text-[var(--accent)] transition-colors" style={{ '--accent': settings.accentColor } as any}>{item.animeTitle}</h3>
                  <p className="text-[#8E8E93] text-[12px] mt-0.5">{formatTime(item.timestampSec)} / {formatTime(item.durationSec)}</p>
                </div>
                <div className="flex-shrink-0 px-2 py-1 bg-white/10 rounded border border-white/5 text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1 group-hover:bg-white/20 transition-colors">
                  <Icons.Play cls="w-2.5 h-2.5" /> Lanjut Eps {item.episode}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
