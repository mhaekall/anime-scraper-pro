"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/Icons";
import { useThemeContext } from "@/components/ThemeProvider";
import { EpisodeList } from "@/components/EpisodeList";

interface AnimeDetailClientProps {
  detail: any;
  id: string;
}

export default function AnimeDetailClient({ detail, id }: AnimeDetailClientProps) {
  const router = useRouter();
  const { settings, watchlist, toggleWatchlist } = useThemeContext();
  const [activeTab, setActiveTab] = useState('overview');

  const episodes = detail?.episodes || [];
  const seriesTitle = detail?.title || "Detail Anime";
  const poster = detail?.poster || "";
  const banner = detail?.banner || poster;
  const synopsis = detail?.synopsis || "";
  const score = detail?.score;
  const genres = detail?.genres || [];
  const status = detail?.status;
  const totalEpisodes = detail?.totalEpisodes;
  const season = detail?.season;
  const seasonYear = detail?.seasonYear;
  const studios = detail?.studios || [];

  const isSaved = !!watchlist.find(w => w.id === id);
  const c = settings.accentColor;
  
  // Clean synopsis
  const cleanDesc = synopsis.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, '').trim();

  return (
    <main className="min-h-screen bg-[#000000] pb-32 text-white overflow-hidden overflow-y-auto hide-scrollbar">
      
      {/* Hero Header */}
      <div className="w-full h-[300px] md:h-[400px] relative bg-[#1C1C1E] flex-shrink-0 animate-fade-in">
        <img src={banner} className="w-full h-full object-cover opacity-60 mix-blend-screen" alt="banner" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 100%, ${c}, transparent 60%)` }} />
        
        <button onClick={() => router.back()} className="absolute top-12 left-5 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 active:scale-90 z-20">
          <Icons.Back />
        </button>
      </div>

      <div className="px-5 md:px-10 pb-10 -mt-20 md:-mt-24 relative z-10 max-w-5xl mx-auto">
        {/* Title & Cover Row */}
        <div className="flex flex-col md:flex-row gap-5 md:gap-8 mb-8 animate-slide-up">
          <div className="w-[120px] md:w-[180px] aspect-[2/3] rounded-[20px] md:rounded-[24px] shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-white/10 overflow-hidden flex-shrink-0 bg-[#1C1C1E]">
            <img src={poster} alt="cover" className="w-full h-full object-cover" />
          </div>
          
          <div className="pt-2 md:pt-12 flex-1 min-w-0">
            <h1 className="text-[28px] md:text-[42px] font-black text-white leading-[1.1] mb-4 text-balance drop-shadow-lg">{seriesTitle}</h1>
            
            <div className="flex items-center gap-3 text-[12px] md:text-[14px] font-semibold flex-wrap mb-6">
              {score && <span className="text-[#30D158] flex items-center gap-1"><Icons.Star filled cls="w-4 h-4" /> {(score / 10).toFixed(1)}</span>}
              {score && <span className="text-[#48484A]">•</span>}
              <span className="text-[#E5E5EA]">{status === 'RELEASING' ? 'ONGOING' : status === 'FINISHED' ? 'TAMAT' : status || 'TBA'}</span>
              <span className="text-[#48484A]">•</span>
              <span className="text-[#E5E5EA]">{seasonYear || '2024'}</span>
              <span className="text-[#48484A]">•</span>
              <span className="text-[#E5E5EA]">{episodes.length} Eps</span>
              <span className="px-1.5 py-0.5 border border-[#48484A] rounded text-[#8E8E93] ml-1">HD</span>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              {episodes.length > 0 ? (
                <Link href={`/watch/${id}/${episodes[0].url.replace(/\/$/, '').substring(episodes[0].url.replace(/\/$/, '').lastIndexOf('/') + 1)}`} className="flex-1 md:flex-none">
                  <button className="w-full md:px-12 py-3.5 rounded-[16px] text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform" style={{ backgroundColor: c }}>
                    <Icons.Play cls="w-5 h-5" /> Putar Eps 1
                  </button>
                </Link>
              ) : (
                <button disabled className="flex-1 md:flex-none md:px-12 py-3.5 rounded-[16px] text-[#8E8E93] bg-[#1C1C1E] font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                  Belum Tersedia
                </button>
              )}

              <button 
                onClick={() => toggleWatchlist({ id, title: seriesTitle, img: poster, totalEps: totalEpisodes || episodes.length })} 
                className={`w-14 md:w-auto md:px-6 py-3.5 rounded-[16px] flex items-center justify-center gap-2 transition-all active:scale-95 border ${isSaved ? 'bg-white/15 border-white/30 text-white' : 'bg-[#1C1C1E] border-white/10 text-[#8E8E93]'}`}
              >
                <Icons.Bookmark a={isSaved} /> <span className="hidden md:inline font-bold">{isSaved ? 'Tersimpan' : 'Simpan'}</span>
              </button>
              
              <button className="w-14 py-3.5 rounded-[16px] bg-[#1C1C1E] flex items-center justify-center border border-white/10 active:scale-95 text-[#8E8E93] hover:text-white transition-colors">
                <Icons.Share />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-white/10 mb-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {[['overview', 'Ringkasan'], ['episodes', 'Episode']].map(([tabId, label]) => (
            <button key={tabId} onClick={() => setActiveTab(tabId)} className={`pb-3 text-[15px] font-bold border-b-2 transition-colors ${activeTab === tabId ? 'text-white border-white' : 'text-[#8E8E93] border-transparent hover:text-[#D1D1D6]'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px] animate-slide-up" style={{ animationDelay: '200ms' }}>
          {activeTab === 'overview' && (
            <div className="space-y-6 md:space-y-8 animate-fade-in">
              <div>
                <p className="text-[#E5E5EA] text-[14px] md:text-[15px] leading-relaxed whitespace-pre-line">{cleanDesc || 'Sinopsis tidak tersedia.'}</p>
              </div>
              
              {genres.length > 0 && (
                <div>
                  <h3 className="text-white font-bold mb-3">Genre</h3>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((g: string) => <span key={g} className="px-4 py-1.5 bg-[#1C1C1E] text-[#D1D1D6] text-[13px] font-medium rounded-full border border-white/5">{g}</span>)}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5">
                  <p className="text-[#8E8E93] text-[11px] uppercase tracking-wider mb-1">Status</p>
                  <p className="text-white font-bold">{status === 'FINISHED' ? 'Selesai' : status === 'RELEASING' ? 'Tayang' : 'TBA'}</p>
                </div>
                <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5">
                  <p className="text-[#8E8E93] text-[11px] uppercase tracking-wider mb-1">Studio</p>
                  <p className="text-white font-bold capitalize line-clamp-1">{studios.length > 0 ? studios[0] : '-'}</p>
                </div>
                <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5">
                  <p className="text-[#8E8E93] text-[11px] uppercase tracking-wider mb-1">Musim</p>
                  <p className="text-white font-bold capitalize">{season ? `${season.toLowerCase()} ${seasonYear}` : '-'}</p>
                </div>
                <div className="bg-[#1C1C1E] rounded-[16px] p-4 border border-white/5">
                  <p className="text-[#8E8E93] text-[11px] uppercase tracking-wider mb-1">Rating</p>
                  <p className="text-[#0A84FF] font-bold">{score ? `${score} / 10` : '-'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'episodes' && (
            <EpisodeList episodes={episodes} animeId={id} coverImage={poster} />
          )}
        </div>
      </div>
    </main>
  );
}
