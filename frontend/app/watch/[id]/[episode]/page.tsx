import { HistoryTracker } from "@/components/HistoryTracker";
import WatchClient from "./WatchClient";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function WatchPage({ params }: { params: Promise<{ id: string, episode: string }> }) {
  const { id, episode } = await params;
  
  let sources = [];
  let title = `Episode ${episode.replace(/-/g, ' ')}`;
  let poster = "";
  let allEpisodes = [];

  try {
    const url = `https://o.oploverz.ltd/series/${id}/episode/${episode}/`;
    const seriesUrl = `https://o.oploverz.ltd/series/${id}/`;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://jonyyyyyyyu-anime-scraper-api.hf.space";
    
    // Fetch both scrape and details in parallel for max speed
    const [scrapeRes, detailRes] = await Promise.all([
      fetch(`${API_URL}/api/multi-source?title=${encodeURIComponent(id)}&ep=${encodeURIComponent(episode.replace(/\D/g, ''))}&oploverz_url=${encodeURIComponent(url)}`),
      fetch(`${API_URL}/api/series-detail?url=${encodeURIComponent(seriesUrl)}`)
    ]);

    if (scrapeRes.ok) {
      const data = await scrapeRes.json();
      sources = data.sources || [];
      if (data.anime?.title) title = data.anime.title;
      if (data.anime?.poster) poster = data.anime.poster;
    }
    
    if (detailRes.ok) {
      const data = await detailRes.json();
      allEpisodes = data.data?.episodes || [];
      if (!title && data.data?.title) title = data.data.title;
      if (!poster && data.data?.poster) poster = data.data.poster;
    }
  } catch (error) {
    console.error("Fetch video sources error:", error);
  }

  return (
    <>
      <HistoryTracker id={id} epId={episode} title={title} poster={poster} />
      <WatchClient 
        id={id} 
        episode={episode} 
        title={title} 
        poster={poster} 
        sources={sources} 
        allEpisodes={allEpisodes} 
      />
    </>
  );
}
