import { HeroCarousel } from "@/components/HeroCarousel";
import { AnimeGrid } from "@/components/AnimeGrid";
import { TopSeriesGrid } from "@/components/TopSeriesGrid";
import { ContinueWatching } from "@/components/ContinueWatching";

export const dynamic = 'force-dynamic'; // Prevent aggressive caching during dev/production so updates are visible instantly
export const runtime = 'edge';

export default async function Home() {
  let latestEpisodes = [];
  let popularSeries = [];
  let debugError = null;
  
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://jonyyyyyyyu-anime-scraper-api.hf.space";
    const res = await fetch(`${API_URL}/api/home`);
    if (res.ok) {
      const data = await res.json();
      latestEpisodes = data.data?.latest_episodes || [];
      popularSeries = data.data?.popular_series || [];
    } else {
      debugError = `Backend HTTP Error: ${res.status} ${res.statusText}`;
    }
  } catch (error: any) {
    console.error("Fetch home error:", error);
    debugError = `Fetch failed: ${error.message} | ${error.stack}`;
  }

  // Pisahkan anime pertama untuk dijadikan Hero Banner
  const heroAnime = latestEpisodes.length > 0 ? latestEpisodes[0] : null;
  const gridAnimes = latestEpisodes.length > 1 ? latestEpisodes.slice(1) : [];

  return (
    <main className="min-h-screen bg-black pb-24 text-white overflow-hidden">
      {debugError && (
        <div className="bg-red-500/20 border border-red-500 text-red-500 p-4 m-4 rounded">
          <h2 className="font-bold">Backend Connection Error:</h2>
          <pre className="text-xs whitespace-pre-wrap">{debugError}</pre>
        </div>
      )}
      {heroAnime && <HeroCarousel anime={heroAnime} />}

      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 flex flex-col gap-12">
        <ContinueWatching />
        <AnimeGrid animes={gridAnimes} title="Rilis Episode Terbaru" />
        <TopSeriesGrid animes={popularSeries} title="Seri Anime Terpopuler" />
      </div>
    </main>
  );
}