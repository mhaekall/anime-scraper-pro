import { HeroCarousel } from "@/components/HeroCarousel";
import { AnimeGrid } from "@/components/AnimeGrid";
import { TopSeriesGrid } from "@/components/TopSeriesGrid";
import { ContinueWatching } from "@/components/ContinueWatching";

export const dynamic = 'force-dynamic'; // Prevent aggressive caching during dev/production so updates are visible instantly

export default async function Home() {
  let latestEpisodes = [];
  let popularSeries = [];
  
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const res = await fetch(`${API_URL}/api/home`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      latestEpisodes = data.data?.latest_episodes || [];
      popularSeries = data.data?.popular_series || [];
    }
  } catch (error) {
    console.error("Fetch home error:", error);
  }

  // Pisahkan anime pertama untuk dijadikan Hero Banner
  const heroAnime = latestEpisodes.length > 0 ? latestEpisodes[0] : null;
  const gridAnimes = latestEpisodes.length > 1 ? latestEpisodes.slice(1) : [];

  return (
    <main className="min-h-screen bg-black pb-24 text-white overflow-hidden">
      {heroAnime && <HeroCarousel anime={heroAnime} />}
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 flex flex-col gap-12">
        <ContinueWatching />
        <AnimeGrid animes={gridAnimes} title="Rilis Episode Terbaru" />
        <TopSeriesGrid animes={popularSeries} title="Seri Anime Terpopuler" />
      </div>
    </main>
  );
}