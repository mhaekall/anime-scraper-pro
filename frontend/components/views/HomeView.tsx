/**
 * HomeView.tsx — FIXED version
 *
 * The old version mapped AniList trending/popular results with
 *   url: `/anime/${m.id}`
 * but then AnimeCard extracted the last path segment as ID and used it as
 * an oploverz slug.  `m.id` is a numeric AniList ID like 21, which is not
 * a valid oploverz slug, causing broken detail pages.
 *
 * Fix: always use anilistId as the route ID.  The detail page (/anime/[id])
 * now calls /api/v2/anime/{anilistId} which reads from our DB (which knows
 * the provider mapping) instead of hitting oploverz directly.
 *
 * For the "Latest Episodes" section (from the Oploverz scrape) we still
 * derive the ID from the oploverz URL, but we additionally try to find the
 * anilistId from our DB mapping so we can link to the canonical route.
 */

"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { HeroCarousel }    from "@/components/HeroCarousel";
import { AnimeGrid }       from "@/components/AnimeGrid";
import { TopSeriesGrid }   from "@/components/TopSeriesGrid";
import { ContinueWatching } from "@/components/ContinueWatching";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://jonyyyyyyyu-anime-scraper-api.hf.space";

const apiFetcher = (url: string) =>
  fetch(`${API_URL}${url}`).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

// ── AniList query ──────────────────────────────────────────────────────────────

const HOME_QUERY = `
  query ($season: MediaSeason, $seasonYear: Int) {
    trending: Page(page: 1, perPage: 15) {
      media(type: ANIME, sort: TRENDING_DESC) {
        id title { romaji english native }
        coverImage { extraLarge large color }
        bannerImage averageScore episodes status seasonYear season
        nextAiringEpisode { airingAt episode }
      }
    }
    season: Page(page: 1, perPage: 12) {
      media(type: ANIME, season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC) {
        id title { romaji english native }
        coverImage { extraLarge large color }
        averageScore status seasonYear
      }
    }
    popular: Page(page: 1, perPage: 12) {
      media(type: ANIME, sort: POPULARITY_DESC) {
        id title { romaji english native }
        coverImage { extraLarge large color }
        averageScore status seasonYear
      }
    }
    upcoming: Page(page: 1, perPage: 12) {
      media(type: ANIME, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) {
        id title { romaji english native }
        coverImage { extraLarge large color }
        averageScore status
      }
    }
  }
`;

const anilistFetcher = (url: string) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: HOME_QUERY,
      variables: { season: "SPRING", seasonYear: 2025 },
    }),
  }).then(r => {
    if (r.status === 429) return null;   // rate limit — use cached data
    if (!r.ok) throw new Error(`AniList ${r.status}`);
    return r.json();
  });

// ── helper: map AniList media → AnimeCard-compatible shape ────────────────────
//
// KEY FIX: url is now `/anime/${m.id}` where m.id is the anilistId.
// AnimeCard extracts the last path segment as `id`, which becomes the route
// param.  /anime/[id]/page.tsx handles numeric ids via /api/v2/anime/{id}.

function mapAnilistMedia(media: any[]): any[] {
  if (!media) return [];
  return media.map(m => ({
    // Canonical ID = AniList numeric ID
    id:    String(m.id),
    title: m.title?.english ?? m.title?.romaji ?? m.title?.native,
    img:   m.coverImage?.extraLarge ?? m.coverImage?.large,
    score: m.averageScore,
    color: m.coverImage?.color,
    nextAiringEpisode: m.nextAiringEpisode,
    url:   `/anime/${m.id}`,     // ← uses anilistId, not oploverz slug
  }));
}

// ── component ──────────────────────────────────────────────────────────────────

export function HomeView() {
  const { data: homeV2Data, error, isLoading } = useSWR("/api/v2/home", apiFetcher, {
    revalidateOnFocus:  false,
    dedupingInterval:   60_000,
  });

  const { data: anilistData } = useSWR("/api/anilist", anilistFetcher, {
    revalidateOnFocus:  false,
    dedupingInterval:   300_000,
  });

  // Data from our own verified DB (datacenter)
  const heroAnimes     = homeV2Data?.data?.hero    ?? [];
  const latestEpisodes = homeV2Data?.data?.latest  ?? [];
  const popularInDB    = homeV2Data?.data?.popular ?? [];

  const debugError     = error ? `Backend error: ${error.message}` : null;

  // Fallback data from AniList (for sections that don't need episodes yet)
  const trending = mapAnilistMedia(anilistData?.data?.trending?.media);
  const season   = mapAnilistMedia(anilistData?.data?.season?.media);
  const upcoming = mapAnilistMedia(anilistData?.data?.upcoming?.media);
  const popular  = mapAnilistMedia(anilistData?.data?.popular?.media);

  // Latest Episodes in Grid — use verified data from DB
  const gridAnimes = latestEpisodes;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Ohayou";
    if (h < 18) return "Konnichiwa";
    return "Konbanwa";
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[var(--accent)] rounded-full animate-spin mb-4" />
        <h2 className="text-[20px] font-black text-white">Memuat Beranda…</h2>
      </div>
    );
  }

  return (
    <div className="w-full pb-32">
      {debugError && (
        <div className="bg-[#FF453A]/20 border border-[#FF453A] text-[#FF453A] p-4 m-4 rounded-[16px] text-sm">
          <strong>Backend Error:</strong>
          <pre className="text-xs mt-1 whitespace-pre-wrap">{debugError}</pre>
        </div>
      )}

      <div className="px-5 md:px-8 mb-6 mt-12 animate-fade-in">
        <p className="text-[#8E8E93] text-[13px] font-bold tracking-[0.15em] uppercase mb-1">
          {getGreeting()}, User
        </p>
        <h1 className="text-[28px] md:text-[34px] font-black text-white leading-[1.1]">
          Temukan anime<br />favorit barumu.
        </h1>
      </div>

      <div className="mb-10">
        {heroAnimes.length > 0 && <HeroCarousel animes={heroAnimes} />}
      </div>

      <div className="flex flex-col gap-2">
        <ContinueWatching />

        {season.length > 0   && <AnimeGrid animes={season}              title="Populer Musim Ini" />}
        {trending.length > 6 && <AnimeGrid animes={trending.slice(6)}   title="Sedang Trending" showRank />}
        {gridAnimes.length > 0 && <AnimeGrid animes={gridAnimes}        title="Rilis Episode Terbaru" />}
        {upcoming.length > 0 && <AnimeGrid animes={upcoming}            title="Rilis Mendatang" />}
        {popularInDB.length > 0 && <AnimeGrid animes={popularInDB}      title="Top Sepanjang Masa" />}
      </div>
    </div>
  );
}
