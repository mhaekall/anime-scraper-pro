"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Icons } from "./Icons";

export function BottomNav() {
  const pathname = usePathname();

  const TABS = [
    { id: "home", label: "Beranda", path: "/", Icon: Icons.Home },
    { id: "explore", label: "Eksplor", path: "/explore", Icon: Icons.Explore },
    { id: "watchlist", label: "Koleksi", path: "/collection", Icon: Icons.Bookmark },
    { id: "profile", label: "Profil", path: "/profile", Icon: Icons.Profile }
  ];

  return (
    <>
      <div className="h-[100px] md:hidden"></div>

      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none px-4 pb-safe md:hidden">
        <nav className="pointer-events-auto w-full max-w-[320px] h-[64px] lux-ios-glass rounded-full flex items-center px-1.5 relative overflow-hidden">
          
          {TABS.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
            const { Icon } = item;

            return (
              <Link
                key={item.id}
                href={item.path}
                className="relative z-10 flex-1 h-full flex flex-col items-center justify-center gap-[4px] transition-all duration-300 active:scale-90"
                style={{ WebkitTapHighlightColor: "transparent", color: isActive ? "#FFFFFF" : "#8E8E93" }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBottomTab"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute inset-y-1.5 inset-x-0 bg-white/10 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                  >
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full blur-[2px] opacity-60 bg-white" />
                  </motion.div>
                )}

                <div className={`transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex items-center justify-center z-10 ${isActive ? "scale-110 -translate-y-0.5" : "scale-100 hover:text-[#D1D1D6]"}`}>
                  <Icon a={isActive} />
                </div>
                <span className={`text-[10px] font-bold tracking-tight transition-all duration-300 z-10 ${isActive ? "opacity-100" : "opacity-0 translate-y-2 absolute"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
