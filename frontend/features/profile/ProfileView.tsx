// features/profile/ProfileView.tsx — Lightweight profile page

"use client";

import { useMemo, useState, memo } from "react";
import { useSettings, ACCENT_COLORS, useWatchlist } from "@/core/stores/app-store";
import { useWatchHistory } from "@/core/hooks/use-watch-history";
import { IconSettings, IconCheck } from "@/ui/icons";
import { BottomSheet } from "@/ui/overlays/BottomSheet";
import { useMounted } from "@/core/hooks/use-mounted";

export default function ProfileView() {
  const mounted = useMounted();
  const { settings, setSetting } = useSettings();
  const { items: watchlist } = useWatchlist();
  const { history } = useWatchHistory();
  const [showSettings, setShowSettings] = useState(false);

  const stats = useMemo(() => {
    const completed = watchlist.filter((w) => w.status === "completed").length;
    const totalEps = history.length + watchlist.reduce((a, c) => a + (c.progress || 0), 0);
    const days = ((totalEps * 24) / 60 / 24).toFixed(1);
    return { completed, totalEps, days };
  }, [watchlist, history]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-24">
      <div className="pt-10 px-5 md:px-8 mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-black text-white">Profil</h1>
        <button onClick={() => setShowSettings(true)} className="w-10 h-10 bg-[#1c1c1e] rounded-full flex items-center justify-center border border-white/10 text-white active:scale-90"><IconSettings /></button>
      </div>

      <div className="px-5 md:px-8 max-w-3xl mx-auto">
        {/* Profile Card */}
        <div className="rounded-3xl p-6 bg-gradient-to-br from-[#1c1c1e] to-[#0a0c10] border border-white/10 relative overflow-hidden mb-6 anim-fade">
          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full blur-[60px] opacity-25 pointer-events-none" style={{ backgroundColor: settings.accentColor }} />
          <div className="flex items-center gap-5 relative z-10">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/15 bg-[#2c2c2e]">
              <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Guest`} alt="avatar" className="w-full h-full object-cover bg-white" loading="lazy" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-1">Guest</h2>
              <span className="px-2.5 py-0.5 bg-white text-black text-[10px] font-black rounded uppercase tracking-widest">FREE TIER</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-white/10 relative z-10">
            <div><p className="text-[#8e8e93] text-[10px] uppercase tracking-wider mb-0.5 font-bold">Selesai</p><p className="text-white text-2xl font-black tabular-nums">{stats.completed}</p></div>
            <div><p className="text-[#8e8e93] text-[10px] uppercase tracking-wider mb-0.5 font-bold">Episode</p><p className="text-white text-2xl font-black tabular-nums">{stats.totalEps}</p></div>
            <div><p className="text-[#8e8e93] text-[10px] uppercase tracking-wider mb-0.5 font-bold">Waktu</p><p className="text-2xl font-black tabular-nums" style={{ color: settings.accentColor }}>{stats.days}<span className="text-sm text-white ml-0.5">Hari</span></p></div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <BottomSheet open={showSettings} onClose={() => setShowSettings(false)} title="Pengaturan" full>
        <div className="p-6 space-y-6 anim-fade">
          <section>
            <h3 className="text-[#8e8e93] text-[12px] font-bold tracking-wider uppercase mb-2">Warna Aksen</h3>
            <div className="bg-[#1c1c1e] rounded-2xl p-4 border border-white/5">
              <div className="flex gap-3 flex-wrap">
                {ACCENT_COLORS.map((c) => (
                  <button key={c.id} onClick={() => setSetting("accentColor", c.hex)} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${settings.accentColor === c.hex ? "ring-2 ring-white scale-110" : "hover:scale-105"}`} style={{ backgroundColor: c.hex }}>
                    {settings.accentColor === c.hex && <IconCheck className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[#8e8e93] text-[12px] font-bold tracking-wider uppercase mb-2">Video</h3>
            <div className="bg-[#1c1c1e] rounded-2xl border border-white/5 divide-y divide-[#2c2c2e]">
              <div className="flex items-center justify-between p-4">
                <span className="text-white text-[14px]">Kualitas Default</span>
                <select value={settings.videoQuality} onChange={(e) => setSetting("videoQuality", e.target.value)} className="bg-transparent font-medium text-[14px] outline-none text-right" style={{ color: settings.accentColor }}>
                  {["Auto", "1080p", "720p", "480p"].map((q) => <option key={q} value={q} className="bg-[#2c2c2e] text-white">{q}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between p-4">
                <span className="text-white text-[14px]">Putar Otomatis</span>
                <Toggle checked={settings.autoPlayNext} onChange={(v) => setSetting("autoPlayNext", v)} accent={settings.accentColor} />
              </div>
            </div>
          </section>

          <section>
            <div className="bg-[#1c1c1e] rounded-2xl border border-white/5">
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-4 text-left text-[#FF453A] font-medium text-[14px]">
                Hapus Semua Data (Reset)
              </button>
            </div>
          </section>

          <p className="text-center text-[#48484a] text-[11px] pt-3">AnimeScraper Pro v2 — Dibuat di Indonesia 🇮🇩</p>
        </div>
      </BottomSheet>
    </div>
  );
}

// Tiny toggle component
function Toggle({ checked, onChange, accent }: { checked: boolean; onChange: (v: boolean) => void; accent: string }) {
  return (
    <button onClick={() => onChange(!checked)} className="w-11 h-6 rounded-full relative transition-colors" style={{ backgroundColor: checked ? accent : "#3a3a3c" }}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}
