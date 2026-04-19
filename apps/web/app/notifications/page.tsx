"use client";

import { authClient } from "@/core/lib/auth-client";
import { redirect } from "next/navigation";
import { IconBell } from "@/ui/icons";
import { useMounted } from "@/core/hooks/use-mounted";

export const runtime = "edge";

// Mock data notifikasi
const NOTIFICATIONS = [
  {
    id: 1,
    title: "Episode Baru Rilis!",
    message: "Episode 12 dari anime favorit Anda telah tayang. Tonton sekarang!",
    time: "2 menit yang lalu",
    isUnread: true,
    type: "new_episode"
  },
  {
    id: 2,
    title: "Rekomendasi Mingguan",
    message: "Kami telah mengurasi daftar anime Sci-Fi terbaik minggu ini khusus untuk Anda.",
    time: "1 jam yang lalu",
    isUnread: true,
    type: "recommendation"
  },
  {
    id: 3,
    title: "Pembaruan Sistem",
    message: "Pembaruan v2.0: Nikmati antarmuka Bento Grid baru dan fitur pencarian super cepat!",
    time: "1 hari yang lalu",
    isUnread: false,
    type: "system"
  }
];

export default function NotificationsPage() {
  const mounted = useMounted();
  const { data: session, isPending } = authClient.useSession();

  if (!mounted || isPending) return null;

  if (!session?.user) {
    redirect("/?login=true");
  }

  return (
    <div className="w-full min-h-screen bg-black text-white p-5 md:px-8 pt-8 pb-32 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">Notifikasi</h1>
        <button className="text-[13px] font-bold text-[#0A84FF] hover:text-white transition-colors bg-[#0A84FF]/10 px-4 py-2 rounded-full">
          Tandai semua dibaca
        </button>
      </div>

      <div className="space-y-4">
        {NOTIFICATIONS.map((notif) => (
          <div 
            key={notif.id} 
            className={`relative overflow-hidden p-5 rounded-[24px] border transition-all duration-300 group cursor-pointer ${
              notif.isUnread 
                ? "bg-[#1c1c1e] border-white/10 hover:bg-[#2c2c2e]" 
                : "bg-transparent border-transparent hover:bg-white/5"
            }`}
          >
            {notif.isUnread && (
              <div className="absolute top-5 left-5 w-2 h-2 rounded-full bg-[#0A84FF] shadow-[0_0_8px_#0A84FF]" />
            )}
            
            <div className={`flex gap-4 ${notif.isUnread ? 'pl-5' : ''}`}>
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/5 group-hover:scale-105 transition-transform duration-300">
                <IconBell className={`w-5 h-5 ${notif.isUnread ? 'text-white' : 'text-white/40'}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={`text-[15px] leading-tight mb-1 ${notif.isUnread ? 'font-bold text-white' : 'font-medium text-white/70'}`}>
                  {notif.title}
                </h3>
                <p className="text-[#8e8e93] text-[13px] line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>
                <p className="text-white/30 text-[11px] font-bold tracking-wider uppercase mt-3">
                  {notif.time}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
