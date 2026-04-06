import { HeroCarousel } from "@/components/HeroCarousel";
import { AnimeGrid } from "@/components/AnimeGrid";
import { TopSeriesGrid } from "@/components/TopSeriesGrid";
import { ContinueWatching } from "@/components/ContinueWatching";

export const dynamic = 'force-dynamic';
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

  const heroAnime = latestEpisodes.length > 0 ? latestEpisodes[0] : null;
  const gridAnimes = latestEpisodes.length > 1 ? latestEpisodes.slice(1) : [];
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Ohayou';
    if (hour < 18) return 'Konnichiwa';
    return 'Konbanwa';
  };

  return (
    <main className="min-h-screen bg-[#000000] pb-32 text-white overflow-hidden overflow-y-auto hide-scrollbar">
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
        {heroAnime && <HeroCarousel anime={heroAnime} />}
      </div>

      <div className="flex flex-col">
        <ContinueWatching />
        <AnimeGrid animes={gridAnimes} title="Rilis Episode Terbaru" />
        <TopSeriesGrid animes={popularSeries} title="Seri Anime Terpopuler" />
      </div>
    </main>
  );
}