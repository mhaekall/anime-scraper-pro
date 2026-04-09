"use client";

import { useState, lazy, Suspense } from "react";
import { Home, PlaySquare, FolderDot, User } from "lucide-react";
import { Toaster } from "@/ui/overlays/Toaster";

// Lazy-load each view — code-split at route level
const HomeView = lazy(() => import("@/features/home/HomeView"));
const ExploreView = lazy(() => import("@/features/explore/ExploreView"));
const CollectionView = lazy(() => import("@/features/collection/CollectionView"));
const ProfileView = lazy(() => import("@/features/profile/ProfileView"));

const TABS = [
  { id: "home", label: "Beranda", Icon: Home },
  { id: "explore", label: "Eksplor", Icon: PlaySquare },
  { id: "collection", label: "Koleksi", Icon: FolderDot },
  { id: "profile", label: "Anda", Icon: User },
] as const;

const Spinner = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-10 h-10 border-3 border-white/20 border-t-[var(--accent)] rounded-full anim-spin" />
  </div>
);

export default function AppShell() {
  const [tab, setTab] = useState(0);

  return (
    <div className="w-full h-[100dvh] bg-[#000000] overflow-hidden flex sm:flex-row flex-col relative select-none antialiased text-white">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden sm:flex flex-col w-64 bg-[#0a0a0a] border-r border-white/5 pt-12 pb-6 z-50 flex-shrink-0">
        <div className="px-8 mb-12">
          <h1 className="text-2xl font-black text-white tracking-tight">AnimeScraper<span className="text-[#0A84FF]">.</span></h1>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
          {TABS.map((t, i) => {
            const isActive = tab === i;
            return (
              <button 
                key={t.id} 
                onClick={() => setTab(i)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-[16px] transition-all font-bold text-[14px] ${isActive ? 'bg-[#1C1C1E] border border-white/10 text-white shadow-lg' : 'border border-transparent text-[#8E8E93] hover:bg-white/5 hover:text-[#D1D1D6]'}`}
              >
                <t.Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content — only active tab is rendered */}
      <div className="flex-1 w-full h-full relative flex flex-col min-w-0">
        <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-[70px] sm:pb-0">
          <Suspense fallback={<Spinner />}>
            {tab === 0 && <HomeView />}
            {tab === 1 && <ExploreView />}
            {tab === 2 && <CollectionView />}
            {tab === 3 && <ProfileView />}
          </Suspense>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-[100] sm:hidden bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 pb-safe">
          <div className="flex justify-between items-center px-2 h-[60px] pb-1">
            {TABS.map((t, i) => {
              const isActive = tab === i;
              return (
                <button 
                  key={t.id} 
                  onClick={() => setTab(i)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-1 pt-1 bg-transparent border-none outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="relative flex items-center justify-center">
                    <t.Icon 
                      className={`w-[22px] h-[22px] transition-colors ${isActive ? "text-white" : "text-white/60"}`} 
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                  </div>
                  <span className={`text-[10px] tracking-tight transition-colors ${isActive ? "text-white font-medium" : "text-white/60 font-normal"}`}>
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <Toaster />
    </div>
  );
}
