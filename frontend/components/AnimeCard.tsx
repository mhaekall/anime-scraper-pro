"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Icons } from "./Icons";
import { useThemeContext } from "./ThemeProvider";
import { useWatchHistory } from "@/hooks/useWatchHistory";

const GET_ANIME_COVER = `
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      coverImage {
        extraLarge
        large
        color
      }
    }
  }
`;

export function AnimeCard({ anime, id, idx, epId, showRank = false, rankIndex = 0 }: { anime: any, id: string, idx: number, epId?: string, showRank?: boolean, rankIndex?: number }) {
  const [imgData, setImgData] = useState<{ url: string | null, color: string | null }>({ url: null, color: null });
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { settings } = useThemeContext();
  const { history } = useWatchHistory();

  // Find latest watch history for this anime
  const watchedData = history.find(h => h.animeSlug === id);
  const progressPct = watchedData && watchedData.durationSec > 0 
    ? (watchedData.timestampSec / watchedData.durationSec) * 100 
    : 0;
  const isCompleted = watchedData?.completed || progressPct > 90;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" } 
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    if (anime.img) {
      setImgData({ url: anime.img, color: anime.color || null });
      return;
    }

    const cleanTitle = anime.title.replace(/\b(episode|ep|sub indo|batch)\b/gi, '').trim();
    const cacheKey = `anilist_img_${cleanTitle}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      if (cached !== 'null') setImgData(JSON.parse(cached));
      return;
    }

    let isMounted = true;
    const fetchImg = async () => {
      try {
        const res = await fetch('/api/anilist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: GET_ANIME_COVER, variables: { search: cleanTitle } })
        });
        const data = await res.json();
        const url = data?.data?.Media?.coverImage?.extraLarge || data?.data?.Media?.coverImage?.large || null;
        const color = data?.data?.Media?.coverImage?.color || null;
        
        if (!isMounted) return;
        
        if (url) {
          const toCache = { url, color };
          setImgData(toCache);
          sessionStorage.setItem(cacheKey, JSON.stringify(toCache));
        } else {
          sessionStorage.setItem(cacheKey, 'null');
        }
      } catch (e) {
        console.error("Failed to fetch image for", cleanTitle);
      }
    };
    
    const timer = setTimeout(() => fetchImg(), Math.random() * 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isVisible, anime]);

  const c = imgData.color || settings.accentColor;
  const title = anime.title;

  return (
    <div
      ref={ref}
      className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both flex flex-col h-full w-full group cursor-pointer"
      style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
    >
      <Link href={epId ? `/watch/${id}/${epId}` : `/anime/${id}`} className="w-full aspect-[2/3] rounded-[16px] relative overflow-hidden mb-2 border border-white/5 bg-[#1C1C1E] transition-all duration-300 group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] group-hover:-translate-y-1 block" style={{ WebkitTapHighlightColor: "transparent" }}>
        
        {imgData.url ? (
          <img
            src={imgData.url}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
            style={{ willChange: "transform" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#2C2C2E]">
            {isVisible ? <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/80 animate-spin" /> : <Icons.ImageOff />}
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent opacity-90 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none" />
        
        {/* Dynamic Inner Glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ boxShadow: `inset 0 -40px 60px -20px ${c}90` }} />
        
        {showRank && (
          <div className="absolute top-0 left-0 w-8 h-10 bg-black/60 backdrop-blur-md rounded-br-[12px] flex items-center justify-center font-black text-[16px] text-white border-r border-b border-white/10 z-10">
            {rankIndex}
          </div>
        )}

        {/* Status / Format Badge */}
        {epId && (
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end z-10">
            <span className="px-1.5 py-0.5 bg-[#FF453A]/90 backdrop-blur-md text-[9px] font-bold text-white uppercase tracking-wider rounded shadow-[0_0_10px_rgba(255,69,58,0.5)]">
              EPS {epId.replace(/-/g, ' ')}
            </span>
          </div>
        )}

        {/* Bottom Info inside Card */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-col gap-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
            <span className="text-white/80 text-[10px] font-medium">{epId ? 'Watch Now' : 'Details'}</span>
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <Icons.Play cls="w-3 h-3 ml-0.5" />
            </div>
          </div>
        </div>

        {/* Progress Bar (Visual) */}
        {watchedData && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-20">
            <div 
              className="h-full transition-all duration-300" 
              style={{ width: `${progressPct}%`, backgroundColor: settings.accentColor }} 
            />
          </div>
        )}
      </Link>
      
      <div className="flex flex-col gap-0.5 px-1">
        <h3 className="text-[#F2F2F7] font-semibold text-[13px] line-clamp-2 leading-[1.3] transition-colors duration-300 group-hover:text-white" title={title}>
          {title}
        </h3>
        {isCompleted && (
          <span className="text-[10px] font-bold text-[#30D158] uppercase tracking-wider flex items-center gap-1 mt-0.5">
            <Icons.Check cls="w-3 h-3" /> Selesai
          </span>
        )}
      </div>
    </div>
  );
}
