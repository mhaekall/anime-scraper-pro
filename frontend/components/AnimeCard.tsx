"use client";

import Link from "next/link";
import { Info, Image as ImageIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const GET_ANIME_COVER = `
  query ($search: String) {
    Media(search: $search, type: ANIME) {
      coverImage {
        extraLarge
        large
      }
    }
  }
`;

export function AnimeCard({ anime, id, idx, epId }: { anime: any, id: string, idx: number, epId?: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" } // Load image slightly before it comes into viewport
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    
    // If backend already provided an image, use it directly
    if (anime.img) {
      setImgUrl(anime.img);
      return;
    }

    const cleanTitle = anime.title.replace(/\b(episode|ep|sub indo|batch)\b/gi, '').trim();
    const cacheKey = `anilist_img_${cleanTitle}`;
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      if (cached !== 'null') setImgUrl(cached);
      return;
    }

    let isMounted = true;
    const fetchImg = async () => {
      try {
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: GET_ANIME_COVER, variables: { search: cleanTitle } })
        });
        const data = await res.json();
        const url = data?.data?.Media?.coverImage?.extraLarge || data?.data?.Media?.coverImage?.large || null;
        
        if (!isMounted) return;
        
        if (url) {
          setImgUrl(url);
          sessionStorage.setItem(cacheKey, url);
        } else {
          sessionStorage.setItem(cacheKey, 'null');
        }
      } catch (e) {
        console.error("Failed to fetch image for", cleanTitle);
      }
    };
    
    // Add slight random delay to prevent hitting AniList limit if user scrolls too fast
    const timer = setTimeout(() => fetchImg(), Math.random() * 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isVisible, anime]);

  const getInitials = (title: string) => {
    const parts = title.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return title.substring(0, 2).toUpperCase();
  };

  return (
    <div
      ref={ref}
      className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
      style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
    >
      <div className="group relative flex flex-col gap-3">
        <Link href={`/anime/${id}`} className="relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-xl ring-1 ring-white/10 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] group-hover:ring-white/30 block cursor-pointer">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={anime.title}
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 animate-in fade-in duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 transition-transform duration-700 ease-out group-hover:scale-110">
               {isVisible ? (
                 <div className="flex flex-col items-center gap-2 animate-pulse">
                    <ImageIcon className="w-8 h-8 text-white/20" />
                 </div>
               ) : (
                 <span className="text-4xl font-black text-white/20 tracking-tighter select-none">{getInitials(anime.title)}</span>
               )}
            </div>
          )}
          
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
            <div className="rounded-full bg-white/20 p-4 backdrop-blur-md transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
              <Info className="h-10 w-10 text-white" />
            </div>
          </div>
        </Link>

        <div className="flex flex-col gap-1 px-1">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white/90 group-hover:text-white transition-colors" title={anime.title}>
            {anime.title}
          </h3>
          {epId && (
            <Link href={`/watch/${id}/${epId}`} className="text-xs text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1 mt-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Tonton Eps {epId.replace(/-/g, ' ')}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
