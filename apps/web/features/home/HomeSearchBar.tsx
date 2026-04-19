"use client";

import { useRouter } from "next/navigation";
import { IconSearch } from "@/ui/icons";

export function HomeSearchBar() {
  const router = useRouter();

  return (
    <div 
      onClick={() => router.push("/explore")}
      className="relative w-full group anim-up cursor-text" 
      style={{ animationDelay: '100ms' }}
    >
      <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
        <IconSearch className="w-5 h-5 text-white/50 group-hover:text-[#0A84FF] transition-colors" />
      </div>
      <div
        className="w-full bg-[#1c1c1e] border border-white/10 text-white/40 text-[15px] rounded-[20px] py-4 pl-14 pr-6 shadow-[0_12px_24px_rgba(0,0,0,0.5)] group-hover:border-white/20 transition-all flex items-center"
      >
        Ketik judul anime yang ingin ditonton...
      </div>
    </div>
  );
}
