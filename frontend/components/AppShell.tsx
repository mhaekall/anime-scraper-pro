"use client";

import { useState } from "react";
import { HomeView } from "./views/HomeView";
import { ExploreView } from "./views/ExploreView";
import CollectionView from "./views/CollectionView";
import ProfileView from "./views/ProfileView";
import { Home, PlaySquare, FolderDot, User } from "lucide-react";

export function AppShell() {
  const [activeTab, setActiveTab] = useState(0);

  const TABS = [
    { id: 'home', label: 'Beranda', icon: Home, Component: HomeView },
    { id: 'explore', label: 'Eksplor', icon: PlaySquare, Component: ExploreView },
    { id: 'collection', label: 'Koleksi', icon: FolderDot, Component: CollectionView },
    { id: 'profile', label: 'Anda', icon: User, Component: ProfileView }
  ];

  return (
    <div className="w-full h-[100dvh] bg-[#000000] overflow-hidden flex sm:flex-row flex-col relative select-none antialiased">
      {/* Desktop Sidebar (Left) */}
      <aside className="hidden sm:flex flex-col w-64 bg-[#0a0a0a] border-r border-white/5 pt-12 pb-6 z-50 flex-shrink-0">
        <div className="px-8 mb-12">
          <h1 className="text-2xl font-black text-white tracking-tight">AnimeScraper<span className="text-[#0A84FF]">.</span></h1>
        </div>
        <div className="flex-1 px-4 flex flex-col gap-2">
          {TABS.map((item, i) => {
            const isActive = activeTab === i;
            const Icon = item.icon;
            return (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-[16px] transition-all font-bold text-[14px] ${isActive ? 'bg-[#1C1C1E] border border-white/10 text-white shadow-lg' : 'border border-transparent text-[#8E8E93] hover:bg-white/5 hover:text-[#D1D1D6]'}`}
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Viewport Container */}
      <div className="flex-1 w-full h-full relative flex flex-col">
        <div className="flex-1 w-full h-full relative">
          <div 
            className="flex w-full h-full transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]" 
            style={{ transform: `translate3d(-${activeTab * 100}%, 0, 0)` }}
          >
            {TABS.map((Tab, i) => (
               <div key={Tab.id} className="w-full h-full flex-shrink-0 relative overflow-y-auto hide-scrollbar pb-[70px] sm:pb-0">
                 <Tab.Component />
               </div>
            ))}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-[100] sm:hidden bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 pb-safe">
          <div className="flex justify-between items-center px-2 h-[60px] pb-1">
            {TABS.map((item, i) => {
              const isActive = activeTab === i;
              const Icon = item.icon;

              return (
                <button 
                  key={item.id} 
                  onClick={() => setActiveTab(i)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-1 pt-1 bg-transparent border-none outline-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  <div className="relative flex items-center justify-center">
                    <Icon 
                      className={`w-[22px] h-[22px] transition-colors ${
                        isActive ? "text-white" : "text-white/60"
                      }`} 
                      strokeWidth={isActive ? 2 : 1.5}
                      fill={isActive ? "currentColor" : "none"}
                    />
                  </div>
                  <span className={`text-[10px] tracking-tight transition-colors ${
                    isActive ? "text-white font-medium" : "text-white/60 font-normal"
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
