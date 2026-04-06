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
    <div className="w-full h-screen bg-[#000000] overflow-hidden flex flex-col relative select-none antialiased">
      {/* Main Viewport Container */}
      <div className="flex-1 w-full h-full relative">
        <div 
          className="flex w-full h-full transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]" 
          style={{ transform: `translate3d(-${activeTab * 100}%, 0, 0)` }}
        >
          {TABS.map((Tab, i) => (
             <div key={Tab.id} className="w-full h-full flex-shrink-0 relative overflow-y-auto hide-scrollbar pb-[48px]">
               <Tab.Component />
             </div>
          ))}
        </div>
      </div>

      <nav className="absolute bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0f0f0f] border-t border-white/10 pb-safe">
        <div className="flex justify-between items-center px-2 h-[48px]">
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
  );
}
