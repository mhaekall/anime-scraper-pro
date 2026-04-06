"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Icons } from "./Icons";
import { useThemeContext } from "./ThemeProvider";

interface HeroCarouselProps {
  animes: any[];
}

export function HeroCarousel({ animes }: HeroCarouselProps) {
  const { settings } = useThemeContext();
  const [heroIdx, setHeroIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!animes || animes.length === 0) return null;

  const heroes = animes.slice(0, 6);

  // Auto slide infinite loop
  useEffect(() => {
    if (heroes.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIdx((prev) => {
        const next = (prev + 1) % heroes.length;
        if (scrollRef.current) {
          const width = scrollRef.current.offsetWidth;
          scrollRef.current.scrollTo({ left: width * next, behavior: 'smooth' });
        }
        return next;
      });
    }, 5000); // 5 detik
    return () => clearInterval(timer);
  }, [heroes.length]);

  return (
    <div className="relative group">
      <div 
        ref={scrollRef}
        className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-5 md:px-8 gap-4 md:gap-6" 
        onScroll={e => {
          const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
          setHeroIdx(idx);
        }}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {heroes.map((anime, i) => {
          // Attempt to grab ID and Ep ID from URL
          const cleanUrl = (anime.url || '').replace(/\/$/, '');
          const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);

          const cleanEpUrl = (anime.episodeUrl || '').replace(/\/$/, '');
          const epId = cleanEpUrl.substring(cleanEpUrl.lastIndexOf('/') + 1);

          // Gunakan cover pertama (poster/img), jangan banner
          const cover = anime.img || anime.poster || anime.coverImage?.extraLarge || anime.coverImage?.large || anime.bannerImage;
          const score = anime.score || anime.averageScore;
          const c = anime.color || anime.coverImage?.color || settings.accentColor;

          return (
            <div key={id + i} className="min-w-full snap-center relative h-[420px] md:h-[500px] lg:h-[600px] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-2xl border border-white/5 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500">
              {/* Parallax-like Image */}
              <img
                src={cover}
                alt={anime.title?.english || anime.title?.romaji || anime.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] ease-out group-hover:scale-110"
                style={{ willChange: "transform" }}
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0C10] via-[#0A0C10]/40 to-transparent" />
              <div className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none" style={{ background: `linear-gradient(to top, ${c}, transparent)` }} />

              <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 right-6 md:right-10 flex flex-col md:items-start items-center text-center md:text-left z-10 animate-fade-in">
                <div className="flex gap-2 mb-3">
                  <span className="px-3 py-1 bg-white text-black text-[10px] md:text-[12px] font-black rounded-sm uppercase tracking-widest shadow-lg">TRENDING #{i + 1}</span>
                  {score && (
                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] md:text-[12px] font-bold rounded-sm border border-white/20">
                      {(score > 10 ? (score / 10).toFixed(1) : score)}/10
                    </span>
                  )}
                </div>
                
                <h2 className="text-[32px] md:text-[48px] lg:text-[56px] font-black text-white leading-[1.05] mb-4 drop-shadow-xl text-balance">
                  {anime.title?.english || anime.title?.romaji || anime.title}
                </h2>
                
                <p className="text-[#E5E5EA] text-[13px] md:text-[15px] font-medium line-clamp-2 md:line-clamp-3 mb-6 max-w-2xl drop-shadow-md hidden md:block">
                  Episode terbaru kini telah tersedia. Tonton langsung dengan kualitas High Definition. Tanpa Buffering.
                </p>
                
                <div className="flex gap-3 w-full md:w-auto">
                  <Link href={`/watch/${id}/${epId}`} className="flex-1 md:flex-none">
                    <button className="w-full md:px-10 bg-white text-black font-black py-3.5 md:py-4 rounded-[16px] flex justify-center items-center gap-2 text-[14px] md:text-[16px] active:scale-95 transition-transform hover:bg-gray-200">
                      <Icons.Play cls="w-5 h-5" /> Putar
                    </button>
                  </Link>
                  <Link href={`/anime/${id}`}>
                    <button className="w-12 h-12 md:w-14 md:h-14 rounded-[16px] bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform hover:bg-white/20">
                      <Icons.Info />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {heroes.map((_, i) => (
          <div 
            key={i} 
            onClick={() => {
              if (scrollRef.current) {
                const width = scrollRef.current.offsetWidth;
                scrollRef.current.scrollTo({ left: width * i, behavior: 'smooth' });
                setHeroIdx(i);
              }
            }}
            className={`h-1.5 md:h-2 rounded-full transition-all duration-500 ease-out cursor-pointer ${heroIdx === i ? 'w-8 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'w-2 bg-[#3A3A3C]'}`} 
          />
        ))}
      </div>
    </div>
  );
}
