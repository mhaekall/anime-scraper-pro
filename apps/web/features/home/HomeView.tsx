// features/home/HomeView.tsx — Single API call to backend DB. No AniList client-side.
// KEY FIX: Removed dual-fetch (backend + AniList). Backend v2/home has everything.

"use client";

import useSWR from "swr";
import { api } from "@/core/lib/api";
import { HeroCarousel } from "./HeroCarousel";
import { ContinueWatching } from "./ContinueWatching";
import { AnimeRow } from "@/ui/cards/AnimeRow";

const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Ohayou" : h < 18 ? "Konnichiwa" : "Konbanwa";
};

export default function HomeView() {
  const { data, error, isLoading } = useSWR("home-v2", () => api.homeV2(), {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  if (isLoading) return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-3 border-white/20 border-t-[var(--accent)] rounded-full anim-spin" />
      <p className="text-[#8e8e93] text-sm font-medium">Memuat Beranda…</p>
    </div>
  );

  const d = data?.data;
  const hero = d?.hero ?? [];
  const latest = d?.latest ?? [];
  const popular = d?.popular ?? [];

  return (
    <div className="w-full pb-24">
      {error && (
        <div className="bg-[#FF453A]/10 border border-[#FF453A]/30 text-[#FF453A] p-3 mx-5 mt-4 rounded-2xl text-sm font-medium">
          Gagal memuat: {error.message}
        </div>
      )}

      <div className="px-5 md:px-8 mb-5 mt-10 anim-fade">
        <p className="text-[#8e8e93] text-[12px] font-bold tracking-[0.15em] uppercase mb-1">{greet()}, User</p>
        <h1 className="text-[26px] md:text-[32px] font-black text-white leading-[1.1]">Temukan anime<br />favorit barumu.</h1>
      </div>

      <div className="mb-8">{hero.length > 0 && <HeroCarousel items={hero} />}</div>

      <ContinueWatching />
      {latest.length > 0 && <AnimeRow title="Rilis Episode Terbaru" items={latest} />}
      {popular.length > 0 && <AnimeRow title="Top Sepanjang Masa" items={popular} showRank />}
    </div>
  );
}
