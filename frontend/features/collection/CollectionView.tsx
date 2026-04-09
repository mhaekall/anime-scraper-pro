// features/collection/CollectionView.tsx — Watchlist management

"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { useWatchlist, useToast } from "@/core/stores/app-store";
import { IconBookmark, IconCheck, IconTrash } from "@/ui/icons";
import { useMounted } from "@/core/hooks/use-mounted";

const TABS = [
  { id: "watching" as const, label: "Ditonton" },
  { id: "plan_to_watch" as const, label: "Disimpan" },
  { id: "completed" as const, label: "Selesai" },
];

export default function CollectionView() {
  const mounted = useMounted();
  const { items, updateStatus, remove } = useWatchlist();
  const { toast } = useToast();
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("watching");

  if (!mounted) return null;

  const filtered = items.filter((w) => w.status === tab).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="min-h-screen pb-24">
      <div className="pt-10 px-5 md:px-8 mb-5 sticky top-0 bg-black/90 backdrop-blur-xl z-20 pb-3 border-b border-white/5">
        <h1 className="text-3xl font-black text-white mb-5">Ruang Tonton</h1>
        <div className="flex bg-[#1c1c1e] p-1 rounded-2xl border border-white/5 relative">
          {TABS.map((t, i) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 text-[13px] font-bold rounded-xl z-10 transition-colors ${tab === t.id ? "text-white" : "text-[#8e8e93]"}`}>
              {t.label} <span className="ml-1 text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">{items.filter((w) => w.status === t.id).length}</span>
            </button>
          ))}
          <div className="absolute top-1 bottom-1 bg-[#2c2c2e] rounded-xl transition-all duration-300" style={{ width: `calc(33.333% - 4px)`, transform: `translateX(calc(${TABS.findIndex((t) => t.id === tab) * 100}% + ${TABS.findIndex((t) => t.id === tab) * 4}px))` }} />
        </div>
      </div>

      <div className="px-5 md:px-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center pt-20 text-center anim-fade">
            <IconBookmark className="w-10 h-10 text-[#48484a]" />
            <h3 className="text-white font-black text-lg mt-4">Masih Kosong</h3>
            <p className="text-[#8e8e93] text-sm">Tambahkan anime ke kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 anim-fade mt-4">
            {filtered.map((item) => (
              <div key={item.id} className="flex gap-4 p-3 bg-[#1c1c1e] rounded-3xl border border-white/5 group hover:border-white/10 transition-colors">
                <Link href={`/anime/${item.id}`} className="w-[80px] h-[110px] rounded-2xl bg-[#2c2c2e] bg-cover bg-center shrink-0 border border-white/10" style={item.img ? { backgroundImage: `url(${item.img})` } : undefined} />
                <div className="flex-1 min-w-0 py-1 flex flex-col">
                  <Link href={`/anime/${item.id}`} className="text-white font-bold text-[15px] line-clamp-2 mb-1">{item.title}</Link>

                  {tab === "watching" && item.totalEps && item.totalEps > 0 && (
                    <div className="mt-auto mb-2">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[11px] font-bold text-[#0A84FF]">Ep {item.progress || 0} <span className="text-[#8e8e93]">/ {item.totalEps}</span></span>
                        <div className="flex gap-1">
                          <button onClick={() => updateStatus(item.id, undefined, Math.max(0, (item.progress || 0) - 1))} className="w-6 h-6 bg-[#2c2c2e] rounded text-white font-bold active:scale-90">-</button>
                          <button onClick={() => updateStatus(item.id, undefined, Math.min(item.totalEps!, (item.progress || 0) + 1))} className="w-6 h-6 bg-[#0A84FF] rounded text-white font-bold active:scale-90">+</button>
                        </div>
                      </div>
                      <div className="h-1 bg-[#2c2c2e] rounded-full overflow-hidden"><div className="h-full bg-[#0A84FF] rounded-full transition-all" style={{ width: `${((item.progress || 0) / item.totalEps) * 100}%` }} /></div>
                    </div>
                  )}
                  {tab === "completed" && <p className="text-[#30D158] text-[11px] font-bold mt-auto flex items-center gap-1"><IconCheck className="w-3 h-3" /> Tamat</p>}

                  <div className="flex gap-2 mt-2 pt-2 border-t border-[#2c2c2e]">
                    {tab !== "watching" && <button onClick={() => { updateStatus(item.id, "watching"); toast("Dipindahkan ke Ditonton", "success"); }} className="flex-1 py-1 bg-[#2c2c2e] rounded-lg text-[10px] font-bold text-white">Tonton</button>}
                    {tab !== "completed" && <button onClick={() => { updateStatus(item.id, "completed", item.totalEps); toast("Ditandai Tamat", "success"); }} className="flex-1 py-1 bg-[#2c2c2e] rounded-lg text-[10px] font-bold text-[#30D158]">Tamat</button>}
                    <button onClick={() => { remove(item.id); toast("Dihapus", "error"); }} className="px-3 py-1 bg-[#FF453A]/10 text-[#FF453A] rounded-lg"><IconTrash className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
