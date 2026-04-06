"use client";

import { useWatchHistory } from "@/hooks/useWatchHistory";
import Link from "next/link";
import { PlayCircle, Clock } from "lucide-react";

export function ContinueWatching() {
  const { history, isLoading } = useWatchHistory();

  if (isLoading) {
    return (
      <section className="flex flex-col gap-6 w-full mt-4 mb-8">
        <div className="flex items-center gap-2">
          <Clock className="text-blue-500 w-6 h-6" />
          <h2 className="text-2xl font-bold text-white/90">Melanjutkan Tontonan</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="shrink-0 w-[280px] aspect-video bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (history.length === 0) return null;

  const inProgress = history
    .filter(item => !item.completed && item.timestampSec > 0)
    .slice(0, 10);

  if (inProgress.length === 0) return null;

  return (
    <section className="flex flex-col gap-6 w-full mt-4 mb-8">
      <div className="flex items-center gap-2">
        <Clock className="text-blue-500 w-6 h-6" />
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white/90">
          Melanjutkan Tontonan
        </h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {inProgress.map((item, idx) => {
          const progressPct = item.durationSec > 0
            ? Math.min((item.timestampSec / item.durationSec) * 100, 100)
            : 0;

          return (
            <div key={`${item.animeSlug}-${item.episode}-${idx}`}
              className="snap-start shrink-0 w-[280px] sm:w-[320px] animate-in fade-in slide-in-from-left-4 duration-500 fill-mode-both"
              style={{ animationDelay: `${idx * 100}ms` }}>
              <Link href={`/watch/${item.animeSlug}/${item.episode}`}
                className="group relative flex flex-col gap-3">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 group-hover:ring-blue-500/50 transition-all">
                  {item.animeCover ? (
                    <img src={item.animeCover} alt={item.animeTitle}
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                      <PlayCircle className="w-12 h-12 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                  
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
                    <div className="h-full bg-blue-500 transition-all"
                      style={{ width: `${progressPct}%` }} />
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white line-clamp-1">{item.animeTitle}</span>
                      <span className="text-xs text-blue-400 font-medium">
                        Eps {item.episode} • {Math.floor(item.timestampSec / 60)}m tersisa
                      </span>
                    </div>
                    <div className="p-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      <PlayCircle className="w-4 h-4" fill="currentColor" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}