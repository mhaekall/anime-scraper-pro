"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconExplore, IconCollection, IconUser } from "@/ui/icons";
import { useMounted } from "@/core/hooks/use-mounted";
import { useKonami } from "@/core/hooks/use-konami";
import { SnakeGame } from "@/ui/games/SnakeGame";
import { useState } from "react";
import { authClient } from "@/core/lib/auth-client";

const TABS = [
  { id: "/", label: "Beranda", icon: IconHome },
  { id: "/explore", label: "Eksplor", icon: IconExplore },
  { id: "/collection", label: "Koleksi", icon: IconCollection },
  { id: "/profile", label: "Anda", icon: IconUser },
];

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const mounted = useMounted();
  const [snakeActive, setSnakeActive] = useState(false);
  const { data: session } = authClient.useSession();

  useKonami(() => setSnakeActive(true));

  return (
    <div className="w-full min-h-[100dvh] bg-[#121212] text-white flex sm:flex-row flex-col relative select-none antialiased min-w-0 transition-colors duration-500">
      {/* Desktop Sidebar */}
      <aside className="hidden sm:flex flex-col w-64 h-screen sticky top-0 bg-[#1c1c1e] border-white/5 border-r pt-12 pb-6 z-50 shrink-0 shadow-xl">
        <div className="px-8 mb-12">
          <h1 className="text-2xl font-black text-white tracking-tight">AnimeScraper<span className="text-[#0A84FF]">.</span></h1>
        </div>
        <nav className="flex-1 px-4 flex flex-col gap-2">
          {TABS.map((t) => {
            const active = pathname === t.id || (t.id !== "/" && pathname.startsWith(t.id));
            const Icon = t.icon;
            return (
              <Link 
                key={t.id} 
                href={t.id}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-[16px] transition-all font-bold text-[14px] ${active ? 'bg-[#2c2c2e] text-white shadow-lg' : 'text-white/40 hover:bg-white/5 hover:text-white/60'}`}
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
        <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#121212] via-[#121212]/80 to-transparent z-[90] pointer-events-none sm:hidden" />
        
        <nav className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-[300px] z-[100] sm:hidden bg-[#1c1c1e]/70 backdrop-blur-3xl border border-white/10 shadow-black/80 rounded-[24px] shadow-2xl overflow-hidden">
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
                  <div className={`relative flex items-center justify-center transition-all duration-300 ${active ? "scale-110" : "scale-100 opacity-60"}`}>
                    {isProfile ? (
                      <div className={`w-5 h-5 rounded-full overflow-hidden border ${active ? "border-white" : "border-transparent"}`}>
                        <img 
                          src={(mounted && session?.user?.image) ? session.user.image : "https://api.dicebear.com/7.x/notionists/svg?seed=Guest"} 
                          alt="Profile" 
                          className="w-full h-full object-cover bg-white"
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