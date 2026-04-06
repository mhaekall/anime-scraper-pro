"use client";

import { AnimeCard } from "./AnimeCard";
import { Icons } from "./Icons";
import { useThemeContext } from "./ThemeProvider";

interface AnimeGridProps {
  animes: any[];
  title: string;
  showRank?: boolean;
}

export function AnimeGrid({ animes, title, showRank = false }: AnimeGridProps) {
  const { settings } = useThemeContext();

  if (!animes || animes.length === 0) return null;

  return (
    <div className="mb-8 md:mb-10 w-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-5 md:px-8">
        <h2 className="text-[20px] md:text-[24px] font-black text-white tracking-tight">{title}</h2>
        <button className="text-[var(--accent)] text-[13px] md:text-[14px] font-bold active:opacity-70 transition-opacity flex items-center gap-1" style={{ '--accent': settings.accentColor } as any}>
          Lihat Semua <Icons.ChevronRight />
        </button>
      </div>
      
      <div className="flex gap-3 md:gap-5 overflow-x-auto pb-6 snap-x snap-mandatory hide-scrollbar px-5 md:px-8" style={{ WebkitOverflowScrolling: "touch" }}>
        {animes.map((anime: any, idx: number) => {
          const cleanUrl = (anime.url || '').replace(/\/$/, '');
          const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);

          const cleanEpUrl = (anime.episodeUrl || '').replace(/\/$/, '');
          const epId = cleanEpUrl.substring(cleanEpUrl.lastIndexOf('/') + 1);

          return (
            <div key={id + idx} className="snap-start flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px]">
              <AnimeCard anime={anime} id={id} idx={idx} epId={epId} showRank={showRank} rankIndex={idx + 1} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
