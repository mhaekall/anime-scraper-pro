"use client";

import useSWR from "swr";
import { LibraryGrid } from "@/components/LibraryGrid";
import { Icons } from "@/components/Icons";

const fetcher = (url: string) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://jonyyyyyyyu-anime-scraper-api.hf.space";
  return fetch(`${API_URL}${url}`).then((res) => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  });
};

export function ExploreView() {
  const { data, error, isLoading } = useSWR('/api/series', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600000, // 10 minutes cache
  });

  const animes = data?.data || [];
  const debugError = error ? `Fetch failed: ${error.message}` : null;

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
      {debugError && (
        <div className="bg-[#FF453A]/20 border border-[#FF453A] text-[#FF453A] p-4 m-4 rounded-[16px] text-sm absolute top-20 left-0 right-0 z-50">
          <h2 className="font-bold">Backend Connection Error:</h2>
          <pre className="text-xs whitespace-pre-wrap">{debugError}</pre>
        </div>
      )}
      <LibraryGrid animes={animes} />
    </div>
  );
}
