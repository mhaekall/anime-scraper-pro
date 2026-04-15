// ui/cards/AnimeCard.tsx — Zero-fetch card. Image comes from parent data.
// KEY FIX: No more individual AniList API calls per card.
// Backend v2/home already provides coverImage for all anime.

"use client";

import { memo, useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/core/lib/api";
import { IconPlay, IconCheck } from "@/ui/icons";
import { useSettings } from "@/core/stores/app-store";
import { useWatchHistory } from "@/core/hooks/use-watch-history";
import { useViewTransition } from "@/core/hooks/use-view-transition";

interface Props {
  id: string;
  title: string;
  img: string | null;
  banner?: string | null;
  score?: number | null;
  color?: string | null;
  epId?: string;
  rank?: number;
  variant?: "vertical" | "horizontal";
}

function AnimeCardInner({ id, title, img, banner, score, color, epId, rank, variant = "vertical" }: Props) {
  const accent = "#0A84FF";
  const { history } = useWatchHistory();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const navigate = useViewTransition();

  const watched = history.find((h) => h.animeSlug === id);
  const pct = watched && watched.durationSec > 0 ? (watched.timestampSec / watched.durationSec) * 100 : 0;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { rootMargin: "200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleMouseEnter = () => {
    const href = epId ? `/watch/${id}/${epId}` : `/anime/${id}`;
    // Prefetch route Next.js
    router.prefetch(href);
  };

  const c = color || accent;
  const href = epId ? `/watch/${id}/${epId}` : `/anime/${id}`;

  const aspectClass = variant === "horizontal" ? "aspect-video" : "aspect-[2/3]";
  const imageSrc = variant === "horizontal" ? (banner || img) : img;

  return (
    <div ref={ref} onMouseEnter={handleMouseEnter} className="flex flex-col h-full w-full group cursor-pointer anim-up" style={{ animationDelay: rank ? `${Math.min(rank * 40, 240)}ms` : "0ms" }}>
      <button onClick={() => navigate(href)} className={`w-full ${aspectClass} rounded-2xl relative overflow-hidden mb-2 border border-white/5 bg-[#1c1c1e] block transition-shadow duration-300 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] text-left focus:outline-none`}>
        {visible && imageSrc ? (
          <img src={imageSrc} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.src = img || "https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/default.jpg"; }} />
        ) : (
          <div className="w-full h-full bg-[#2c2c2e] flex items-center justify-center">
            {visible ? <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full anim-spin" /> : null}
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: `inset 0 -30px 50px -15px ${c}60` }} />

        {rank && (
          <div className="absolute top-0 left-0 w-7 h-9 bg-black/60 rounded-br-xl flex items-center justify-center font-black text-sm text-white z-10">{rank}</div>
        )}

        {epId && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-[#FF453A]/90 text-[9px] font-bold uppercase tracking-wider rounded z-10">EPS {epId}</span>
        )}

        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-200">
          <span className="text-white/80 text-[10px] font-medium">{epId ? "Tonton" : "Detail"}</span>
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><IconPlay className="w-3 h-3 ml-0.5" /></div>
        </div>

        {watched && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-20">
            <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: accent }} />
          </div>
        )}
      </button>
      <h3 className="text-[#f2f2f7] font-semibold text-[13px] line-clamp-2 leading-[1.3] px-0.5 group-hover:text-white transition-colors">{title}</h3>
      {watched?.completed && (
        <span className="text-[10px] font-bold text-[#30D158] flex items-center gap-0.5 mt-0.5 px-0.5"><IconCheck className="w-3 h-3" /> Selesai</span>
      )}
    </div>
  );
}

export const AnimeCard = memo(AnimeCardInner);

