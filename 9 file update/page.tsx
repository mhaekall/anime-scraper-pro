/**
 * /watch/[id]/[episode]/page.tsx
 *
 * [id]      = AniList numeric ID (e.g. 21)  ← replaces oploverz slug
 * [episode] = episode number as string (e.g. "1", "12", "12.5")
 *
 * Why anilistId instead of oploverz slug?
 *   The old routing used the oploverz URL slug as the page ID.  That caused
 *   a mismatch whenever a link came from an AniList search result (which
 *   knows only the numeric ID) or from the Recommendations grid.
 *   Using anilistId everywhere means every entry point — trending, search,
 *   recommendations, continue-watching — all routes to the same URL shape.
 */

import { VideoPlayer } from "@/components/VideoPlayer";
import { HistoryTracker } from "@/components/HistoryTracker";
import WatchClient from "./WatchClient";

export const dynamic = "force-dynamic";
export const runtime = "edge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://jonyyyyyyyu-anime-scraper-api.hf.space";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string; episode: string }>;
}) {
  const { id, episode } = await params;

  // id can be a numeric anilistId ("21") or an oploverz slug ("one-piece").
  // We detect which and route accordingly.
  const isNumericId = /^\d+$/.test(id);

  let sources   : any[] = [];
  let allEpisodes: any[] = [];
  let title      = `Episode ${episode}`;
  let poster     = "";
  let animeSlug  = id;   // used for history tracking

  if (isNumericId) {
    // ── v2 path: anilistId known ────────────────────────────────────────────
    const anilistId = parseInt(id, 10);
    const epNum     = parseFloat(episode);

    const [streamRes, detailRes] = await Promise.allSettled([
      fetch(`${API_URL}/api/v2/anime/${anilistId}/episodes/${epNum}/stream`, {
        cache: "no-store",
      }),
      fetch(`${API_URL}/api/v2/anime/${anilistId}`, {
        cache: "no-store",
      }),
    ]);

    if (streamRes.status === "fulfilled" && streamRes.value.ok) {
      const data = await streamRes.value.json();
      sources = data.sources ?? [];
    }

    if (detailRes.status === "fulfilled" && detailRes.value.ok) {
      const data = await detailRes.value.json();
      const anime = data.data;
      if (anime) {
        title       = anime.cleanTitle ?? anime.nativeTitle ?? title;
        poster      = anime.coverImage ?? "";
        allEpisodes = (anime.episodes ?? []).map((e: any) => ({
          title:  `Episode ${e.episodeNumber}`,
          url:    `/watch/${id}/${e.episodeNumber}`,
          number: e.episodeNumber,
        }));
        animeSlug = String(anilistId);
      }
    }
  } else {
    // ── v1 path: oploverz slug (legacy links, backward compat) ─────────────
    const url       = `https://o.oploverz.ltd/series/${id}/episode/${episode}/`;
    const seriesUrl = `https://o.oploverz.ltd/series/${id}/`;
    const epNum     = episode.replace(/\D/g, "") || episode;

    const [scrapeRes, detailRes] = await Promise.allSettled([
      fetch(
        `${API_URL}/api/multi-source?title=${encodeURIComponent(id)}&ep=${encodeURIComponent(epNum)}&oploverz_url=${encodeURIComponent(url)}`,
        { cache: "no-store" }
      ),
      fetch(`${API_URL}/api/series-detail?url=${encodeURIComponent(seriesUrl)}`, {
        cache: "no-store",
      }),
    ]);

    if (scrapeRes.status === "fulfilled" && scrapeRes.value.ok) {
      const data = await scrapeRes.value.json();
      sources = data.sources ?? [];
      if (data.anime?.title)  title  = data.anime.title;
      if (data.anime?.poster) poster = data.anime.poster;
    }

    if (detailRes.status === "fulfilled" && detailRes.value.ok) {
      const data = await detailRes.value.json();
      allEpisodes = data.data?.episodes ?? [];
      if (!title  && data.data?.title)  title  = data.data.title;
      if (!poster && data.data?.poster) poster = data.data.poster;
    }

    animeSlug = id;
  }

  return (
    <>
      <HistoryTracker id={animeSlug} epId={episode} title={title} poster={poster} />
      <WatchClient
        id={animeSlug}
        episode={episode}
        title={title}
        poster={poster}
        sources={sources}
        allEpisodes={allEpisodes}
      />
    </>
  );
}
