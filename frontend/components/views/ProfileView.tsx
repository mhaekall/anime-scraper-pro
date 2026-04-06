"use client";

import { authClient } from "@/lib/auth-client";
import { useState, useMemo } from "react";
import { Icons } from "@/components/Icons";
import { useThemeContext } from "@/components/ThemeProvider";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { SettingsModal } from "@/components/SettingsModal";

export default function ProfileClient() {
  const { data: session, isPending } = authClient.useSession();
  const { settings, watchlist } = useThemeContext();
  const { history } = useWatchHistory();
  const [loading, setLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const stats = useMemo(() => {
    const completed = watchlist.filter(w => w.status === 'completed').length;
    const totalWatchedEps = history.length + watchlist.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    const days = (totalWatchedEps * 24) / 60 / 24; // approx 24 mins per ep
    return { completed, totalWatchedEps, days: days.toFixed(1) };
  }, [watchlist, history]);

  const login = async () => {
    setLoading(true);
    await authClient.signIn.social({ provider: "google" });
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    await authClient.signOut();
    setLoading(false);
  };

  if (isPending) return <div className="min-h-screen bg-[#000000] pt-24 text-center text-white">Memuat profil...</div>;

  return (
    <div className="h-full min-h-screen bg-[#000000] overflow-y-auto hide-scrollbar pb-32">
      <div className="pt-12 px-5 md:px-8 mb-8 flex justify-between items-center">
        <h1 className="text-[32px] md:text-[40px] font-black text-white tracking-tight">Profil</h1>
        <button onClick={() => setShowSettingsModal(true)} className="w-12 h-12 bg-[#1C1C1E] rounded-full flex items-center justify-center border border-white/10 text-white hover:bg-[#2C2C2E] transition-colors active:scale-90 shadow-lg">
          <Icons.Settings />
        </button>
      </div>
      
      <div className="px-5 md:px-8 max-w-4xl mx-auto">
        {/* ID Card */}
        <div className="w-full rounded-[32px] p-6 md:p-8 bg-gradient-to-br from-[#1C1C1E] to-[#0A0C10] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden mb-8 group animate-fade-in">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-[80px] opacity-30 pointer-events-none transition-colors duration-1000" style={{ backgroundColor: settings.accentColor } as any} />
          
          <div className="flex items-center gap-5 md:gap-8 relative z-10">
            <div className="w-[88px] h-[88px] md:w-[120px] md:h-[120px] rounded-[28px] overflow-hidden border-2 border-white/20 bg-[#2C2C2E] shadow-2xl group-hover:scale-105 transition-transform duration-500">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover bg-white" />
              ) : (
                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${session?.user?.name || 'Guest'}`} alt="Avatar" className="w-full h-full object-cover bg-white" />
              )}
            </div>
            <div>
              <h2 className="text-[26px] md:text-[36px] font-black text-white leading-tight mb-2 line-clamp-1">{session?.user?.name || 'Guest_User'}</h2>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-white text-black text-[11px] md:text-[13px] font-black rounded-lg uppercase tracking-widest shadow-md">{session ? 'CLOUD SYNC' : 'FREE TIER'}</span>
                <span className="px-3 py-1 bg-[#1C1C1E] text-white text-[11px] md:text-[13px] font-bold rounded-lg border border-white/10">Lv. {Math.floor(stats.totalWatchedEps / 10) + 1}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 md:gap-6 mt-8 pt-6 border-t border-white/10 relative z-10">
            <div><p className="text-[#8E8E93] text-[11px] md:text-[13px] uppercase tracking-wider mb-1 font-bold">Selesai</p><p className="text-white text-[24px] md:text-[32px] font-black tabular-nums">{stats.completed}</p></div>
            <div><p className="text-[#8E8E93] text-[11px] md:text-[13px] uppercase tracking-wider mb-1 font-bold">Episode</p><p className="text-white text-[24px] md:text-[32px] font-black tabular-nums">{stats.totalWatchedEps}</p></div>
            <div><p className="text-[#8E8E93] text-[11px] md:text-[13px] uppercase tracking-wider mb-1 font-bold">Waktu</p><p className="text-[var(--accent)] text-[24px] md:text-[32px] font-black tabular-nums" style={{ '--accent': settings.accentColor } as any}>{stats.days}<span className="text-[14px] md:text-[16px] text-white ml-1">Hari</span></p></div>
          </div>
        </div>

        {/* Account Actions */}
        {!session ? (
          <div className="bg-[#1C1C1E] rounded-[24px] p-6 border border-white/5 flex flex-col items-center text-center gap-4 shadow-xl animate-slide-up">
            <div className="w-16 h-16 bg-[#0A84FF]/20 rounded-full flex items-center justify-center text-[#0A84FF] mb-2">
              <Icons.Info />
            </div>
            <h2 className="text-lg font-bold text-white">Simpan histori tontonan di Cloud</h2>
            <p className="text-sm text-[#8E8E93]">Lanjutkan menonton dari perangkat mana saja dengan sinkronisasi otomatis menggunakan akun Google Anda.</p>
            <button onClick={login} disabled={loading} className="w-full mt-4 flex items-center justify-center gap-3 bg-white text-black font-bold px-6 py-3.5 rounded-[16px] hover:scale-105 active:scale-95 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {loading ? "Menyambungkan..." : "Lanjutkan dengan Google"}
            </button>
          </div>
        ) : (
          <button onClick={logout} disabled={loading} className="px-6 py-3.5 bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20 font-bold rounded-[16px] w-full active:scale-95 transition-transform animate-slide-up">
            {loading ? "Keluar..." : "Keluar Akun"}
          </button>
        )}
      </div>

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </div>
  );
}
