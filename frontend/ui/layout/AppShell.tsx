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

        {/* Mobile Bottom Nav - Refined Floating Dock */}
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black via-black/80 to-transparent z-[90] pointer-events-none sm:hidden" />
        
        <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[300px] z-[100] sm:hidden bg-[#1c1c1e]/60 backdrop-blur-3xl border border-white/10 rounded-[24px] shadow-2xl overflow-hidden shadow-black/80">
          <div className="flex justify-around items-center px-2 h-[50px]">
            {TABS.map((t, i) => {
              const active = tab === i;
              const Icon = t.icon;
              const isProfile = t.id === "profile";
              
              return (
                <button 
                  key={t.id} 
                  onClick={() => setTab(i)}
                  className="flex flex-col items-center justify-center h-full aspect-square bg-transparent border-none outline-none relative"
                >
                  <div className={`relative flex items-center justify-center transition-all duration-300 ${active ? "scale-110" : "scale-100 opacity-60"}`}>
                    {isProfile ? (
                      <div className={`w-5 h-5 rounded-full overflow-hidden border ${active ? "border-white" : "border-transparent"}`}>
                        <img 
                          src="https://ui-avatars.com/api/?name=User&background=random" 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <Icon 
                        className={`w-[20px] h-[20px] transition-colors duration-300 ${active ? "text-white" : "text-white/80"}`} 
                        filled={active}
                      />
                    )}
                  </div>
                  <span className={`text-[8px] mt-0.5 tracking-tight transition-colors duration-300 ${active ? "text-white font-bold" : "text-white/40 font-medium"}`}>
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
