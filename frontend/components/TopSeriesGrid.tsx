"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Info, PlayCircle } from "lucide-react";

interface TopSeriesGridProps {
  animes: any[];
  title: string;
}

export function TopSeriesGrid({ animes, title }: TopSeriesGridProps) {
  if (!animes || animes.length === 0) return null;

  const getInitials = (title: string) => {
    const parts = title.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return title.substring(0, 2).toUpperCase();
  };

  return (
    <section className="flex flex-col gap-6 w-full relative z-10">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white/90">
          {title}
        </h2>
      </div>
      
      {/* Horizontal Snap Scroll Ranked Layout */}
      <div className="flex overflow-x-auto pb-8 pt-4 gap-6 sm:gap-10 scrollbar-hide snap-x relative items-end">
        {animes.map((anime: any, idx: number) => {
          const cleanUrl = (anime.url || '').replace(/\/$/, '');
          const id = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="snap-start shrink-0 relative flex items-end group w-[180px] sm:w-[220px] pb-4"
            >
              {/* Massive Stroke Number (Rank) - Positioned behind and to the left */}
              <span 
                className="absolute -left-6 sm:-left-10 -bottom-6 text-[120px] sm:text-[180px] font-black leading-none select-none z-0 transition-transform duration-500 group-hover:scale-110"
                style={{
                   WebkitTextStroke: '2px rgba(255,255,255,0.2)',
                   color: 'transparent'
                }}
              >
                {idx + 1}
              </span>

              {/* Main Card */}
              <Link href={`/anime/${id}`} className="relative aspect-[2/3] w-[140px] sm:w-[160px] overflow-hidden rounded-xl bg-zinc-900 shadow-2xl ring-1 ring-white/10 transition-all duration-300 group-hover:-translate-y-4 group-hover:shadow-[0_20px_40px_rgba(255,255,255,0.15)] group-hover:ring-white/30 z-10 ml-8 sm:ml-12 cursor-pointer">
                {anime.img ? (
                  <img
                    src={anime.img}
                    alt={anime.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 transition-transform duration-700 ease-out group-hover:scale-110">
                    <span className="text-4xl font-black text-white/20 tracking-tighter select-none">{getInitials(anime.title)}</span>
                  </div>
                )}
                
                {/* Play Overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
                  <PlayCircle className="w-12 h-12 text-white transform scale-50 group-hover:scale-100 transition-all duration-300" strokeWidth={1} />
                </div>

                {/* Score */}
                {anime.score && (
                  <div className="absolute top-2 right-2 glass-panel px-2 py-0.5 rounded-md text-[10px] font-bold text-green-400">
                    {(anime.score / 10).toFixed(1)}
                  </div>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}