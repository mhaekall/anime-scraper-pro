"use client";

import { useMemo, useState } from "react";
import { useWatchlist } from "@/core/stores/app-store";
import { useWatchHistory } from "@/core/hooks/use-watch-history";
import { useMounted } from "@/core/hooks/use-mounted";
import { LogOut, ChevronRight, Crown, Shield, FileText } from "lucide-react";
import { authClient } from "@/core/lib/auth-client";
import { AuthModal } from "@/ui/overlays/AuthModal";
import Link from "next/link";

export default function ProfileView() {
  const mounted = useMounted();
  const { items: watchlist } = useWatchlist();
  const { history } = useWatchHistory();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();

  const stats = useMemo(() => {
    const completed = watchlist.filter((w) => w.status === "completed").length;
    const totalEps = history.length + watchlist.reduce((a, c) => a + (c.progress || 0), 0);
    const days = ((totalEps * 24) / 60 / 24).toFixed(1);
    return { completed, totalEps, days };
  }, [watchlist, history]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen pb-32 pt-6 px-5 md:px-8 max-w-2xl mx-auto space-y-8">
      {/* Profile Card */}
      <div className="rounded-[32px] p-8 bg-[#1c1c1e] border border-white/5 shadow-xl relative overflow-hidden anim-fade">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none bg-[#0A84FF]" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-[24px] overflow-hidden border-4 border-white/10 shadow-2xl shrink-0">
              <img 
                src={session?.user?.image || "https://api.dicebear.com/7.x/notionists/svg?seed=Guest"} 
                alt="avatar" 
                className="w-full h-full object-cover bg-white" 
                loading="lazy" 
              />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-white mb-1 line-clamp-1">
                {isPending ? "Loading..." : session?.user?.name || "Guest"}
              </h2>
              <div className="flex gap-2 items-center mt-1">
                <span className="px-2 py-0.5 bg-white text-black text-[9px] font-black rounded uppercase tracking-widest">
                  {session?.user ? "PRO TIER" : "FREE TIER"}
                </span>
                {session?.user && <span className="text-[10px] text-white/40 font-bold">ID: {session.user.id.substring(0, 6).toUpperCase()}</span>}
              </div>
            </div>
          </div>
          
          <div className="shrink-0 ml-4">
            {session?.user && (
              <button 
                onClick={() => authClient.signOut()} 
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {!session?.user && !isPending && (
          <div className="mt-8 relative z-10">
            <button 
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 text-black py-3.5 rounded-full font-bold text-[15px] transition-transform active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238598)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 41.939 C -8.804 39.869 -11.514 38.739 -14.754 38.739 C -19.444 38.739 -23.494 41.439 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              Lanjutkan dengan Google
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10 relative z-10">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-black">Selesai</p>
            <p className="text-white text-3xl font-black tabular-nums">{stats.completed}</p>
          </div>
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-black">Episode</p>
            <p className="text-white text-3xl font-black tabular-nums">{stats.totalEps}</p>
          </div>
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-black">Waktu</p>
            <p className="text-3xl font-black tabular-nums text-[#0A84FF]">{stats.days}<span className="text-xs text-white ml-1 opacity-60">H</span></p>
          </div>
        </div>
      </div>

      {/* Menu / Links */}
      <div className="space-y-6 anim-fade">
        <section>
          <h3 className="text-white/40 text-[11px] font-black tracking-widest uppercase mb-4 ml-2">Akun & Ketentuan</h3>
          <div className="bg-[#1c1c1e] rounded-[24px] border border-white/5 divide-y divide-white/5 overflow-hidden">
            
            <Link href="/premium" className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#FF9F0A]/20">
                  <Crown className="w-4 h-4 text-[#FF9F0A]" />
                </div>
                <span className="font-bold text-[14px] text-white">Upgrade ke Premium</span>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20" />
            </Link>

            <Link href="/privacy" className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-[14px] text-white">Kebijakan Privasi</span>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20" />
            </Link>

            <Link href="/tos" className="flex items-center justify-between p-5 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-[14px] text-white">Ketentuan Layanan</span>
              </div>
              <ChevronRight className="w-5 h-5 text-white/20" />
            </Link>
          </div>
        </section>

        <section>
          <div className="bg-[#1c1c1e]/40 rounded-[24px] border border-red-500/20 mt-8">
            <button 
              onClick={() => { if(confirm("Hapus semua riwayat dan koleksi?")) { localStorage.clear(); window.location.reload(); } }} 
              className="w-full p-5 text-center text-[#FF453A] font-black text-[14px] hover:bg-red-500/5 transition-colors rounded-[24px]"
            >
              Hapus Semua Data & Reset
            </button>
          </div>
        </section>

        <div className="text-center space-y-1">
          <p className="text-white/20 text-[10px] font-black tracking-widest uppercase">AnimeScraper Pro v2.4.1</p>
          <p className="text-white/10 text-[9px] font-bold">Didesain untuk efisiensi maksimal </p>
        </div>
      </div>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}