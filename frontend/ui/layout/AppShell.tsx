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
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
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

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-[100] sm:hidden bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 pb-safe">
          <div className="flex justify-between items-center px-2 h-[60px] pb-1">
            {TABS.map((t, i) => {
              const active = tab === i;
              const Icon = t.icon;
              return (
                <button 
                  key={t.id} 
                  onClick={() => setTab(i)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-1 pt-1 bg-transparent border-none outline-none"
                >
                  <div className="relative flex items-center justify-center">
                    <Icon 
                      size={22}
                      className={`transition-colors ${active ? "text-white" : "text-white/60"}`} 
                      strokeWidth={active ? 2 : 1.5}
                      fill={active ? "currentColor" : "none"}
                    />
                  </div>
                  <span className={`text-[10px] tracking-tight transition-colors ${active ? "text-white font-medium" : "text-white/60 font-normal"}`}>
                    {t.label}
                  </span>
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
