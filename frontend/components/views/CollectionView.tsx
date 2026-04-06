"use client";

import { useState } from "react";
import Link from "next/link";
import { useThemeContext } from "@/components/ThemeProvider";
import { Icons } from "@/components/Icons";
import { DustDeleteCard } from "@/components/DustDeleteCard";

export default function CollectionClient() {
  const { watchlist, updateWatchlistStatus, removeFromWatchlist } = useThemeContext();
  const [activeTab, setActiveTab] = useState('watching');
  const [deletingId, setDeletingId] = useState<string | number | null>(null);

  const TABS = [
    { id: 'watching', label: 'Ditonton' },
    { id: 'plan_to_watch', label: 'Disimpan' },
    { id: 'completed', label: 'Selesai' }
  ];

  const filtered = watchlist.filter(w => w.status === activeTab).sort((a, b) => b.updatedAt - a.updatedAt);

  const handleRemove = (id: string | number) => {
    setDeletingId(id);
    // Real removal is handled by DustDeleteCard callback
  };

  return (
    <div className="h-full min-h-screen bg-[#000000] overflow-y-auto hide-scrollbar pb-32">
      <div className="pt-12 px-5 md:px-8 mb-6 sticky top-0 bg-[#000000]/90 backdrop-blur-xl z-20 pb-4 border-b border-white/5">
        <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight mb-6">Ruang Tonton</h1>
        
        {/* Custom Tab Selector */}
        <div className="flex bg-[#1C1C1E] p-1.5 rounded-[16px] border border-white/5 relative">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`flex-1 py-2.5 text-[14px] font-bold rounded-[12px] transition-all z-10 ${activeTab === t.id ? 'text-white shadow-md' : 'text-[#8E8E93] hover:text-[#D1D1D6]'}`}>
              {t.label}
              <span className="ml-2 text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full">{watchlist.filter(w => w.status === t.id).length}</span>
            </button>
          ))}
          {/* Animated Pill Background */}
          <div className="absolute top-1.5 bottom-1.5 bg-[#2C2C2E] rounded-[12px] transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" 
               style={{ width: `calc(33.333% - 4px)`, transform: `translateX(calc(${TABS.findIndex(t => t.id === activeTab) * 100}% + ${TABS.findIndex(t => t.id === activeTab) * 6}px))` }} />
        </div>
      </div>

      <div className="px-5 md:px-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in">
            <Icons.Bookmark a={false} />
            <h3 className="text-white font-black text-[20px] mt-4 mb-2">Masih Kosong</h3>
            <p className="text-[#8E8E93] text-[14px]">Tambahkan anime ke kategori ini.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
            {filtered.map(item => (
              <DustDeleteCard key={item.id} isDeleting={deletingId === item.id} onDeleted={() => { removeFromWatchlist(item.id); setDeletingId(null); }}>
                <div className="flex gap-4 p-3 bg-[#1C1C1E] rounded-[24px] border border-white/5 group hover:border-white/10 transition-colors">
                  <Link href={`/anime/${item.id}`} className="w-[90px] h-[120px] rounded-[16px] bg-[#2C2C2E] bg-cover bg-center cursor-pointer flex-shrink-0 border border-white/10" style={{ backgroundImage: `url(${item.coverImage?.large || item.img})` }} />
                  <div className="flex-1 min-w-0 py-1 flex flex-col">
                    <Link href={`/anime/${item.id}`} className="text-white font-bold text-[16px] line-clamp-2 mb-1 cursor-pointer">{item.title?.english || item.title?.romaji || item.title}</Link>
                    
                    {/* Progress Control */}
                    {activeTab === 'watching' && item.totalEps > 0 && (
                      <div className="mt-auto mb-2">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="text-[12px] font-bold text-[#0A84FF]">Ep {item.progress || 0} <span className="text-[#8E8E93] font-medium">/ {item.totalEps}</span></span>
                          <div className="flex gap-1">
                            <button onClick={() => updateWatchlistStatus(item.id, undefined, Math.max(0, (item.progress || 0) - 1))} className="w-6 h-6 bg-[#2C2C2E] rounded-md flex items-center justify-center text-white font-bold active:scale-90">-</button>
                            <button onClick={() => updateWatchlistStatus(item.id, undefined, Math.min(item.totalEps, (item.progress || 0) + 1))} className="w-6 h-6 bg-[#0A84FF] rounded-md flex items-center justify-center text-white font-bold active:scale-90">+</button>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#2C2C2E] rounded-full overflow-hidden">
                          <div className="h-full bg-[#0A84FF] rounded-full transition-all" style={{ width: `${((item.progress || 0) / item.totalEps) * 100}%` }} />
                        </div>
                      </div>
                    )}
                    {activeTab === 'plan_to_watch' && <p className="text-[#8E8E93] text-[12px] mt-auto">Ditambahkan {new Date(item.addedAt).toLocaleDateString('id-ID')}</p>}
                    {activeTab === 'completed' && <p className="text-[#30D158] text-[12px] font-bold mt-auto flex items-center gap-1"><Icons.Check cls="w-4 h-4" /> Tamat ({item.totalEps || '?'} Eps)</p>}

                    {/* Actions */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-[#2C2C2E]">
                      {activeTab !== 'watching' && <button onClick={() => updateWatchlistStatus(item.id, 'watching')} className="flex-1 py-1.5 bg-[#2C2C2E] rounded-[10px] text-[11px] font-bold text-white hover:bg-[#3A3A3C] transition-colors">Tonton</button>}
                      {activeTab !== 'completed' && <button onClick={() => updateWatchlistStatus(item.id, 'completed', item.totalEps)} className="flex-1 py-1.5 bg-[#2C2C2E] rounded-[10px] text-[11px] font-bold text-[#30D158] hover:bg-[#3A3A3C] transition-colors">Tamat</button>}
                      {activeTab !== 'dropped' && <button onClick={() => updateWatchlistStatus(item.id, 'dropped')} className="flex-1 py-1.5 bg-[#2C2C2E] rounded-[10px] text-[11px] font-bold text-[#FF453A] hover:bg-[#3A3A3C] transition-colors">Drop</button>}
                      <button onClick={() => handleRemove(item.id)} className="px-3 py-1.5 bg-[#FF453A]/10 text-[#FF453A] rounded-[10px] hover:bg-[#FF453A]/20 transition-colors"><Icons.Trash /></button>
                    </div>
                  </div>
                </div>
              </DustDeleteCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
