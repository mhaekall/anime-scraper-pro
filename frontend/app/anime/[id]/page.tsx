import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import AnimeDetailClient from "./AnimeDetailClient";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function AnimeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let detail: any = null;
  let fetchError: string | null = null;

  try {
    const url = `https://o.oploverz.ltd/series/${id}`;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://jonyyyyyyyu-anime-scraper-api.hf.space";
    const res = await fetch(`${API_URL}/api/series-detail?url=${encodeURIComponent(url)}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      }
    });
    if (res.ok) {
      const data = await res.json();
      detail = data.data;
    } else {
      fetchError = `HTTP ${res.status}: ${await res.text()}`;
    }
  } catch (error: any) {
    console.error("Fetch series-detail error:", error);
    fetchError = error.message || String(error);
  }

  if (fetchError || !detail) {
    return (
      <main className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-white font-black text-2xl mb-2">Gagal Memuat Data</h1>
        <p className="text-[#8E8E93] text-sm max-w-md">{fetchError || 'Anime tidak ditemukan'}</p>
        <Link href="/" className="mt-6 px-6 py-3 bg-[#1C1C1E] border border-white/10 rounded-[16px] text-white font-bold">Kembali ke Beranda</Link>
      </main>
    );
  }

  return <AnimeDetailClient detail={detail} id={id} />;
}
