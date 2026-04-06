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

const ANILIST_URL = 'https://graphql.anilist.co';
const HOME_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int) {
    trending: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: TRENDING_DESC) { id title { romaji english native } coverImage { extraLarge large color } bannerImage description episodes averageScore genres status seasonYear season format duration }
    }
    season: Page(page: 1, perPage: 12) {
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) { id title { romaji english native } coverImage { extraLarge large color } bannerImage description episodes averageScore genres status seasonYear season format duration }
    }
    popular: Page(page: 1, perPage: 12) {
      media(type: ANIME, sort: POPULARITY_DESC) { id title { romaji english native } coverImage { extraLarge large color } bannerImage description episodes averageScore genres status seasonYear season format duration }
    }
    upcoming: Page(page: 1, perPage: 12) {
      media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) { id title { romaji english native } coverImage { extraLarge large color } bannerImage description episodes averageScore genres status seasonYear season format duration }
    }
  }
`;

const fetchAniList = (url: string) => fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
  body: JSON.stringify({ query: HOME_QUERY, variables: { season: 'SPRING', seasonYear: 2025 } })
}).then(res => {
  if (!res.ok) {
    if (res.status === 429) {
      console.warn("AniList API Rate Limit (429) - using cached or empty data");
      return { error: true, status: 429 };
    }
    throw new Error(`AniList Error: ${res.status}`);
  }
  return res.json();
});

export function HomeView() {
  const { data: oploverzData, error, isLoading } = useSWR('/api/home', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const { data: anilistData } = useSWR('/api/anilist', fetchAniList, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });

  const latestEpisodes = oploverzData?.data?.latest_episodes || [];
  const popularSeries = oploverzData?.data?.popular_series || [];
  const debugError = error ? `Fetch failed: ${error.message}` : null;

  const heroAnimes = latestEpisodes.slice(0, 6);
  const gridAnimes = latestEpisodes.slice(6);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Ohayou';
    if (hour < 18) return 'Konnichiwa';
    return 'Konbanwa';
  };

  // Convert AniList objects to compatible format for AnimeGrid
  const mapAniList = (media: any[]) => {
    if (!media) return [];
    return media.map(m => ({
      title: m.title.english || m.title.romaji,
      img: m.coverImage.extraLarge || m.coverImage.large,
      score: m.averageScore,
      color: m.coverImage.color,
      url: `/search?q=${encodeURIComponent(m.title.english || m.title.romaji)}` // Pseudo-URL for dummy click
    }));
  };

  const trending = mapAniList(anilistData?.data?.trending?.media);
  const season = mapAniList(anilistData?.data?.season?.media);
  const upcoming = mapAniList(anilistData?.data?.upcoming?.media);
  const popular = mapAniList(anilistData?.data?.popular?.media);

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
        {heroAnimes.length > 0 && <HeroCarousel animes={heroAnimes} />}
      </div>

      <div className="flex flex-col gap-2">
        <ContinueWatching />
        
        {season.length > 0 && <AnimeGrid animes={season} title="Populer Musim Ini" />}
        {trending.length > 6 && <AnimeGrid animes={trending.slice(6)} title="Sedang Trending" showRank />}
        
        <AnimeGrid animes={gridAnimes} title="Rilis Episode Terbaru" />
        <TopSeriesGrid animes={popularSeries} title="Seri Anime Terpopuler (Oploverz)" />
        
        {upcoming.length > 0 && <AnimeGrid animes={upcoming} title="Rilis Mendatang" />}
        {popular.length > 0 && <AnimeGrid animes={popular} title="Top Sepanjang Masa" />}
      </div>
    </div>
  );
}
