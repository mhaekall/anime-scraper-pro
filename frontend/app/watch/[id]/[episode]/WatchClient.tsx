"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Player } from "@/components/Player";
import { EpisodeList } from "@/components/EpisodeList";
import { Icons } from "@/components/Icons";

interface WatchClientProps {
  id: string;
  episode: string;
  title: string;
  poster: string;
  sources: any[];
  allEpisodes: any[];
}

export default function WatchClient({ id, episode, title, poster, sources, allEpisodes }: WatchClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('episodes');
  const episodeDisplay = episode.replace(/-/g, ' ').toUpperCase();

  return (
    <div className="fixed inset-0 z-[300] bg-[#000000] flex flex-col md:flex-row animate-fade-in font-sans">
      {/* Left: Player Area */}
      <div 
        className="relative bg-black w-full md:flex-1 flex-shrink-0 md:h-full flex flex-col justify-center border-b border-[#2C2C2E] md:border-b-0"
        style={{ aspectRatio: typeof window !== 'undefined' && window.innerWidth < 768 ? '16/9' : 'auto' }}
      >
        {/* Back Button Overlay */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-50">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10 shadow-lg active:scale-90"
          >
            <Icons.Back />
          </button>
        </div>

        {sources.length > 0 ? (
          <Player 
            title={`${title} - Eps ${episodeDisplay}`} 
            sources={sources} 
            animeSlug={id}
            episodeNum={parseInt(episode.replace(/\D/g, '')) || 1}
            poster={poster}
          />
        ) : (
          <div className="w-full aspect-video flex flex-col items-center justify-center bg-[#1C1C1E] border border-white/5 shadow-2xl">
            <Icons.Info />
            <p className="text-[#8E8E93] font-bold text-[14px] mt-4">Gagal memuat video atau tautan rusak.</p>
          </div>
        )}
      </div>

      {/* Right: Side/Bottom Panel */}
      <div className="flex-1 md:w-[400px] lg:w-[450px] md:flex-none bg-[#0A0C10] flex flex-col md:border-l border-[#2C2C2E] relative z-10">
        {/* Tabs */}
        <div className="flex border-b border-[#2C2C2E] px-4 md:px-6 pt-4 md:pt-6 bg-[#000000]/80 backdrop-blur-xl sticky top-0 z-20">
          {[['episodes', 'Episodes'], ['comments', 'Komentar']].map(([tabId, label]) => (
            <button 
              key={tabId} 
              onClick={() => setActiveTab(tabId)} 
              className={`pb-3 mr-6 text-[15px] font-bold border-b-2 transition-colors ${activeTab === tabId ? 'text-white border-white' : 'text-[#8E8E93] border-transparent hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 pb-20">
          {activeTab === 'episodes' && (
            <div className="animate-fade-in">
              <div className="mb-6 flex flex-col gap-1">
                <h2 className="text-white font-black text-[20px] md:text-[24px] line-clamp-2 leading-tight drop-shadow-md">{title}</h2>
                <p className="text-[#8E8E93] text-[13px] font-medium tracking-wide">SEDANG DIPUTAR: EPISODE {episodeDisplay}</p>
              </div>
              <EpisodeList episodes={allEpisodes} animeId={id} coverImage={poster} />
            </div>
          )}
          
          {activeTab === 'comments' && (
            <div className="animate-fade-in flex flex-col items-center justify-center h-40 text-center gap-4 opacity-50 mt-10">
              <Icons.Info />
              <div>
                <h3 className="text-white font-bold text-[16px]">Komentar Belum Tersedia</h3>
                <p className="text-[#8E8E93] text-[13px] mt-1">Fitur interaksi sedang dalam pengembangan.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
