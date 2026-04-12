"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconExplore, IconCollection, IconUser } from "@/ui/icons";
import { useSettings } from "@/core/stores/app-store";
import { useMounted } from "@/core/hooks/use-mounted";
import { useKonami } from "@/core/hooks/use-konami";
import { SnakeGame } from "@/ui/games/SnakeGame";
import { useState } from "react";

const TABS = [
  { id: "/", label: "Beranda", icon: IconHome },
  { id: "/explore", label: "Eksplor", icon: IconExplore },
  { id: "/collection", label: "Koleksi", icon: IconCollection },
  { id: "/profile", label: "Anda", icon: IconUser },
];

export function Navigation({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const pathname = usePathname() || "/";
  const mounted = useMounted();
  const [snakeActive, setSnakeActive] = useState(false);

  useKonami(() => setSnakeActive(true));

  // Handle SSR (show static layout before hydration to prevent layout shift but avoid hydration mismatch)
  // We use a CSS trick to avoid flash of unstyled content
  const isDark = mounted ? settings.theme === "dark" : true; 
  const accentColor = mounted ? settings.accentColor : "#0A84FF";

  return (
    <div className={`w-full min-h-[100dvh] ${isDark ? "bg-[#121212] text-white" : "bg-[#f2f2f7] text-black"} flex sm:flex-row flex-col relative select-none antialiased min-w-0 transition-colors duration-500`}>
      {/* Desktop Sidebar */}
      <aside className={`hidden sm:flex flex-col w-64 h-screen sticky top-0 ${isDark ? "bg-[#1c1c1e] border-white/5" : "bg-white border-black/5 shadow-xl"} border-r pt-12 pb-6 z-50 shrink-0`}>
        <div className="px-8 mb-12">
          <h1 className={`text-2xl font-black ${isDark ? "text-white" : "text-black"} tracking-tight`}>AnimeScraper<span style={{ color: accentColor }}>.</span></h1>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
          {TABS.map((t) => {
            const active = pathname === t.id || (t.id !== "/" && pathname.startsWith(t.id));
            const Icon = t.icon;
            return (
              <Link 
                key={t.id} 
                href={t.id}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-[16px] transition-all font-bold text-[14px] ${active ? (isDark ? 'bg-[#2c2c2e] text-white shadow-lg' : 'bg-black text-white shadow-lg') : (isDark ? 'text-white/40 hover:bg-white/5 hover:text-white/60' : 'text-black/40 hover:bg-black/5 hover:text-black/60')}`}
              >
                <Icon className="w-5 h-5" filled={active} />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 w-full min-h-[100dvh] relative flex flex-col min-w-0">
        <main className="flex-1 w-full pb-[70px] sm:pb-0 min-w-0">
          {children}
        </main>

        {/* Mobile Bottom Nav - Refined Floating Dock */}
        <div className={`fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t ${isDark ? "from-[#121212] via-[#121212]/80" : "from-[#f2f2f7] via-[#f2f2f7]/80"} to-transparent z-[90] pointer-events-none sm:hidden`} />
        
        <nav className={`fixed bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[300px] z-[100] sm:hidden ${isDark ? "bg-[#1c1c1e]/70" : "bg-white/80"} backdrop-blur-3xl border ${isDark ? "border-white/10 shadow-black/80" : "border-black/5 shadow-black/10"} rounded-[24px] shadow-2xl overflow-hidden`}>
          <div className="flex justify-around items-center px-2 h-[50px]">
            {TABS.map((t) => {
              const active = pathname === t.id || (t.id !== "/" && pathname.startsWith(t.id));
              const Icon = t.icon;
              const isProfile = t.id === "/profile";
              
              return (
                <Link 
                  key={t.id} 
                  href={t.id}
                  className="flex flex-col items-center justify-center h-full aspect-square bg-transparent border-none outline-none relative"
                >
                  <div className={`relative flex items-center justify-center transition-all duration-300 ${active ? "scale-110" : `scale-100 ${isDark ? "opacity-60" : "opacity-40"}`}`}>
                    {isProfile ? (
                      <div className={`w-5 h-5 rounded-full overflow-hidden border ${active ? (isDark ? "border-white" : "border-black") : "border-transparent"}`}>
                        <img 
                          src="https://ui-avatars.com/api/?name=User&background=random" 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <Icon 
                        className={`w-[20px] h-[20px] transition-colors duration-300 ${active ? (isDark ? "text-white" : "text-black") : (isDark ? "text-white/80" : "text-black/80")}`} 
                        filled={active}
                      />
                    )}
                  </div>
                  <span className={`text-[8px] mt-0.5 tracking-tight transition-colors duration-300 ${active ? (isDark ? "text-white font-bold" : "text-black font-bold") : (isDark ? "text-white/40 font-medium" : "text-black/40 font-medium")}`}>
                    {t.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {snakeActive && <SnakeGame onClose={() => setSnakeActive(false)} />}
    </div>
  );
}
