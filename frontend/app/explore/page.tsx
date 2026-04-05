import { LibraryGrid } from "@/components/LibraryGrid";
import { Compass } from "lucide-react";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function ExplorePage() {
  let animes = [];

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://jonyyyyyyyu-anime-scraper-api.hf.space";
    const res = await fetch(`${API_URL}/api/series`);
    if (res.ok) {
      const data = await res.json();
      animes = data.data || [];
    }
  } catch (error) {
    console.error("Fetch series error:", error);
  }

  return (
    <main className="min-h-screen bg-black pb-24 text-white">
      <div className="relative w-full py-16 px-6 bg-zinc-900 border-b border-white/5 flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="glass-panel p-4 rounded-full mb-2 bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Compass className="w-10 h-10" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-xl">Eksplorasi Anime</h1>
          <p className="text-zinc-400 font-medium max-w-lg">Temukan ratusan judul anime dari A-Z. Gunakan fitur pencarian untuk menemukan anime favorit Anda dengan cepat.</p>
        </div>
      </div>
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
        <LibraryGrid animes={animes} />
      </div>
    </main>
  );
}
