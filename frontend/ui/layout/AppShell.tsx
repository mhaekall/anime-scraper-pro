"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { IconHome, IconExplore, IconCollection, IconUser } from "@/ui/icons";
import { Toaster } from "@/ui/overlays/Toaster";
import { useKonami } from "@/core/hooks/use-konami";
import { SnakeGame } from "@/ui/games/SnakeGame";

const loadingSkeleton = () => <div className="w-full h-screen bg-black animate-pulse flex items-center justify-center"><div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full anim-spin" /></div>;

// Views
const HomeView = dynamic(() => import("@/features/home/HomeView"), { ssr: false, loading: loadingSkeleton });
const ExploreView = dynamic(() => import("@/features/explore/ExploreView"), { ssr: false, loading: loadingSkeleton });
const CollectionView = dynamic(() => import("@/features/collection/CollectionView"), { ssr: false, loading: loadingSkeleton });
const ProfileView = dynamic(() => import("@/features/profile/ProfileView"), { ssr: false, loading: loadingSkeleton });

const TABS = [
  { id: "home", label: "Beranda", icon: IconHome },
  { id: "explore", label: "Eksplor", icon: IconExplore },
  { id: "collection", label: "Koleksi", icon: IconCollection },
  { id: "profile", label: "Anda", icon: IconUser },
];

export default function AppShell() {
  const [tab, setTab] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [snakeActive, setSnakeActive] = useState(false);

  useKonami(() => setSnakeActive(true));

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-screen bg-black" />;

  return (
    <div className="w-full min-h-[100dvh] bg-black flex sm:flex-row flex-col relative select-none antialiased text-white min-w-0">
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-64 h-screen sticky top-0 bg-[#0a0a0a] border-r border-white/5 pt-12 pb-6 z-50 shrink-0">
        <div className="px-8 mb-12">
          <h1 className="text-2xl font-black text-white tracking-tight">AnimeScraper<span className="text-[#0A84FF]">.</span></h1>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
          {TABS.map((t, i) => {
            const active = tab === i;
            const Icon = t.icon;
            return (
              <button 
                key={t.id} 
                onClick={() => setTab(i)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-[16px] transition-all font-bold text-[14px] ${active ? 'bg-[#1C1C1E] border border-white/10 text-white shadow-lg' : 'border border-transparent text-[#8E8E93] hover:bg-white/5 hover:text-[#D1D1D6]'}`}
              >
                <Icon className="w-5 h-5" filled={active} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 w-full min-h-[100dvh] relative flex flex-col min-w-0">
        <main className="flex-1 w-full pb-[70px] sm:pb-0 min-w-0">
          {tab === 0 && <HomeView />}
          {tab === 1 && <ExploreView />}
          {tab === 2 && <CollectionView />}
          {tab === 3 && <ProfileView />}
        </main>

        {/* Mobile Bottom Nav - Floating Dock style */}
        <nav className="fixed bottom-3 left-4 right-4 z-[100] sm:hidden bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl overflow-hidden shadow-black/50">
          <div className="flex justify-between items-center px-1 h-[54px]">
            {TABS.map((t, i) => {
              const active = tab === i;
              const Icon = t.icon;
              return (
                <button 
                  key={t.id} 
                  onClick={() => setTab(i)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 bg-transparent border-none outline-none relative group"
                >
                  <div className={`relative flex items-center justify-center transition-all duration-300 ${active ? "scale-110 -translate-y-0.5" : "scale-100"}`}>
                    <Icon 
                      className={`w-[20px] h-[20px] transition-colors duration-300 ${active ? "text-[#0A84FF]" : "text-white/50"}`} 
                      filled={active}
                    />
                  </div>
                  <span className={`text-[9px] tracking-tight transition-colors duration-300 ${active ? "text-white font-semibold" : "text-white/40 font-medium"}`}>
                    {t.label}
                  </span>
                  {active && (
                    <div className="absolute bottom-1 w-1 h-1 bg-[#0A84FF] rounded-full shadow-[0_0_8px_#0A84FF]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      <Toaster />
      {snakeActive && <SnakeGame onClose={() => setSnakeActive(false)} />}
    </div>
  );
}
