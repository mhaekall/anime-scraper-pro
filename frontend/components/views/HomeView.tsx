"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { HeroCarousel } from "@/components/HeroCarousel";
import { AnimeGrid } from "@/components/AnimeGrid";
import { TopSeriesGrid } from "@/components/TopSeriesGrid";
import { ContinueWatching } from "@/components/ContinueWatching";

const fetcher = (url: string) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://jonyyyyyyyu-anime-scraper-api.hf.space";
  return fetch(`${API_URL}${url}`).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
};

export function HomeView() {
  const { data, error, isLoading } = useSWR('/api/home', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const latestEpisodes = data?.data?.latest_episodes || [];
  const popularSeries = data?.data?.popular_series || [];
  const debugError = error ? `Fetch failed: ${error.message}` : null;

  const heroAnime = latestEpisodes.length > 0 ? latestEpisodes[0] : null;
  const gridAnimes = latestEpisodes.length > 1 ? latestEpisodes.slice(1) : [];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Ohayou';
    if (hour < 18) return 'Konnichiwa';
    return 'Konbanwa';
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[var(--accent)] rounded-full animate-spin shadow-lg mb-4" />
        <h2 className="text-[20px] font-black tracking-tight text-white">Memuat Beranda...</h2>
      </div>
    );
  }

  return (
    <div className="w-full pb-32">
      {debugError && (
        <div className="bg-[#FF453A]/20 border border-[#FF453A] text-[#FF453A] p-4 m-4 rounded-[16px] text-sm">
          <h2 className="font-bold">Backend Connection Error:</h2>
          <pre className="text-xs whitespace-pre-wrap">{debugError}</pre>
        </div>
      )}

      <div className="px-5 md:px-8 mb-6 mt-12 flex justify-between items-end animate-fade-in">
        <div>
          <p className="text-[#8E8E93] text-[13px] font-bold tracking-[0.15em] uppercase mb-1">{getGreeting()}, User</p>
          <h1 className="text-[28px] md:text-[34px] font-black text-white leading-[1.1] tracking-tight">Temukan anime<br/>favorit barumu.</h1>
        </div>
      </div>

      <div className="mb-10">
        {heroAnime && <HeroCarousel anime={heroAnime} />}
      </div>

      <div className="flex flex-col">
        <ContinueWatching />
        <AnimeGrid animes={gridAnimes} title="Rilis Episode Terbaru" />
        <TopSeriesGrid animes={popularSeries} title="Seri Anime Terpopuler" />
      </div>
    </div>
  );
}
