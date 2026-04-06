"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "./Icons";
import { AnimeCard } from "./AnimeCard";

export function RecommendationsGrid({ recommendations }: { recommendations: any[] }) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!recommendations || recommendations.length === 0) return null;

  // Render Skeleton or nothing on server to prevent hydration mismatch for heavy sliders
  if (!isMounted) return <div className="h-[200px] w-full mt-10"></div>;

  return (
    <div className="mt-12 animate-fade-in">
      <h3 className="text-white font-bold text-[20px] mb-4">More Like This</h3>
      <div className="flex gap-4 overflow-x-auto pb-6 snap-x hide-scrollbar">
        {recommendations.map((rec, idx) => {
          // Adapt the structure depending on typical recommendations format
          // Assuming { id, title, poster }
          const animeData = {
            title: rec.title,
            img: rec.poster || rec.image || rec.coverImage,
          };
          // Try to handle both slug and numeric ID if present
          const animeId = rec.id || rec.slug;

          return (
            <div key={idx} className="min-w-[140px] md:min-w-[160px] snap-center">
              <AnimeCard anime={animeData} id={animeId} idx={idx} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
