// features/home/HomeView.tsx — Single API call to backend DB. No AniList client-side.
// KEY FIX: Removed dual-fetch (backend + AniList). Backend v2/home has everything.

"use client";

import { HeroCarousel } from "./HeroCarousel";
import { ContinueWatching } from "./ContinueWatching";
import { AnimeRow } from "@/ui/cards/AnimeRow";

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Ohayou" : h < 18 ? "Konnichiwa" : "Konbanwa";
};

export default function HomeView({ 
  initialHero = [], 
  initialLatest = [], 
  initialPopular = [] 
}: { 
  initialHero?: any[]; 
  initialLatest?: any[]; 
  initialPopular?: any[]; 
}) {
  return (
    <div className="w-full pb-24">
      <div className="px-5 md:px-8 mb-5 mt-10 anim-fade">
        <p className="text-[#8e8e93] text-[12px] font-bold tracking-[0.15em] uppercase mb-1">{greet()}, User</p>
        <h1 className="text-[26px] md:text-[32px] font-black text-white leading-[1.1]">Temukan anime<br />favorit barumu.</h1>
      </div>

      <div className="mb-8">{initialHero.length > 0 && <HeroCarousel items={initialHero} />}</div>

      <ContinueWatching />
      {initialLatest.length > 0 && <AnimeRow title="Rilis Episode Terbaru" items={initialLatest} />}
      {initialPopular.length > 0 && <AnimeRow title="Top Sepanjang Masa" items={initialPopular} showRank />}
    </div>
  );
}

