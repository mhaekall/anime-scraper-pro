import { Icons } from "@/components/Icons";

export default function WatchLoading() {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 text-center text-white">
      <div className="w-12 h-12 border-4 border-white/20 border-t-[var(--accent)] rounded-full animate-spin shadow-lg mb-4" />
      <h2 className="text-[20px] font-black tracking-tight">Memuat Player...</h2>
      <p className="text-[#8E8E93] text-[13px] mt-1">Mengambil tautan video dari server</p>
    </div>
  );
}
