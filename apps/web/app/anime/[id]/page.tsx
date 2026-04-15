// app/anime/[id]/page.tsx — Anime detail page (server-side fetch)

import { Suspense } from "react";
import Link from "next/link";
import { API } from "@/core/lib/api";
import DetailClient from "@/features/detail/DetailClient";
import DetailSkeleton from "@/features/detail/DetailSkeleton";

export const dynamic = "force-dynamic";
export const runtime = "edge";

async function AnimeData({ id }: { id: string }) {
  let detail: any = null;
  let error: string | null = null;

  try {
    const res = await fetch(`${API}/api/v2/anime/${id}`, {
      next: { revalidate: 300 }, // ISR 5 menit
    });
    if (res.ok) {
      const json = await res.json();
      if (!json.success) {
        error = json.error || "Terjadi kesalahan di server";
      } else if (!json.data) {
        error = "Data anime tidak ditemukan di server";
      } else {
        const a = json.data;
        detail = {
          title: a.cleanTitle ?? a.nativeTitle ?? "Unknown Title",
          nativeTitle: a.nativeTitle,
          poster: a.coverImage,
          banner: a.bannerImage,
          synopsis: a.synopsis,
          score: a.score,
          genres: a.genres ?? [],
          studios: a.studios ?? [],
          status: a.status,
          totalEpisodes: a.totalEpisodes,
          season: a.season,
          seasonYear: a.year,
          recommendations: a.recommendations ?? [],
          nextAiringEpisode: a.nextAiringEpisode,
          episodes: (a.episodes ?? []).map((e: any) => ({
            title: `Episode ${e.episodeNumber}`,
            url: `/watch/${id}/${e.episodeNumber}`,
            number: e.episodeNumber,
            provider: e.providerId,
            thumbnailUrl: e.thumbnailUrl,
          })),
          _syncing: json.syncing,
        };
      }
    } else {
      error = `HTTP ${res.status}`;
    }
  } catch (e: any) {
    error = e.message;
  }

  if (error || !detail) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-white font-black text-xl mb-2">Gagal Memuat</h1>
        <p className="text-[#8e8e93] text-sm">{error ?? "Anime tidak ditemukan"}</p>
        <Link href="/" className="mt-5 px-5 py-2.5 bg-[#1c1c1e] border border-white/10 rounded-2xl text-white font-bold text-sm">Beranda</Link>
      </main>
    );
  }

  return <DetailClient detail={detail} id={id} />;
}

export default async function AnimeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <AnimeData id={id} />
    </Suspense>
  );
}
