"use client";

import Link from "next/link";
import { Play, Info } from "lucide-react";

interface HeroCarouselProps {
  anime: any;
}

export function HeroCarousel({ anime }: HeroCarouselProps) {
  if (!anime) return null;

  // Coba ambil slug/id dan episode id
  const cleanUrl = (anime.url || '').replace(/\/$/, '');
  const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);

  const cleanEpUrl = (anime.episodeUrl || '').replace(/\/$/, '');
  const epId = cleanEpUrl.substring(cleanEpUrl.lastIndexOf('/') + 1);

  const banner = anime.banner || anime.img;
  const score = anime.score;

  return (
    <div className="relative w-full h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden rounded-b-[2.5rem] bg-zinc-900 border-b border-white/5">
      {/* Background Image with Parallax effect simulation */}
      <div 
        className="absolute inset-0 w-full h-full animate-in zoom-in-105 duration-1000 ease-out fill-mode-both"
      >
        <img
          src={banner}
          alt={anime.title}
          className="object-cover w-full h-full opacity-80"
        />
      </div>

      {/* Grand Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />

      {/* Content Container */}
      <div className="absolute bottom-0 left-0 w-full p-6 sm:p-12 md:p-16 flex flex-col justify-end">
        <div
          className="max-w-3xl flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both"
        >
          {score && (
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold uppercase tracking-widest rounded-full backdrop-blur-md border border-white/10">
                Top Rated
              </span>
              <span className="text-green-400 font-bold text-sm">{(score / 10).toFixed(1)} / 10</span>
            </div>
          )}

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-balance text-white drop-shadow-2xl">
            {anime.title}
          </h1>
          
          <p className="text-base sm:text-lg text-white/70 line-clamp-2 md:line-clamp-3 leading-relaxed max-w-2xl font-medium">
            Episode terbaru kini telah tersedia. Tonton langsung dengan kualitas High Definition. Tanpa Iklan. Tanpa Buffering.
          </p>

          <div className="flex items-center gap-4 mt-4">
            <Link href={`/watch/${id}/${epId}`}>
              <button className="flex items-center gap-2 px-8 py-3.5 bg-white text-black rounded-full font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                <Play className="w-5 h-5" fill="currentColor" />
                Tonton Episode
              </button>
            </Link>
            <Link href={`/anime/${id}`}>
              <button className="flex items-center gap-2 px-8 py-3.5 glass-panel text-white rounded-full font-bold hover:bg-white/20 active:scale-95 transition-all">
                <Info className="w-5 h-5" />
                Selengkapnya
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}