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
    <main className="min-h-screen bg-[#000000] text-white">
      <LibraryGrid animes={animes} />
    </main>
  );
}
