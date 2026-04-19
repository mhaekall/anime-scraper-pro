"use client";

import Link from "next/link";

const GENRES = [
  "Action", "Romance", "Fantasy", "Sci-Fi", "Comedy", "Drama", 
  "Horror", "Sports", "Mecha", "Slice of Life", "Mystery", "Psychological"
];

export function HomeGenreGrid() {
  return (
    <section className="mb-12 px-5 md:px-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Telusuri Genre</h2>
      </div>
      
      <div className="flex flex-wrap gap-2.5 anim-fade">
        {GENRES.map((g) => (
          <Link 
            key={g} 
            href={`/explore?genre=${encodeURIComponent(g)}`}
            className="px-4 py-2 bg-[#1c1c1e] hover:bg-white hover:text-black border border-white/10 rounded-full text-sm font-bold text-white/80 transition-colors duration-300 active:scale-95"
          >
            {g}
          </Link>
        ))}
      </div>
    </section>
  );
}
