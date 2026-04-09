// features/detail/EpisodeList.tsx — Episode list with watch progress

"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { IconPlay, IconCheck, IconSort } from "@/ui/icons";
import { useSettings } from "@/core/stores/app-store";
import { useWatchHistory } from "@/core/hooks/use-watch-history";

interface Episode { title: string; url: string; number: number; provider?: string; thumbnailUrl?: string | null; }

function EpisodeListInner({ episodes, animeId, cover }: { episodes: Episode[]; animeId: string; cover?: string }) {
  const [reversed, setReversed] = useState(false);
  const [limit, setLimit] = useState(50);
  const accent = useSettings((s) => s.settings.accentColor);
  const { history } = useWatchHistory();

  if (!episodes?.length) return (
    <div className="bg-[#1c1c1e] p-10 text-center rounded-3xl text-[#8e8e93] border border-white/5">
      <IconPlay className="w-10 h-10 opacity-20 mx-auto mb-3" />
      Belum ada episode.
    </div>
  );

  const sorted = reversed ? [...episodes].reverse() : episodes;
  const view = sorted.slice(0, limit);

  return (
    <div className="flex flex-col gap-4 anim-fade">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-bold text-base">{episodes.length} Episode</h3>
        <button onClick={() => setReversed(!reversed)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1c1c1e] border border-white/10 rounded-lg text-[11px] font-bold text-white active:scale-95">
          <IconSort /> {reversed ? "Baru → Lama" : "Lama → Baru"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {view.map((ep, i) => {
          const epId = ep.url.replace(/\/$/, "").split("/").pop() || String(ep.number);
          const w = history.find((h) => h.animeSlug === animeId && h.episode.toString() === epId);
          const pct = w && w.durationSec > 0 ? (w.timestampSec / w.durationSec) * 100 : 0;

          return (
            <Link key={`${epId}-${i}`} href={`/watch/${animeId}/${epId}`} className="group block">
              <div className="flex gap-3 p-2.5 rounded-2xl bg-[#1c1c1e]/50 hover:bg-[#2c2c2e] border border-transparent hover:border-white/10 transition-all active:scale-[0.99]">
                <div className="w-[110px] aspect-video rounded-xl bg-[#2c2c2e] relative overflow-hidden shrink-0 border border-white/5">
                  {(ep.thumbnailUrl || cover) && <img src={ep.thumbnailUrl || cover!} className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500" alt="" loading="lazy" decoding="async" />}
                  {w?.completed && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><IconCheck className="w-5 h-5 text-white" /></div>}
                  {!w?.completed && pct > 0 && <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20"><div className="h-full" style={{ width: `${pct}%`, backgroundColor: accent }} /></div>}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white border border-white/20"><IconPlay className="w-3.5 h-3.5 ml-0.5" /></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className={`text-[13px] font-bold line-clamp-1 ${w ? "text-[#8e8e93]" : "text-[#e5e5ea] group-hover:text-white"}`}>{ep.title}</p>
                  <p className="text-[#8e8e93] text-[11px]">Episode {epId}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {limit < episodes.length && (
        <button onClick={() => setLimit((p) => p + 50)} className="w-full py-3 bg-[#1c1c1e] border border-white/10 text-white rounded-2xl font-bold text-sm active:scale-95">
          Muat Lebih ({episodes.length - limit} tersisa)
        </button>
      )}
    </div>
  );
}

export const EpisodeList = memo(EpisodeListInner);
