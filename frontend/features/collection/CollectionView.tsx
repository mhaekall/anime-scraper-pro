// features/collection/CollectionView.tsx — Minimalist Watchlist (Apple HIG)

"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { useWatchlist, useToast } from "@/core/stores/app-store";
import { IconBookmark, IconCheck, IconTrash } from "@/ui/icons";
import { useMounted } from "@/core/hooks/use-mounted";

const TABS = [
  { id: "watching" as const, label: "Sedang Ditonton" },
  { id: "plan_to_watch" as const, label: "Daftar Tunggu" },
  { id: "completed" as const, label: "Telah Selesai" },
];

export default function CollectionView() {
  const mounted = useMounted();
  const { items, updateStatus, remove } = useWatchlist();
  const { toast } = useToast();
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("watching");

  if (!mounted) return null;

  const filtered = items.filter((w) => w.status === tab).sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="min-h-screen pb-32">
      {/* Sticky Tab Header — Zero padding top, ultra slim */}
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl px-5 md:px-8 pt-4 pb-4 border-b border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="flex bg-[#1c1c1e] p-1 rounded-[16px] border border-white/5 relative shadow-inner">
            {TABS.map((t) => (
              <button 
                key={t.id} 
                onClick={() => setTab(t.id)} 
                className={`flex-1 py-2 text-[12px] font-bold rounded-[12px] z-10 transition-all duration-300 ${tab === t.id ? "text-white" : "text-white/40 hover:text-white/60"}`}
              >
                {t.label}
                <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full transition-colors ${tab === t.id ? "bg-white/20 text-white" : "bg-white/5 text-white/30"}`}>
                  {items.filter((w) => w.status === t.id).length}
                </span>
              </button>
            ))}
            {/* Animated Background Slider */}
            <div 
              className="absolute top-1 bottom-1 bg-[#2c2c2e] rounded-[12px] shadow-lg transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" 
              style={{ 
                width: `calc(33.333% - 4px)`, 
                transform: `translateX(calc(${TABS.findIndex((t) => t.id === tab) * 100}% + ${TABS.findIndex((t) => t.id === tab) * 2}px))` 
              }} 
            />
          </div>
        </div>
      </div>

      <div className="px-5 md:px-8 pt-6 max-w-4xl mx-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center pt-24 text-center anim-fade">
            <div className="w-20 h-20 bg-[#1c1c1e] rounded-full flex items-center justify-center mb-6 border border-white/5">
              <IconBookmark className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-white font-bold text-xl">Belum ada koleksi</h3>
            <p className="text-white/40 text-sm mt-2 max-w-[200px]">Simpan anime yang ingin Anda tonton di sini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 anim-fade">
            {filtered.map((item) => (
              <div 
                key={item.id} 
                className="flex gap-4 p-4 bg-[#1c1c1e]/40 rounded-[28px] border border-white/5 hover:bg-[#1c1c1e]/60 hover:border-white/10 transition-all group overflow-hidden"
              >
                <Link href={`/anime/${item.id}`} className="w-[85px] h-[120px] rounded-[18px] bg-[#2c2c2e] overflow-hidden shrink-0 border border-white/10 relative">
                   <img 
                    src={item.img} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    loading="lazy"
                  />
                  {tab === "completed" && (
                    <div className="absolute top-1 right-1 bg-[#30D158] p-1 rounded-full shadow-lg">
                      <IconCheck className="w-2.5 h-2.5 text-black" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                  <div>
                    <Link href={`/anime/${item.id}`} className="text-white font-bold text-[16px] leading-tight line-clamp-2 hover:text-[#0A84FF] transition-colors">{item.title}</Link>
                    
                    {tab === "watching" && item.totalEps && item.totalEps > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[11px] font-bold text-[#0A84FF] tracking-wide uppercase">Kemajuan: {item.progress || 0}/{item.totalEps}</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-[#0A84FF] to-[#64D2FF] rounded-full transition-all duration-700" 
                            style={{ width: `${((item.progress || 0) / item.totalEps) * 100}%` }} 
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {tab === "watching" ? (
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => updateStatus(item.id, undefined, Math.max(0, (item.progress || 0) - 1))} 
                          className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/60 active:scale-90 transition-all border border-white/5"
                        >
                          <span className="text-lg leading-none">-</span>
                        </button>
                        <button 
                          onClick={() => updateStatus(item.id, undefined, Math.min(item.totalEps || 999, (item.progress || 0) + 1))} 
                          className="w-8 h-8 bg-[#0A84FF] hover:bg-[#0070E0] rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-lg shadow-[#0A84FF]/20"
                        >
                          <span className="text-lg leading-none">+</span>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => { updateStatus(item.id, "watching"); toast("Dipindahkan ke Ditonton", "success"); }} 
                        className="px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-[11px] font-bold text-white transition-all border border-white/5"
                      >
                        Tonton Sekarang
                      </button>
                    )}
                    
                    <button 
                      onClick={() => { remove(item.id); toast("Dihapus", "error"); }} 
                      className="w-8 h-8 ml-auto bg-white/5 hover:bg-[#FF453A]/10 rounded-full flex items-center justify-center text-white/20 hover:text-[#FF453A] transition-all border border-white/5"
                    >
                      <IconTrash className="w-3.5 h-3.5" />
                    </button>
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
