"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VideoPlayer } from "@/ui/player/VideoPlayer";
import { AutoNextOverlay } from "@/ui/player/AutoNextOverlay";
import { IconBack, IconPlay } from "@/ui/icons";
import { CommentSection } from "./CommentSection";

interface Props {
  id: string;
  episode: string;
  title: string;
  poster: string;
  sources: any[];
  allEpisodes: any[];
  recommendations?: any[];
}

export default function WatchClient({ id, episode, title, poster, sources, allEpisodes, recommendations = [] }: Props) {
  const router = useRouter();
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const epNum = parseFloat(episode) || 1;

  // Assuming episodes are sorted ascending by number
  const sortedEpisodes = [...allEpisodes].sort((a, b) => a.number - b.number);
  const currentIndex = sortedEpisodes.findIndex(e => e.number === epNum);
  const nextEp = currentIndex > -1 && currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;

  const handleSeek = (time: number) => {
    const v = document.querySelector("video");
    if (v) v.currentTime = time;
  };

  // Scroll current episode into view on mount
  const epsContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showAllEpisodes) {
      const activeEp = epsContainerRef.current?.querySelector('[data-active="true"]');
      if (activeEp) {
        activeEp.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [showAllEpisodes]);

  return (
    <div className="w-full min-h-[100dvh] bg-black flex flex-col anim-fade items-center">
      
      {/* Sticky Player (Full Width) */}
      <div className="sticky top-0 z-[100] w-full bg-black shadow-xl border-b border-[#2c2c2e]/50 max-w-[1200px] mx-auto">
        <button onClick={() => router.back()} className="absolute top-4 left-4 z-50 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center text-white border border-white/10 active:scale-90 transition-transform"><IconBack /></button>
        <div className="relative w-full aspect-video flex flex-col justify-center min-h-0 bg-black overflow-hidden">
          <VideoPlayer 
            title={`${title} - Eps ${episode}`} 
            poster={poster} 
            sources={sources} 
            animeSlug={id} 
            episodeNum={epNum} 
            onRequireAutoNext={() => setShowAutoNext(true)} 
            onTimeUpdate={setCurrentTime} 
          />
          
          {showAutoNext && nextEp && (
            <AutoNextOverlay 
              nextEpisodeUrl={`/watch/${id}/${nextEp.number}`} 
              nextEpisodeTitle={`Episode ${nextEp.number} - ${nextEp.title || ''}`}
              nextThumbnail={nextEp.thumbnailUrl || poster}
              isLastEpisode={false}
              onCancel={() => setShowAutoNext(false)}
            />
          )}
          {showAutoNext && !nextEp && (
            <AutoNextOverlay 
              isLastEpisode={true} 
              onCancel={() => setShowAutoNext(false)} 
              nextEpisodeUrl="" 
              nextEpisodeTitle="" 
            />
          )}
        </div>
      </div>

      {/* Main Content Column */}
      <div className="w-full max-w-[1200px] p-4 lg:p-6 space-y-6 lg:space-y-8 flex flex-col min-w-0 pb-10">
        
        {/* Info */}
        <div>
          <h1 className="text-white font-black text-xl md:text-2xl leading-tight line-clamp-2">{title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[#0a84ff] font-bold text-sm bg-[#0a84ff]/10 px-2 py-0.5 rounded-md">Episode {episode}</span>
          </div>
        </div>

        {/* Episode List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-base md:text-lg tracking-tight">Episode ({allEpisodes.length})</h3>
            <button 
              onClick={() => setShowAllEpisodes(!showAllEpisodes)}
              className="text-[#0a84ff] text-sm font-bold bg-[#0a84ff]/10 hover:bg-[#0a84ff]/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              {showAllEpisodes ? "Tutup" : "Semua"}
            </button>
          </div>
          
          {showAllEpisodes ? (
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 anim-fade">
              {sortedEpisodes.map(ep => {
                const isActive = ep.number === epNum;
                return (
                  <Link 
                    key={ep.number} 
                    href={`/watch/${id}/${ep.number}`}
                    replace
                    prefetch={false}
                    className={`flex items-center justify-center w-full aspect-square rounded-[10px] border text-[14px] font-bold transition-all ${
                      isActive 
                        ? "bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.2)]" 
                        : "bg-[#1c1c1e] text-[#8e8e93] border-transparent hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {ep.number}
                  </Link>
                )
              })}
            </div>
          ) : (
            <div ref={epsContainerRef} className="flex gap-2.5 overflow-x-auto no-scrollbar pb-2 pt-1 px-1 -mx-1 snap-x">
              {sortedEpisodes.map(ep => {
                const isActive = ep.number === epNum;
                return (
                  <Link 
                    key={ep.number} 
                    href={`/watch/${id}/${ep.number}`}
                    data-active={isActive}
                    replace
                    prefetch={false}
                    className={`shrink-0 flex items-center justify-center min-w-[64px] px-4 h-12 rounded-[14px] border text-[15px] font-bold transition-all snap-start ${
                      isActive 
                        ? "bg-white text-black border-white shadow-[0_0_12px_rgba(255,255,255,0.2)]" 
                        : "bg-[#1c1c1e] text-[#8e8e93] border-transparent hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {isActive && <IconPlay className="w-4 h-4 text-black mr-1 -ml-1 fill-black" />}
                    {ep.number}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Comments Section (YouTube Style) */}
        <div className="pt-4 border-t border-[#2c2c2e]/50">
          <h3 className="text-white font-bold text-base md:text-lg mb-4 tracking-tight">Komentar</h3>
          <CommentSection anilistId={id} episode={episode} currentTime={currentTime} onSeek={handleSeek} />
        </div>

        {/* Recommendations (Horizontal Scroll) */}
        <div className="pt-4 border-t border-[#2c2c2e]/50 space-y-3">
          <h3 className="text-white font-bold text-base md:text-lg tracking-tight">Rekomendasi</h3>
          {recommendations && recommendations.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4 snap-x">
              {recommendations.slice(0, 10).map(rec => (
                <Link key={rec.id || rec.node?.id} href={`/anime/${rec.id || rec.node?.id}`} className="block group shrink-0 w-[140px] md:w-[160px] snap-start">
                  <div className="aspect-[3/4] bg-[#1c1c1e] rounded-xl overflow-hidden relative shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={rec.coverImage?.extraLarge || rec.coverImage?.large || rec.node?.coverImage?.large || poster} alt={rec.title?.userPreferred || rec.node?.title?.userPreferred || "Anime"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-0 inset-x-0 p-2.5">
                      <p className="text-white font-bold text-[12px] leading-tight line-clamp-2">{rec.title?.userPreferred || rec.title?.english || rec.node?.title?.userPreferred || "Anime"}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-[#8e8e93] text-sm">Belum ada rekomendasi.</div>
          )}
        </div>

      </div>
    </div>
  );
}
