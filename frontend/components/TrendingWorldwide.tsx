"use client";

import { Flame, Star } from "lucide-react";
import Link from "next/link";

const TRENDING_ANIME = [
  {
    id: "kimetsu-no-yaiba-infinity-castle", 
    title: "Demon Slayer: Infinity Castle",
    img: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx178942-d6qR71aK42H3.jpg",
    desc: "Trilogi film epik yang akan mengakhiri era Demon Slayer.",
    score: 92
  },
  {
    id: "jujutsu-kaisen-s3-the-culling-game-part-1",
    title: "Jujutsu Kaisen Season 3",
    img: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx172355-p6U3hGq5ZlQo.jpg",
    desc: "Culling Game Arc resmi dimulai. Pertarungan mematikan tanpa batas.",
    score: 90
  },
  {
    id: "one-piece",
    title: "One Piece: Elbaf Arc",
    img: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx21-YCDignZXekFI.jpg",
    desc: "Perjalanan Topi Jerami ke pulau raksasa legendaris, Elbaf.",
    score: 89
  },
  {
    id: "chainsaw-man-reze-arc",
    title: "Chainsaw Man: Reze Arc",
    img: "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx171008-tW6pDtbW95p7.jpg",
    desc: "Adaptasi sinematik arc paling emosional dari Chainsaw Man.",
    score: 88
  }
];

export function TrendingWorldwide() {
  return (
    <section className="flex flex-col gap-6 w-full relative z-10 my-8">
      <div className="flex items-center gap-2 mb-2">
        <Flame className="text-orange-500 w-7 h-7" fill="currentColor" />
        <h2 className="text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
          Global Trending 2026
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {TRENDING_ANIME.map((anime, idx) => (
          <div
            key={anime.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both"
            style={{ animationDelay: `${idx * 150}ms` }}
          >
            <Link href={`/explore`} className="group relative flex flex-col h-full overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(234,88,12,0.15)] hover:border-orange-500/30">
              
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10" />
                <img 
                  src={anime.img} 
                  alt={anime.title} 
                  className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute top-3 right-3 z-20 glass-panel px-2.5 py-1 rounded-full flex items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-orange-400">
                  <Star className="w-3 h-3" fill="currentColor" /> {(anime.score / 10).toFixed(1)}
                </div>
              </div>

              <div className="p-5 flex flex-col grow bg-gradient-to-b from-zinc-900 to-black">
                <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-orange-400 transition-colors">{anime.title}</h3>
                <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed">{anime.desc}</p>
                
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center text-xs font-medium text-orange-500/80 group-hover:text-orange-500 transition-colors uppercase tracking-widest">
                  Cari di Eksplor →
                </div>
              </div>
              
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
