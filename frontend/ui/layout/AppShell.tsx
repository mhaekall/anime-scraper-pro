// ui/layout/AppShell.tsx — Main app shell with LAZY tab loading
// KEY FIX: Only renders active tab. Inactive tabs are unmounted = zero memory/network.

"use client";

import { useState, lazy, Suspense, memo } from "react";
import { IconHome, IconExplore, IconCollection, IconUser } from "@/ui/icons";
import { Toaster } from "@/ui/overlays/Toaster";

// Lazy-load each view — code-split at route level
const HomeView = lazy(() => import("@/features/home/HomeView"));
const ExploreView = lazy(() => import("@/features/explore/ExploreView"));
const CollectionView = lazy(() => import("@/features/collection/CollectionView"));
const ProfileView = lazy(() => import("@/features/profile/ProfileView"));

const TABS = [
  { id: "home", label: "Beranda", Icon: IconHome, View: HomeView },
  { id: "explore", label: "Eksplor", Icon: IconExplore, View: ExploreView },
  { id: "collection", label: "Koleksi", Icon: IconCollection, View: CollectionView },
  { id: "profile", label: "Anda", Icon: IconUser, View: ProfileView },
] as const;

const Spinner = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-10 h-10 border-3 border-white/20 border-t-[var(--accent)] rounded-full anim-spin" />
  </div>
);

function AppShell() {
  const [tab, setTab] = useState(0);
  const Active = TABS[tab].View;

  return (
    <div className="w-full h-[100dvh] bg-black overflow-hidden flex sm:flex-row flex-col select-none">
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-56 bg-[#0a0a0a] border-r border-white/5 pt-10 pb-6 shrink-0">
        <div className="px-6 mb-10">
          <h1 className="text-xl font-black text-white tracking-tight">
            AnimeScraper<span style={{ color: "var(--accent)" }}>.</span>
          </h1>
        </div>
        <nav className="flex-1 px-3 flex flex-col gap-1">
          {TABS.map((t, i) => {
            const active = tab === i;
            return (
              <button
                key={t.id}
                onClick={() => setTab(i)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[13px] font-bold transition-colors ${
                  active ? "bg-[#1c1c1e] text-white border border-white/10" : "text-[#8e8e93] hover:bg-white/5 border border-transparent"
                }`}
              >
                <t.Icon className="w-5 h-5" filled={active} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main content — only active tab is rendered */}
      <main className="flex-1 h-full overflow-y-auto no-scrollbar pb-[70px] sm:pb-0">
        <Suspense fallback={<Spinner />}>
          <Active />
        </Suspense>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] sm:hidden bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 pb-safe">
        <div className="flex justify-between items-center px-2 h-[60px] pb-1">
          {TABS.map((t, i) => {
            const active = tab === i;
            return (
              <button 
                key={t.id} 
                onClick={() => setTab(i)} 
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 pt-1 bg-transparent border-none outline-none"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                <div className="relative flex items-center justify-center">
                  <t.Icon 
                    className={`w-[22px] h-[22px] transition-colors ${active ? "text-white" : "text-white/60"}`} 
                    filled={active} 
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

      <Toaster />
    </div>
  );
}

export default memo(AppShell);
