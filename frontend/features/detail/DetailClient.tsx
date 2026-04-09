// features/detail/DetailClient.tsx — Anime detail page client component

"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconBack, IconPlay, IconBookmark, IconShare, IconStar } from "@/ui/icons";
import { useSettings, useWatchlist, useToast } from "@/core/stores/app-store";
import { EpisodeList } from "./EpisodeList";
import { AnimeCard } from "@/ui/cards/AnimeCard";

export default function DetailClient({ detail, id }: { detail: any; id: string }) {
  const router = useRouter();
  const accent = useSettings((s) => s.settings.accentColor);
  const { items, toggle } = useWatchlist();
  const { toast } = useToast();
  const [tab, setTab] = useState("overview");

  const d = detail;
  const saved = !!items.find((w) => String(w.id) === id);
  const desc = (d.synopsis || "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").trim();
  const eps = d.episodes || [];
  const recs = d.recommendations || [];

  const firstEp = eps.length > 0 ? eps[0].url.replace(/\/$/, "").split("/").pop() : null;

  return (
    <main className="min-h-screen bg-black pb-24 text-white overflow-y-auto no-scrollbar">
      {/* Hero */}
      <div className="w-full h-[280px] md:h-[360px] relative bg-[#1c1c1e] anim-fade">
        {(d.banner || d.poster) && <img src={d.banner || d.poster} className="w-full h-full object-cover opacity-50" alt="" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 100%, ${accent}, transparent 60%)` }} />
        <button onClick={() => router.back()} className="absolute top-10 left-5 w-9 h-9 bg-black/50 rounded-full flex items-center justify-center text-white border border-white/20 active:scale-90 z-20"><IconBack /></button>
      </div>

      <div className="px-5 md:px-8 -mt-16 relative z-10 max-w-4xl mx-auto">
        {/* Title row */}
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-6 anim-up">
          <div className="w-[100px] md:w-[160px] aspect-[2/3] rounded-2xl shadow-2xl border border-white/10 overflow-hidden shrink-0 bg-[#1c1c1e]">
            {d.poster && <img src={d.poster} alt="" className="w-full h-full object-cover" />}
          </div>
          <div className="pt-1 md:pt-10 flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-white leading-[1.1] mb-1">{d.title}</h1>
            {d.nativeTitle && <h2 className="text-sm text-[#8e8e93] mb-3">{d.nativeTitle}</h2>}
            <div className="flex items-center gap-2 text-[12px] font-semibold flex-wrap mb-4">
              {d.score && <span className="text-[#30D158] flex items-center gap-0.5"><IconStar /> {(d.score / 10).toFixed(1)}</span>}
              <span className="text-[#48484a]">•</span>
              <span className="text-[#e5e5ea]">{d.status === "RELEASING" ? "ONGOING" : d.status === "FINISHED" ? "TAMAT" : d.status || "TBA"}</span>
              <span className="text-[#48484a]">•</span>
              <span className="text-[#e5e5ea]">{eps.length} Eps</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {firstEp ? (
                <Link href={`/watch/${id}/${firstEp}`}><button className="px-8 py-3 rounded-2xl text-white font-bold flex items-center gap-2 text-sm active:scale-95" style={{ backgroundColor: accent }}><IconPlay /> Putar Eps 1</button></Link>
              ) : (
                <button disabled className="px-8 py-3 rounded-2xl text-[#8e8e93] bg-[#1c1c1e] font-bold text-sm cursor-not-allowed">Belum Tersedia</button>
              )}
              <button onClick={() => { const added = toggle({ id, title: d.title, img: d.poster, totalEps: d.totalEpisodes || eps.length }); toast(added ? "Ditambahkan" : "Dihapus", added ? "success" : "error"); }}
                className={`w-12 py-3 rounded-2xl flex items-center justify-center border active:scale-95 ${saved ? "bg-white/15 border-white/30 text-white" : "bg-[#1c1c1e] border-white/10 text-[#8e8e93]"}`}>
                <IconBookmark filled={saved} />
              </button>
              <button className="w-12 py-3 rounded-2xl bg-[#1c1c1e] flex items-center justify-center border border-white/10 text-[#8e8e93] active:scale-95"><IconShare /></button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-5 border-b border-white/10 mb-5 anim-up" style={{ animationDelay: "80ms" }}>
          {[["overview", "Ringkasan"], ["episodes", "Episode"]].map(([tid, label]) => (
            <button key={tid} onClick={() => setTab(tid)} className={`pb-2.5 text-[14px] font-bold border-b-2 transition-colors ${tab === tid ? "text-white border-white" : "text-[#8e8e93] border-transparent"}`}>{label}</button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[250px] anim-up" style={{ animationDelay: "140ms" }}>
          {tab === "overview" && (
            <div className="space-y-5 anim-fade">
              <p className="text-[#e5e5ea] text-[14px] leading-relaxed whitespace-pre-line">{desc || "Sinopsis tidak tersedia."}</p>
              {d.genres?.length > 0 && (
                <div><h3 className="text-white font-bold mb-2 text-sm">Genre</h3><div className="flex flex-wrap gap-2">{d.genres.map((g: string) => <span key={g} className="px-3 py-1 bg-[#1c1c1e] text-[#d1d1d6] text-[12px] font-medium rounded-full border border-white/5">{g}</span>)}</div></div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  ["Status", d.status === "FINISHED" ? "Selesai" : d.status === "RELEASING" ? "Tayang" : "TBA"],
                  ["Studio", d.studios?.join(", ") || "-"],
                  ["Musim", d.season ? `${d.season.toLowerCase()} ${d.seasonYear}` : "-"],
                  ["Rating", d.score ? `${d.score}/10` : "-"],
                ].map(([l, v]) => (
                  <div key={l} className="bg-[#1c1c1e] rounded-2xl p-3 border border-white/5">
                    <p className="text-[#8e8e93] text-[10px] uppercase tracking-wider mb-0.5">{l}</p>
                    <p className="text-white font-bold text-sm capitalize line-clamp-1">{v}</p>
                  </div>
                ))}
              </div>
              {recs.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-white font-bold text-base mb-3">Rekomendasi</h3>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-4">
                    {recs.map((r: any, i: number) => (
                      <div key={i} className="min-w-[120px]">
                        <AnimeCard id={String(r.id)} title={r.title} img={r.cover || r.poster || r.image} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === "episodes" && <EpisodeList episodes={eps} animeId={id} cover={d.poster} />}
        </div>
      </div>
    </main>
  );
}
