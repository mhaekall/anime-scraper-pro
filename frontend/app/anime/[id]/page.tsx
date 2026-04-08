/**
 * /anime/[id]/page.tsx
 *
 * [id] = AniList numeric ID (e.g. "21")
 *
 * The v2 endpoint triggers a background episode sync if the episode list is
 * empty, so the next page load will have episodes.
 */

import Link from "next/link";
import AnimeDetailClient from "./AnimeDetailClient";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://jonyyyyyyyu-anime-scraper-api.hf.space";

export default async function AnimeDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail: any   = null;
  let fetchError: string | null = null;

  try {
    const res = await fetch(`${API_URL}/api/v2/anime/${id}`);
    if (res.ok) {
      const json = await res.json();
      const anime = json.data;

      // Normalize v2 shape → same shape AnimeDetailClient expects
      detail = {
        title:          anime.cleanTitle ?? anime.nativeTitle,
        cleanTitle:     anime.cleanTitle,
        nativeTitle:    anime.nativeTitle,
        poster:         anime.coverImage,
        banner:         anime.bannerImage,
        synopsis:       anime.synopsis,
        score:          anime.score,
        genres:         anime.genres  ?? [],
        studios:        anime.studios ?? [],
        status:         anime.status,
        totalEpisodes:  anime.totalEpisodes,
        season:         anime.season,
        seasonYear:     anime.year,
        recommendations: anime.recommendations ?? [],
        nextAiringEpisode: anime.nextAiringEpisode,
        color:          null,  // not stored in v2 meta yet
        // Map episode list to the shape AnimeDetailClient + EpisodeList expects:
        // {title, url, number}
        // url = canonical watch route using anilistId + episode number
        episodes: (anime.episodes ?? []).map((e: any) => ({
          title:  `Episode ${e.episodeNumber}`,
          url:    `/watch/${id}/${e.episodeNumber}`,
          number: e.episodeNumber,
          provider: e.providerId || "oploverz",
        })),
      };

      if (json.syncing) {
        // Episodes are being fetched — surface a friendly note
        detail._syncing = true;
      }
    } else {
      fetchError = `HTTP ${res.status}`;
    }
  } catch (e: any) {
    fetchError = e.message ?? String(e);
  }

  if (fetchError || !detail) {
    return (
      <main className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-white font-black text-2xl mb-2">Gagal Memuat Data</h1>
        <p className="text-[#8E8E93] text-sm max-w-md">
          {fetchError ?? "Anime tidak ditemukan"}
        </p>
        <Link
          href="/"
          className="mt-6 px-6 py-3 bg-[#1C1C1E] border border-white/10 rounded-[16px] text-white font-bold"
        >
          Kembali ke Beranda
        </Link>
      </main>
    );
  }

  return <AnimeDetailClient detail={detail} id={id} />;
}
