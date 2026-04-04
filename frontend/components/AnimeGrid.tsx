"use client";

import { AnimeCard } from "./AnimeCard";

interface AnimeGridProps {
  animes: any[];
  title: string;
}

export function AnimeGrid({ animes, title }: AnimeGridProps) {
  if (!animes || animes.length === 0) return null;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white/90">
          {title}
        </h2>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
        {animes.map((anime: any, idx: number) => {
          const cleanUrl = (anime.url || '').replace(/\/$/, '');
          const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);

          const cleanEpUrl = (anime.episodeUrl || '').replace(/\/$/, '');
          const epId = cleanEpUrl.substring(cleanEpUrl.lastIndexOf('/') + 1);

          return (
            <AnimeCard key={id + idx} anime={anime} id={id} idx={idx} epId={epId} />
          );
        })}
      </div>
    </section>
  );
}