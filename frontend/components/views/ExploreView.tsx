"use client";

import useSWR from "swr";
import { LibraryGrid } from "@/components/LibraryGrid";
import { Icons } from "@/components/Icons";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ExploreView() {
  const { data, isLoading } = useSWR('/api/series', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000, // 10 minutes cache
  });

  const animes = data?.data || [];

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[var(--accent)] rounded-full animate-spin shadow-lg mb-4" />
        <h2 className="text-[20px] font-black tracking-tight text-white">Memuat Koleksi...</h2>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <LibraryGrid animes={animes} />
    </div>
  );
}
