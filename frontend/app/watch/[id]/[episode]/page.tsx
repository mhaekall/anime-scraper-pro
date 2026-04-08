/**
 * /watch/[id]/[episode]/page.tsx
 *
 * [id]      = AniList numeric ID (e.g. 21)
 * [episode] = episode number as string (e.g. "1", "12", "12.5")
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

  let sources   : any[] = [];
  let allEpisodes: any[] = [];
  let title      = `Episode ${episode}`;
  let poster     = "";
  let animeSlug  = id;

  const anilistId = parseInt(id, 10);
  const epNum     = parseFloat(episode);

  const [streamRes, detailRes] = await Promise.allSettled([
    fetch(`${API_URL}/api/v2/anime/${anilistId}/episodes/${epNum}/stream`),
    fetch(`${API_URL}/api/v2/anime/${anilistId}`),
  ]);

  let debugStr = "";

  if (streamRes.status === "fulfilled" && streamRes.value.ok) {
    const data = await streamRes.value.json();
    sources = data.sources ?? [];
    debugStr = `StreamOK (${sources.length} sources)`;
  } else if (streamRes.status === "fulfilled") {
    debugStr = `StreamFailed: ${streamRes.value.status} ${streamRes.value.statusText}`;
  } else {
    debugStr = `StreamError: ${streamRes.reason}`;
  }

  if (detailRes.status === "fulfilled" && detailRes.value.ok) {
    const data = await detailRes.value.json();
    const anime = data.data;
    if (anime) {
      title       = (anime.cleanTitle ?? anime.nativeTitle ?? title) + " | " + debugStr;
      poster      = anime.coverImage ?? "";
      allEpisodes = (anime.episodes ?? []).map((e: any) => ({
        title:  `Episode ${e.episodeNumber}`,
        url:    `/watch/${id}/${e.episodeNumber}`,
        number: e.episodeNumber,
      }));
      animeSlug = String(anilistId);
    }
  } else {
    title = title + " | " + debugStr;
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
