"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlaySquare, FolderDot, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Beranda", path: "/", icon: Home },
    { name: "Eksplor", path: "/explore", icon: PlaySquare },
    { name: "Koleksi", path: "/collection", icon: FolderDot },
    { name: "Anda", path: "/profile", icon: User },
  ];

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the bottom nav */}
      <div className="h-[48px] sm:hidden"></div>

      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-[#0f0f0f] border-t border-white/10 pb-safe">
        <div className="flex justify-between items-center px-2 h-[48px]">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link 
                key={item.name} 
                href={item.path} 
                className="flex flex-col items-center justify-center flex-1 h-full gap-1 pt-1"
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
                <span className={`text-[10px] font-roboto tracking-tight transition-colors ${
                  isActive ? "text-white" : "text-white/60"
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
