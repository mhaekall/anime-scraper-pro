// features/profile/ProfileView.tsx — Integrated Profile & Settings
"use client";

import { useMemo, memo } from "react";
import { useSettings, ACCENT_COLORS, useWatchlist } from "@/core/stores/app-store";
import { useWatchHistory } from "@/core/hooks/use-watch-history";
import { IconCheck, IconSearch } from "@/ui/icons";
import { useMounted } from "@/core/hooks/use-mounted";
import { Moon, Sun } from "lucide-react";

export default function ProfileView() {
  const mounted = useMounted();
  const { settings, setSetting } = useSettings();
  const { items: watchlist } = useWatchlist();
  const { history } = useWatchHistory();

  const stats = useMemo(() => {
    const completed = watchlist.filter((w) => w.status === "completed").length;
    const totalEps = history.length + watchlist.reduce((a, c) => a + (c.progress || 0), 0);
    const days = ((totalEps * 24) / 60 / 24).toFixed(1);
    return { completed, totalEps, days };
  }, [watchlist, history]);

  if (!mounted) return null;

  const isDark = settings.theme === "dark";

  return (
    <div className="min-h-screen pb-32 pt-6 px-5 md:px-8 max-w-2xl mx-auto space-y-8">
      {/* Profile Card */}
      <div className={`rounded-[32px] p-8 ${isDark ? "bg-[#1c1c1e] border-white/5" : "bg-white border-black/5 shadow-xl"} border relative overflow-hidden anim-fade`}>
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none" style={{ backgroundColor: settings.accentColor }} />
        <div className="flex items-center gap-6 relative z-10">
          <div className="w-24 h-24 rounded-[24px] overflow-hidden border-4 border-white/10 shadow-2xl">
            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=Guest`} alt="avatar" className="w-full h-full object-cover bg-white" loading="lazy" />
          </div>
          <div>
            <h2 className={`text-3xl font-black ${isDark ? "text-white" : "text-black"} mb-1`}>Guest</h2>
            <div className="flex gap-2 items-center">
              <span className={`px-2 py-0.5 ${isDark ? "bg-white text-black" : "bg-black text-white"} text-[9px] font-black rounded uppercase tracking-widest`}>FREE TIER</span>
              <span className={`text-[10px] ${isDark ? "text-white/40" : "text-black/40"} font-bold`}>ID: 80475</span>
            </div>
          </div>
        </div>
        
        <div className={`grid grid-cols-3 gap-4 mt-8 pt-6 border-t ${isDark ? "border-white/10" : "border-black/5"} relative z-10`}>
          <div>
            <p className={`${isDark ? "text-white/40" : "text-black/40"} text-[10px] uppercase tracking-widest mb-1 font-black`}>Selesai</p>
            <p className={`${isDark ? "text-white" : "text-black"} text-3xl font-black tabular-nums`}>{stats.completed}</p>
          </div>
          <div>
            <p className={`${isDark ? "text-white/40" : "text-black/40"} text-[10px] uppercase tracking-widest mb-1 font-black`}>Episode</p>
            <p className={`${isDark ? "text-white" : "text-black"} text-3xl font-black tabular-nums`}>{stats.totalEps}</p>
          </div>
          <div>
            <p className={`${isDark ? "text-white/40" : "text-black/40"} text-[10px] uppercase tracking-widest mb-1 font-black`}>Waktu</p>
            <p className="text-3xl font-black tabular-nums" style={{ color: settings.accentColor }}>{stats.days}<span className={`text-xs ${isDark ? "text-white" : "text-black"} ml-1 opacity-60`}>H</span></p>
          </div>
        </div>
      </div>

      {/* Integrated Settings */}
      <div className="space-y-6 anim-fade">
        <section>
          <h3 className={`${isDark ? "text-white/40" : "text-black/40"} text-[11px] font-black tracking-widest uppercase mb-4 ml-2`}>Personalisasi</h3>
          <div className={`${isDark ? "bg-[#1c1c1e]" : "bg-white"} rounded-[24px] p-6 border ${isDark ? "border-white/5" : "border-black/5 shadow-md"} space-y-6`}>
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-black/5"}`}>
                  {isDark ? <Moon className="w-4 h-4 text-white" /> : <Sun className="w-4 h-4 text-black" />}
                </div>
                <span className={`font-bold text-[15px] ${isDark ? "text-white" : "text-black"}`}>Mode Tema</span>
              </div>
              <div className={`flex p-1 rounded-full ${isDark ? "bg-black/40" : "bg-black/5"} border ${isDark ? "border-white/5" : "border-black/5"}`}>
                <button 
                  onClick={() => setSetting("theme", "light")}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-black transition-all ${!isDark ? "bg-white text-black shadow-sm" : "text-white/40"}`}
                >
                  Terang
                </button>
                <button 
                  onClick={() => setSetting("theme", "dark")}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-black transition-all ${isDark ? "bg-[#2c2c2e] text-white shadow-sm" : "text-black/40"}`}
                >
                  Gelap
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <p className={`text-[13px] font-bold ${isDark ? "text-white/60" : "text-black/60"} mb-4`}>Warna Aksen</p>
              <div className="flex gap-3 flex-wrap">
                {ACCENT_COLORS.map((c) => (
                  <button 
                    key={c.id} 
                    onClick={() => setSetting("accentColor", c.hex)} 
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${settings.accentColor === c.hex ? "ring-2 ring-white scale-110 shadow-lg" : "hover:scale-110 opacity-80 hover:opacity-100"}`} 
                    style={{ backgroundColor: c.hex }}
                  >
                    {settings.accentColor === c.hex && <IconCheck className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className={`${isDark ? "text-white/40" : "text-black/40"} text-[11px] font-black tracking-widest uppercase mb-4 ml-2`}>Pengalaman Menonton</h3>
          <div className={`${isDark ? "bg-[#1c1c1e]" : "bg-white"} rounded-[24px] border ${isDark ? "border-white/5" : "border-black/5 shadow-md"} divide-y ${isDark ? "divide-white/5" : "divide-black/5"}`}>
            <div className="flex items-center justify-between p-5">
              <span className={`font-bold text-[14px] ${isDark ? "text-white" : "text-black"}`}>Kualitas Default</span>
              <select 
                value={settings.videoQuality} 
                onChange={(e) => setSetting("videoQuality", e.target.value)} 
                className={`bg-transparent font-black text-[14px] outline-none text-right cursor-pointer`}
                style={{ color: settings.accentColor }}
              >
                {["Auto", "1080p", "720p", "480p"].map((q) => <option key={q} value={q} className="bg-[#2c2c2e] text-white">{q}</option>)}
              </select>
            </div>
            <div className="flex items-center justify-between p-5">
              <span className={`font-bold text-[14px] ${isDark ? "text-white" : "text-black"}`}>Putar Otomatis</span>
              <Toggle checked={settings.autoPlayNext} onChange={(v) => setSetting("autoPlayNext", v)} accent={settings.accentColor} isDark={isDark} />
            </div>
            <div className="flex items-center justify-between p-5">
              <span className={`font-bold text-[14px] ${isDark ? "text-white" : "text-black"}`}>Lewati Intro</span>
              <Toggle checked={settings.skipIntro} onChange={(v) => setSetting("skipIntro", v)} accent={settings.accentColor} isDark={isDark} />
            </div>
          </div>
        </section>

        <section>
          <div className={`${isDark ? "bg-[#1c1c1e]/40" : "bg-red-50"} rounded-[24px] border ${isDark ? "border-red-500/20" : "border-red-500/10"}`}>
            <button 
              onClick={() => { if(confirm("Hapus semua riwayat dan koleksi?")) { localStorage.clear(); window.location.reload(); } }} 
              className="w-full p-5 text-center text-[#FF453A] font-black text-[14px] hover:bg-red-500/5 transition-colors rounded-[24px]"
            >
              Hapus Semua Data & Reset
            </button>
          </div>
        </section>

        <div className="text-center space-y-1">
          <p className={`${isDark ? "text-white/20" : "text-black/20"} text-[10px] font-black tracking-widest uppercase`}>AnimeScraper Pro v2.4.0</p>
          <p className={`${isDark ? "text-white/10" : "text-black/10"} text-[9px] font-bold`}>Didesain untuk efisiensi maksimal </p>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, accent, isDark }: { checked: boolean; onChange: (v: boolean) => void; accent: string; isDark: boolean }) {
  return (
    <button 
      onClick={() => onChange(!checked)} 
      className="w-12 h-7 rounded-full relative transition-all duration-300 shadow-inner" 
      style={{ backgroundColor: checked ? accent : (isDark ? "#2c2c2e" : "#e5e5ea") }}
    >
      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}
