// features/home/HomeView.tsx — Apple HIG Style

"use client";

import { HomeSearchBar } from "./HomeSearchBar";
import { HomeGenreGrid } from "./HomeGenreGrid";
import { ContinueWatching } from "./ContinueWatching";
import { AnimeRow } from "@/ui/cards/AnimeRow";
import { SpecialPopularRow } from "@/ui/cards/SpecialPopularRow";
import { LatestGrid } from "@/ui/cards/LatestGrid";
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
      {/* Static Orca Logo */}
      <div className="px-6 md:px-10 pt-8 pb-2">
        <h1 className="text-[28px] font-black text-white tracking-tight flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 100 100">
            {/* Base circle background representing the ocean / yin yang base */}
            <circle cx="50" cy="50" r="46" fill="currentColor" opacity="0.1" />
            {/* The main Orca body curving like the Yin S-curve */}
            <path fill="currentColor" d="M50 4 C 20 4 4 22 4 50 C 4 78 20 96 50 96 C 65 96 50 74 50 50 C 50 26 65 4 50 4 Z" />
            {/* The sharp protruding dorsal fin breaking out of the circle */}
            <path fill="currentColor" d="M 22 32 Q 2 10 12 2 Q 28 16 33 46 Z" />
            {/* The eye of the orca serving as the Yin-Yang dot */}
            <circle cx="28" cy="26" r="4.5" fill="#000000" />
          </svg>
          Orca<span className="text-[#0A84FF]">.</span>
        </h1>
      </div>

      {/* Top Header Section — HIG: Minimalist & Spaced */}
      <div className="pt-4 pb-8 anim-fade">
        <div className="px-6 md:px-10 flex items-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-[#32D74B] shadow-[0_0_8px_#32D74B]" />
          <p className="text-[#8e8e93] text-[11px] font-bold tracking-[0.2em] uppercase">
            {greet()}, {user?.name || "Guest"}
          </p>
        </div>

        {/* Continue Watching Section — HIG: Utility First */}
        <ContinueWatching userId={user?.id} />

        <div className="px-6 md:px-10 mt-4">
          <h1 className="text-[34px] md:text-[42px] font-black tracking-[-0.03em] leading-[1.05]">
            Temukan anime<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-[#8e8e93]">favorit barumu.</span>
          </h1>
        </div>
      </div>

      {/* Search Bar Section */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/5 py-3 px-5 md:px-10 mb-8 w-full transition-all">
        <div className="max-w-4xl mx-auto">
          <HomeSearchBar />
        </div>
      </div>

      {/* Latest Airing (Vertical Grid) */}
      <LatestGrid title="Tayangan Terbaru" items={initialLatest} isNew={true} />

      <div className="space-y-12">
        {/* Rows — HIG: Content is King */}
        {initialAiring.length > 0 && <AnimeRow title="Sedang Tayang (Airing)" items={initialAiring} />}
        {initialTrending.length > 0 && <SpecialPopularRow title="Populer Saat Ini" items={initialTrending} />}
        
        <HomeGenreGrid />
        
        {initialPopular.length > 0 && <AnimeRow title="Terpopuler Sepanjang Masa" items={initialPopular} />}
        {initialTopRated.length > 0 && <AnimeRow title="Skor Tertinggi" items={initialTopRated} />}
        
        {initialCompleted.length > 0 && <LatestGrid title="Anime Tamat Terbaik" items={initialCompleted} />}
        {initialIsekai.length > 0 && <AnimeRow title="Dunia Fantasi & Isekai" items={initialIsekai} />}
        {initialMovies.length > 0 && <AnimeRow title="Film Anime (Movies)" items={initialMovies} />}
      </div>
      
      {/* Visual Explainer Placeholder / Decorative Gradient */}
      <div className="fixed bottom-0 left-0 w-full h-[150px] pointer-events-none bg-gradient-to-t from-black to-transparent opacity-60 z-10" />
    </div>
  );
}

