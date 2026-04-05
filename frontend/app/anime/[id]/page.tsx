import Link from "next/link";
import { PlayCircle, ArrowLeft, Clock, Star } from "lucide-react";
import { EpisodeList } from "@/components/EpisodeList";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function AnimeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detail: any = null;

  try {
    const url = `https://o.oploverz.ltd/series/${id}/`;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://jonyyyyyyyu-anime-scraper-api.hf.space";
    const res = await fetch(`${API_URL}/api/series-detail?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = await res.json();
      detail = data.data;
    }
  } catch (error) {
    console.error("Fetch series-detail error:", error);
  }

  const episodes = detail?.episodes || [];
  const seriesTitle = detail?.title || "Daftar Episode";
  const poster = detail?.poster || "";
  const banner = detail?.banner || poster; // Fallback to poster if no banner
  const synopsis = detail?.synopsis || "";
  const score = detail?.score;
  const genres = detail?.genres || [];

  return (
    <main className="min-h-screen bg-black pb-24 text-white">
      {/* Immersive Hero Section */}
      <div className="relative w-full min-h-[500px] overflow-hidden rounded-b-[3rem] bg-zinc-900 border-b border-white/5">
        <div className="absolute inset-0">
          {banner && (
             <img src={banner} alt={seriesTitle} className="w-full h-full object-cover opacity-50 blur-sm scale-105" />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        
        <div className="relative bottom-0 left-0 w-full p-6 pt-20 sm:p-12 max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8 text-center md:text-left">
          {poster && (
            <div className="relative w-32 sm:w-56 aspect-[2/3] shrink-0 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] ring-1 ring-white/10 z-10">
               <img src={poster} alt={seriesTitle} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col gap-4 w-full items-center md:items-start z-10">
             <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-white/60 hover:text-white transition-colors w-fit">
                <div className="glass-panel p-2 rounded-full hover:bg-white/10 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> 
                </div>
                Kembali
             </Link>
             
             {genres.length > 0 && (
               <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                 {score && (
                   <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full border border-green-500/30">
                     <Star className="w-3 h-3" fill="currentColor" /> {(score / 10).toFixed(1)}
                   </span>
                 )}
                 {genres.map((g: string, i: number) => (
                   <span key={i} className="px-3 py-1 bg-white/10 text-white/80 text-xs font-bold uppercase tracking-wider rounded-full backdrop-blur-sm border border-white/10">
                     {g}
                   </span>
                 ))}
               </div>
             )}

             <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg text-balance leading-tight">{seriesTitle}</h1>
             
             {synopsis ? (
               <div 
                 className="text-sm sm:text-base text-white/70 line-clamp-3 md:line-clamp-4 leading-relaxed max-w-3xl font-medium prose prose-invert"
                 dangerouslySetInnerHTML={{ __html: synopsis }}
               />
             ) : (
               <p className="text-sm sm:text-base text-white/60 line-clamp-3 md:line-clamp-4 leading-relaxed max-w-3xl font-medium">
                 Tidak ada sinopsis resmi yang tersedia untuk seri anime ini.
               </p>
             )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white/90">
            Daftar Episode
          </h2>
          <p className="text-zinc-500 font-medium flex items-center gap-2">
             <Clock className="w-4 h-4" /> Total {episodes.length} Episode Tersedia
          </p>
        </div>
        
        <EpisodeList episodes={episodes} animeId={id} />
      </div>
    </main>
  );
}