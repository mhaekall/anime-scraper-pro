// features/home/HomeView.tsx — Apple HIG Style

"use client";

import { HeroCarousel } from "./HeroCarousel";
import { ContinueWatching } from "./ContinueWatching";
import { AnimeRow } from "@/ui/cards/AnimeRow";
import { authClient } from "@/core/lib/auth-client";

const greet = () => {
  const h = new Date().getHours();
  if (h < 5) return "Konbanwa";
  if (h < 12) return "Ohayou";
  if (h < 17) return "Konnichiwa";
  return "Konbanwa";
};

export default function HomeView({ 
  initialHero = [], 
  initialAiring = [],
  initialLatest = [], 
  initialPopular = [],
  initialCompleted = [],
  initialTopRated = [],
  initialIsekai = [],
  initialMovies = [],
  initialTrending = []
}: { 
  initialHero?: any[]; 
  initialAiring?: any[];
  initialLatest?: any[]; 
  initialPopular?: any[]; 
  initialCompleted?: any[];
  initialTopRated?: any[];
  initialIsekai?: any[];
  initialMovies?: any[];
  initialTrending?: any[];
}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  return (
    <div className="w-full pb-24 bg-black min-h-screen text-white selection:bg-[#0A84FF]/30">
      {/* Top Header Section — HIG: Minimalist & Spaced */}
      <div className="px-6 md:px-10 pt-16 pb-8 anim-fade">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#32D74B] shadow-[0_0_8px_#32D74B]" />
          <p className="text-[#8e8e93] text-[11px] font-bold tracking-[0.2em] uppercase">
            {greet()}, {user?.name || "Guest"}
          </p>
        </div>
        <h1 className="text-[34px] md:text-[42px] font-black tracking-[-0.03em] leading-[1.05]">
          Temukan anime<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8e8e93]">favorit barumu.</span>
        </h1>
      </div>

      {/* Hero Section — HIG: Immersive */}
      <div className="mb-12 relative">
        {initialHero.length > 0 && <HeroCarousel items={initialHero} />}
      </div>

      <div className="space-y-12">
        {/* Continue Watching Section — HIG: Utility First */}
        <ContinueWatching userId={user?.id} />

        {/* Rows — HIG: Content is King */}
        {initialTrending.length > 0 && <AnimeRow title="Populer Saat Ini" items={initialTrending} showRank />}
        {initialAiring.length > 0 && <AnimeRow title="Sedang Tayang" items={initialAiring} />}
        {initialLatest.length > 0 && <AnimeRow title="Rilis Episode Terbaru" items={initialLatest} variant="horizontal" />}
        {initialIsekai.length > 0 && <AnimeRow title="Dunia Fantasi & Isekai" items={initialIsekai} />}
        {initialMovies.length > 0 && <AnimeRow title="Film Layar Lebar (Movies)" items={initialMovies} variant="horizontal" />}
        {initialTopRated.length > 0 && <AnimeRow title="Rating Tertinggi" items={initialTopRated} showRank />}
        {initialCompleted.length > 0 && <AnimeRow title="Anime Tamat Terbaik" items={initialCompleted} />}
        {initialPopular.length > 0 && <AnimeRow title="Top Sepanjang Masa" items={initialPopular} />}
      </div>
      
      {/* Visual Explainer Placeholder / Decorative Gradient */}
      <div className="fixed bottom-0 left-0 w-full h-[150px] pointer-events-none bg-gradient-to-t from-black to-transparent opacity-60 z-10" />
    </div>
  );
}

