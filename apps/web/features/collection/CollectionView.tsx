// features/collection/CollectionView.tsx — Minimalist Watchlist (Apple HIG)

"use client";

import Link from "next/link";
import { useToast } from "@/core/stores/app-store";
import { useCollection } from "@/core/hooks/use-collection";
import { authClient } from "@/core/lib/auth-client";
import { IconBookmark, IconCheck, IconTrash } from "@/ui/icons";
import { useMounted } from "@/core/hooks/use-mounted";
import { AnimeCard } from "@/ui/cards/AnimeCard";

export default function CollectionView() {
  const mounted = useMounted();
  const { data: session } = authClient.useSession();
  const { items } = useCollection(session?.user?.id);

  if (!mounted) return null;

  const sortedItems = [...items].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="min-h-screen pb-32 bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl px-5 md:px-8 pt-6 pb-4 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">Koleksi Anime</h1>
          <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-bold text-white/80">
            {sortedItems.length} Judul
          </span>
        </div>
      </div>

      <div className="px-5 md:px-8 pt-6 max-w-7xl mx-auto">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center pt-24 text-center anim-fade">
            <div className="w-20 h-20 bg-[#1c1c1e] rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-xl">
              <IconBookmark className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-white font-bold text-xl">Belum ada koleksi</h3>
            <p className="text-white/40 text-sm mt-2 max-w-[200px]">Simpan anime yang ingin Anda tonton di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4 anim-fade">
            {sortedItems.map((item) => (
              <div key={item.id} className="w-full">
                <AnimeCard
                  id={String(item.id)}
                  title={item.title}
                  img={item.img || null}
                  totalEps={item.totalEps}
                  epId={item.progress ? String(item.progress) : undefined}
                  variant="vertical"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}