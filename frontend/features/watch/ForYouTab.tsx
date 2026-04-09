"use client";

import { useState, useEffect } from "react";
import { EpisodeList } from "@/features/detail/EpisodeList";

interface Props {
  anilistId: string;
  allEpisodes: any[];
}

export function ForYouTab({ anilistId, allEpisodes }: Props) {
  // Mock ForYou content logic
  return (
    <div className="anim-fade p-4 space-y-6">
      <div>
        <h3 className="text-white font-bold text-sm mb-3">Lanjut Episode Berikutnya</h3>
        <EpisodeList episodes={allEpisodes.slice(0, 3)} animeId={anilistId} cover="" />
      </div>

      <div>
        <h3 className="text-white font-bold text-sm mb-3">Karena Kamu Nonton Ini</h3>
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="aspect-[3/4] bg-[#1c1c1e] rounded-xl overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center text-[#8e8e93] text-xs">Thumbnail</div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent p-2">
                <div className="h-3 w-16 bg-white/20 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
