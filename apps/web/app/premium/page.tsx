import { Crown, Check } from "lucide-react";
import Link from "next/link";
import { IconBack } from "@/ui/icons";

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl px-5 md:px-8 py-4 border-b border-white/5 flex items-center gap-4">
        <Link href="/profile" className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
          <IconBack />
        </Link>
        <h1 className="font-bold text-lg">Orca</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 md:px-8 pt-8 anim-up">
        
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-tr from-[#FF9F0A] to-[#FFD60A] rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-[#FF9F0A]/20">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-3">Tingkatkan Pengalaman Anda.</h2>
          <p className="text-[#8e8e93] text-[15px] max-w-md mx-auto">
            Nikmati streaming tanpa batas dengan server prioritas dan resolusi hingga 4K.
          </p>
        </div>

        <div className="bg-[#1c1c1e] border border-[#FF9F0A]/30 rounded-[32px] p-8 shadow-2xl relative overflow-hidden mb-8">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none bg-[#FF9F0A]" />
          
          <div className="relative z-10">
            <div className="flex items-end gap-2 mb-8">
              <span className="text-5xl font-black text-white">Rp 29k</span>
              <span className="text-[#8e8e93] font-bold mb-1">/ bulan</span>
            </div>

            <ul className="space-y-4 mb-8">
              {[
                "Resolusi 4K & 1080p Ultra HD",
                "Server CDN Prioritas Tinggi (No Buffering)",
                "Bebas Iklan Secara Keseluruhan",
                "Fitur Unduh untuk Tontonan Offline",
                "Akses Eksklusif Fitur Beta",
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FF9F0A]/20 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-[#FF9F0A]" />
                  </div>
                  <span className="text-[14px] font-bold text-[#e5e5ea]">{feature}</span>
                </li>
              ))}
            </ul>

            <button className="w-full py-4 rounded-full bg-gradient-to-r from-[#FF9F0A] to-[#FFD60A] text-black font-black text-[16px] shadow-lg active:scale-95 transition-transform">
              Berlangganan Sekarang
            </button>
          </div>
        </div>

        <p className="text-center text-[#8e8e93] text-xs">
          Ini adalah halaman demonstrasi (dummy). Orca 100% gratis dan open-source berkat dukungan arsitektur Serverless.
        </p>
      </div>
    </div>
  );
}