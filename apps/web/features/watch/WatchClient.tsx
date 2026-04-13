"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VideoPlayer } from "@/ui/player/VideoPlayer";
import { AutoNextOverlay } from "@/ui/player/AutoNextOverlay";
import { IconBack, IconPlay, IconCheck, IconStar, IconShare, IconBookmark } from "@/ui/icons";
import { CommentSection } from "./CommentSection";
import { useWatchlist } from "@/core/stores/app-store";
import { API } from "@/core/lib/api";

// Helper SVG icons for those missing in ui/icons
const HeartIcon = ({ size = 16, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);
const DownloadIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
);

interface Props {
  id: string;
  episode: string;
  title: string;
  poster: string;
  sources: any[];
  allEpisodes: any[];
  recommendations?: any[];
}

export default function WatchClient({ id, episode, title, poster, sources: initialSources, allEpisodes, recommendations = [] }: Props) {
  const router = useRouter();
  const [showAutoNext, setShowAutoNext] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [views] = useState(0);
  const epNum = parseFloat(episode) || 1;
  const [showSynopsis, setShowSynopsis] = useState(false);

  const { items, toggle } = useWatchlist();
  const isSaved = items.some(i => String(i.id) === id);

  const handleSave = () => {
    toggle({ id, title, img: poster, totalEps: allEpisodes.length });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${title} - Episode ${episode}`,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link disalin!");
    }
  };

  const handleLike = () => {
    setLiked(!liked);
    setLikes(prev => liked ? prev - 1 : prev + 1);
  };

  // Fetch stream secara async setelah halaman render
  const { data: streamData, isLoading: streamLoading, mutate } = useSWR(
    `stream-${id}-${episode}`,
    async () => {
      const res = await fetch(`${API}/api/v2/stream/sources?title=${encodeURIComponent(title)}&ep=${episode}&anilist_id=${id}`);
      if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.') as any;
        error.status = res.status;
        throw error;
      }
      return res.json();
    },
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      dedupingInterval: 60000, // Cache 1 menit
      onError: (err) => {
        if (err.status === 403 || err.status === 410) {
          mutate(); // Force revalidate if expired
        }
      }
    }
  );

  const sources = streamData?.sources ?? initialSources;
  const downloads = streamData?.downloads ?? [];

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
            isLoadingSources={streamLoading && sources.length === 0}
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
        
        {/* Title & Social Bar */}
        <div className="border-b border-white/10 pb-4">
          <h1 className="text-white font-black text-xl md:text-2xl leading-tight line-clamp-2">{title}</h1>
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-[#8e8e93] font-medium text-sm">{views}K views</span>
              <span className="w-1 h-1 rounded-full bg-[#8e8e93]" />
              <span className="text-[#0a84ff] font-bold text-sm bg-[#0a84ff]/10 px-2 py-0.5 rounded-md">Episode {episode}</span>
            </div>
            
            {/* Action Buttons (YouTube Style) */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${liked ? 'bg-[#ff453a]/20 text-[#ff453a]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <HeartIcon size={16} fill={liked ? "currentColor" : "none"} />
                {likes}
              </button>
              
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 font-bold text-sm text-white transition-colors"
              >
                <IconShare className="w-4 h-4" />
                Bagikan
              </button>
              
              <button 
                onClick={handleSave}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${isSaved ? 'bg-[#30d158]/20 text-[#30d158]' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                <IconBookmark className="w-4 h-4" filled={isSaved} />
                {isSaved ? 'Disimpan' : 'Simpan'}
              </button>

              {downloads.length > 0 && (
                <button 
                  onClick={() => document.getElementById('downloads-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 font-bold text-sm text-white transition-colors"
                >
                  <DownloadIcon size={16} />
                  Unduh
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Synopsis & Metadata Box */}
        <div 
          onClick={() => setShowSynopsis(!showSynopsis)}
          className={`bg-[#1c1c1e] rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-colors ${showSynopsis ? '' : 'line-clamp-2'}`}
        >
          <div className="text-sm text-[#e5e5ea] leading-relaxed">
            <span className="font-bold mr-2 text-white">Detail Anime:</span>
            Nikmati tontonan ini dengan kualitas terbaik. Jika ada masalah video, silakan ganti server atau resolusi melalui tombol pengaturan di pojok kanan bawah video player.
          </div>
          {showSynopsis && (
            <div className="mt-3 pt-3 border-t border-white/5 flex gap-4 text-xs text-[#8e8e93]">
              <div><span className="font-bold text-[#d1d1d6]">Studio:</span> Unknown</div>
              <div><span className="font-bold text-[#d1d1d6]">Tahun:</span> 2026</div>
            </div>
          )}
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
