import { Player } from "@/components/Player";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock, ThumbsUp, ThumbsDown, Share2, Download, BookmarkPlus, MessageSquare } from "lucide-react";
import { HistoryTracker } from "@/components/HistoryTracker";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function WatchPage({ params }: { params: Promise<{ id: string, episode: string }> }) {
  const { id, episode } = await params;
  
  let sources = [];
  let title = `Episode ${episode.replace(/-/g, ' ')}`;
  let poster = "";
  let allEpisodes = [];
  let prevEp = null;
  let nextEp = null;

  try {
    const url = `https://o.oploverz.ltd/series/${id}/episode/${episode}/`;
    const seriesUrl = `https://o.oploverz.ltd/series/${id}/`;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://jonyyyyyyyu-anime-scraper-api.hf.space";
    
    // Fetch both scrape and details in parallel for max speed
    const [scrapeRes, detailRes] = await Promise.all([
      fetch(`${API_URL}/api/multi-source?title=${encodeURIComponent(id)}&ep=${encodeURIComponent(episode.replace(/\\D/g, ''))}&oploverz_url=${encodeURIComponent(url)}`),
      fetch(`${API_URL}/api/series-detail?url=${encodeURIComponent(seriesUrl)}`)
    ]);

    if (scrapeRes.ok) {
      const data = await scrapeRes.json();
      sources = data.sources || [];
      if (data.anime?.title) title = data.anime.title;
      if (data.anime?.poster) poster = data.anime.poster;
    }
    
    if (detailRes.ok) {
      const data = await detailRes.json();
      allEpisodes = data.data?.episodes || [];
      
      // Find current episode in the list (Oploverz usually lists newest first: 3, 2, 1)
      const currentIndex = allEpisodes.findIndex((ep: any) => {
        const cleanUrl = ep.url.replace(/\/$/, '');
        return cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1) === episode;
      });
      
      if (currentIndex !== -1) {
        // Next episode logically means episode N+1 (which is at currentIndex - 1 if newest first)
        if (currentIndex > 0) {
           const nextUrl = allEpisodes[currentIndex - 1].url.replace(/\/$/, '');
           nextEp = nextUrl.substring(nextUrl.lastIndexOf('/') + 1);
        }
        // Prev episode logically means episode N-1 (which is at currentIndex + 1 if newest first)
        if (currentIndex < allEpisodes.length - 1) {
           const prevUrl = allEpisodes[currentIndex + 1].url.replace(/\/$/, '');
           prevEp = prevUrl.substring(prevUrl.lastIndexOf('/') + 1);
        }
      }
    }
  } catch (error) {
    console.error("Fetch video sources error:", error);
  }

  const episodeDisplay = episode.replace(/-/g, ' ').toUpperCase();

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white/30 pb-24">
      <HistoryTracker id={id} epId={episode} title={title} poster={poster} />
      
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link href={`/anime/${id}`} className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors group">
            <div className="bg-white/5 p-2 rounded-full group-hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span>Kembali ke Detail</span>
          </Link>
          
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold tracking-widest">
            <Clock className="w-3 h-3" /> EPS {episodeDisplay}
          </div>
        </div>
        
        {/* Video Player */}
        <div className="mb-6 relative z-10 shadow-[0_30px_60px_rgba(0,0,0,0.8)]">
          {sources.length > 0 ? (
            <Player 
              title={`${title} - Eps ${episodeDisplay}`} 
              sources={sources} 
              animeSlug={id}
              episodeNum={parseInt(episode.replace(/\\D/g, '')) || 1}
            />
          ) : (
             <div className="w-full aspect-video flex flex-col gap-4 items-center justify-center bg-zinc-900 rounded-[2rem] border border-white/10 ring-1 ring-white/5">
                <p className="text-white/60 font-medium">Gagal memuat video atau tautan rusak.</p>
             </div>
          )}
        </div>

        {/* Video Controls & Social Actions Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-zinc-900/40 border border-white/5 p-4 sm:p-6 rounded-3xl mb-10">
          
          <div className="flex flex-col gap-1 w-full md:w-auto">
            <h1 className="text-xl sm:text-3xl font-extrabold text-white/90 line-clamp-1">{title}</h1>
            <p className="text-zinc-500 text-sm font-medium">Episode {episodeDisplay} • Resolusi Otomatis Tersedia</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start md:justify-end">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold transition-colors active:scale-95">
              <ThumbsUp className="w-4 h-4" /> <span className="hidden sm:inline">Suka</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold transition-colors active:scale-95">
              <ThumbsDown className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold transition-colors active:scale-95">
              <Share2 className="w-4 h-4" /> <span className="hidden sm:inline">Bagikan</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-semibold transition-colors active:scale-95">
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Unduh</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all active:scale-95">
              <BookmarkPlus className="w-4 h-4" /> Simpan
            </button>
          </div>
        </div>

        {/* Prev / Next Navigation */}
        <div className="grid grid-cols-2 gap-4 mb-12">
          {prevEp ? (
            <Link href={`/watch/${id}/${prevEp}`} className="flex flex-col gap-1 p-4 rounded-2xl border border-white/5 bg-zinc-900 hover:bg-zinc-800 transition-colors group text-left">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" /> Sebelumnya
              </span>
              <span className="text-sm font-semibold text-white/80 group-hover:text-white truncate">Episode {prevEp.replace(/-/g, ' ')}</span>
            </Link>
          ) : (
            <div className="flex flex-col gap-1 p-4 rounded-2xl border border-white/5 bg-zinc-900/50 opacity-50 cursor-not-allowed text-left">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Sebelumnya
              </span>
              <span className="text-sm font-semibold text-white/50">Tidak ada</span>
            </div>
          )}

          {nextEp ? (
            <Link href={`/watch/${id}/${nextEp}`} className="flex flex-col gap-1 p-4 rounded-2xl border border-white/5 bg-zinc-900 hover:bg-zinc-800 transition-colors group text-right items-end">
              <span className="text-xs text-blue-500 font-bold uppercase tracking-wider flex items-center gap-1">
                Selanjutnya <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-sm font-semibold text-white/80 group-hover:text-white truncate">Episode {nextEp.replace(/-/g, ' ')}</span>
            </Link>
          ) : (
            <div className="flex flex-col gap-1 p-4 rounded-2xl border border-white/5 bg-zinc-900/50 opacity-50 cursor-not-allowed text-right items-end">
              <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                Selanjutnya <ArrowRight className="w-3 h-3" />
              </span>
              <span className="text-sm font-semibold text-white/50">Episode Terakhir</span>
            </div>
          )}
        </div>

        {/* Comments Section (UI/UX Mockup for future implementation) */}
        <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <MessageSquare className="w-6 h-6 text-white/80" />
            <h3 className="text-xl font-bold text-white/90">Komentar (128)</h3>
          </div>
          
          <div className="flex gap-4 mb-10">
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
              ME
            </div>
            <div className="flex flex-col gap-3 w-full">
              <textarea 
                placeholder="Bagikan pendapatmu tentang episode ini..." 
                className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none min-h-[100px] transition-all"
              />
              <div className="flex justify-end">
                <button className="px-6 py-2 bg-white text-black font-bold rounded-full text-sm hover:scale-105 active:scale-95 transition-all">
                  Kirim Komentar
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Mock Comment 1 */}
            <div className="flex gap-4">
              <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" alt="User" className="w-10 h-10 shrink-0 rounded-full object-cover" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white/90">Kira Yoshikage</span>
                  <span className="text-xs text-zinc-500">2 jam yang lalu</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  Animasi di menit 14:20 bener-bener gila! Studio ngga main-main ngerjain episode ini 🔥
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <button className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> 45</button>
                  <button className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1"><ThumbsDown className="w-3 h-3" /></button>
                  <button className="text-xs font-semibold text-zinc-400 hover:text-white">Balas</button>
                </div>
              </div>
            </div>
            
            {/* Mock Comment 2 */}
            <div className="flex gap-4">
              <img src="https://i.pravatar.cc/150?u=a04258a2462d826712d" alt="User" className="w-10 h-10 shrink-0 rounded-full object-cover" />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white/90">AnimeLover99</span>
                  <span className="text-xs text-zinc-500">5 jam yang lalu</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  Akhirnya arc ini diadaptasi juga. Ngga sabar nunggu minggu depan! Ada yang tau manga chapter berapa setelah episode ini?
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <button className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> 12</button>
                  <button className="text-xs font-semibold text-zinc-400 hover:text-white flex items-center gap-1"><ThumbsDown className="w-3 h-3" /></button>
                  <button className="text-xs font-semibold text-zinc-400 hover:text-white">Balas</button>
                </div>
              </div>
            </div>
          </div>
          
          <button className="w-full mt-8 py-3 rounded-full border border-white/10 text-sm font-semibold text-white/70 hover:bg-white/5 hover:text-white transition-colors">
            Muat Komentar Lainnya
          </button>
        </div>

      </div>
    </main>
  );
}