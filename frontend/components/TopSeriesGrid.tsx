"use client";

import { AnimeGrid } from "./AnimeGrid";

interface TopSeriesGridProps {
  animes: any[];
  title: string;
}

export function TopSeriesGrid({ animes, title }: TopSeriesGridProps) {
  if (!animes || animes.length === 0) return null;

  return (
    <AnimeGrid animes={animes} title={title} showRank={true} />
  );
}
