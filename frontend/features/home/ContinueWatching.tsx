// features/home/ContinueWatching.tsx — Local-first continue watching strip

"use client";

import { memo } from "react";
import Link from "next/link";
import { IconPlay } from "@/ui/icons";
import { useWatchHistory } from "@/core/hooks/use-watch-history";
import { useSettings } from "@/core/stores/app-store";

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
};

function ContinueWatchingInner() {
  const { history, isLoading } = useWatchHistory();
  const accent = useSettings((s) => s.settings.accentColor);

  if (isLoading) return (
    <div className="mb-8 px-5 md:px-8">
      <h2 className="text-lg font-black text-white mb-3">Lanjutkan Menonton</h2>
      <div className="flex gap-4 overflow-x-auto no-scrollbar">
        {[1, 2, 3].map((i) => <div key={i} className="shrink-0 w-[220px] aspect-video bg-[#1c1c1e] rounded-2xl animate-pulse" />)}
      </div>
    </div>
  );

  const inProgress = history.filter((h) => !h.completed && h.timestampSec > 0).slice(0, 8);
  if (inProgress.length === 0) return null;

  return (
    <section className="mb-8 px-5 md:px-8 overflow-hidden">
      <h2 className="text-lg font-black text-white mb-3">Lanjutkan Menonton</h2>
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ WebkitOverflowScrolling: "touch" }}>
        {inProgress.map((item, i) => {
          const pct = item.durationSec > 0 ? Math.min((item.timestampSec / item.durationSec) * 100, 100) : 0;
          return (
            <Link key={`${item.animeSlug}-${item.episode}-${i}`} href={`/watch/${item.animeSlug}/${item.episode}`} className="min-w-[220px] md:min-w-[260px] snap-center group anim-fade block">
              <div className="w-full aspect-video rounded-2xl bg-[#1c1c1e] relative overflow-hidden mb-2 border border-white/5 group-hover:border-white/15 transition-colors">
                {item.animeCover && <img src={item.animeCover} className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" alt="" loading="lazy" decoding="async" />}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-11 h-11 rounded-full bg-black/50 flex items-center justify-center border border-white/20 text-white group-hover:border-transparent transition-colors" style={{ backgroundColor: `${accent}80` }}><IconPlay className="w-4 h-4 ml-0.5" /></div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20"><div className="h-full" style={{ width: `${pct}%`, backgroundColor: accent }} /></div>
              </div>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-[13px] line-clamp-1">{item.animeTitle}</h3>
                  <p className="text-[#8e8e93] text-[11px]">{fmt(item.timestampSec)} / {fmt(item.durationSec)}</p>
                </div>
                <span className="shrink-0 px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold text-white flex items-center gap-1"><IconPlay className="w-2.5 h-2.5" /> Eps {item.episode}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export const ContinueWatching = memo(ContinueWatchingInner);
