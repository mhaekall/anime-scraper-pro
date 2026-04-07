"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VideoPlayer } from "@/components/VideoPlayer";
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

export default function WatchClient({
  id, episode, title, poster, sources, allEpisodes,
}: WatchClientProps) {
  const router     = useRouter();
  const [tab, setTab] = useState("episodes");

  const epDisplay = episode.replace(/-/g, " ").toUpperCase();
  const epNum     = parseFloat(episode) || 1;

  return (
    <div className="fixed inset-0 z-[300] bg-[#000000] flex flex-col md:flex-row animate-fade-in">
      {/* ── left: player ── */}
      <div className="relative w-full md:flex-1 flex-shrink-0 bg-black flex flex-col justify-center border-b border-[#2C2C2E] md:border-b-0 md:h-full">
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-50 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 shadow-lg active:scale-90"
        >
          <Icons.Back />
        </button>

        <VideoPlayer
          title={`${title} - Eps ${epDisplay}`}
          poster={poster}
          sources={sources}
          animeSlug={id}
          episodeNum={epNum}
        />
      </div>

      {/* ── right: episode list ── */}
      <div className="flex-1 md:w-[400px] lg:w-[450px] md:flex-none bg-[#0A0C10] flex flex-col md:border-l border-[#2C2C2E]">
        {/* tab bar */}
        <div className="flex border-b border-[#2C2C2E] px-4 md:px-6 pt-4 md:pt-6 bg-[#000]/80 backdrop-blur-xl sticky top-0 z-20">
          {(["episodes", "comments"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 mr-6 text-[15px] font-bold border-b-2 transition-colors capitalize ${tab === t ? "text-white border-white" : "text-[#8E8E93] border-transparent hover:text-white"}`}
            >
              {t === "episodes" ? "Episode" : "Komentar"}
            </button>
          ))}
        </div>

        {/* content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar p-4 md:p-6 pb-20">
          {tab === "episodes" && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-white font-black text-[20px] md:text-[24px] line-clamp-2 leading-tight">{title}</h2>
                <p className="text-[#8E8E93] text-[13px] mt-1 font-medium tracking-wide">
                  SEDANG DIPUTAR: EPISODE {epDisplay}
                </p>
              </div>
              <EpisodeList episodes={allEpisodes} animeId={id} coverImage={poster} />
            </div>
          )}

          {tab === "comments" && (
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
