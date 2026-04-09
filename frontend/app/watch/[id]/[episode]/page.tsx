// app/watch/[id]/[episode]/page.tsx — Watch page (server-side fetch)

import WatchClient from "@/features/watch/WatchClient";
import { API } from "@/core/lib/api";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function WatchPage({ params }: { params: Promise<{ id: string; episode: string }> }) {
  const { id, episode } = await params;
  const anilistId = parseInt(id, 10);
  const epNum = parseFloat(episode);

  let sources: any[] = [];
  let allEpisodes: any[] = [];
  let title = `Episode ${episode}`;
  let poster = "";

  const [streamRes, detailRes] = await Promise.allSettled([
    fetch(`${API}/api/v2/anime/${anilistId}/episodes/${epNum}/stream`),
    fetch(`${API}/api/v2/anime/${anilistId}`),
  ]);

  if (streamRes.status === "fulfilled" && streamRes.value.ok) {
    const data = await streamRes.value.json();
    sources = data.sources ?? [];
  }

  if (detailRes.status === "fulfilled" && detailRes.value.ok) {
    const data = await detailRes.value.json();
    const anime = data.data;
    if (anime) {
      title = anime.cleanTitle ?? anime.nativeTitle ?? title;
      poster = anime.coverImage ?? "";
      allEpisodes = (anime.episodes ?? []).map((e: any) => ({
        title: `Episode ${e.episodeNumber}`,
        url: `/watch/${id}/${e.episodeNumber}`,
        number: e.episodeNumber,
      }));
    }
  }

  return <WatchClient id={String(anilistId)} episode={episode} title={title} poster={poster} sources={sources} allEpisodes={allEpisodes} />;
}
