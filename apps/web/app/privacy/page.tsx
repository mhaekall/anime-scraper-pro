import { Shield } from "lucide-react";
import Link from "next/link";
import { IconBack } from "@/ui/icons";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl px-5 md:px-8 py-4 border-b border-white/5 flex items-center gap-4">
        <Link href="/profile" className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
          <IconBack />
        </Link>
        <h1 className="font-bold text-lg">Kebijakan Privasi</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 md:px-8 pt-8 space-y-8 anim-fade">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
          <Shield className="w-8 h-8 text-white" />
        </div>

        <div>
          <h2 className="text-2xl font-black mb-2">Privasi Anda Adalah Prioritas Kami</h2>
          <p className="text-[#8e8e93] text-sm mb-6">Terakhir diperbarui: 13 April 2026</p>
          
          <div className="space-y-6 text-[15px] leading-relaxed text-[#e5e5ea]">
            <p>
              Orca sangat menghargai privasi Anda. Karena aplikasi ini pada dasarnya beroperasi dengan prinsip <strong>Zero-Trust dan $0 Cost Serverless Architecture</strong>, kami tidak mengumpulkan, menjual, atau mengeksploitasi data pribadi Anda.
            </p>
            
            <h3 className="text-lg font-bold text-white">1. Data yang Dikumpulkan</h3>
            <p>
              Kami hanya menyimpan alamat email dan ID Google Anda jika Anda memilih untuk menggunakan fitur "Lanjutkan dengan Google". Hal ini murni digunakan untuk melakukan sinkronisasi riwayat tontonan dan koleksi (Watchlist) Anda antar perangkat.
            </p>
            
            <h3 className="text-lg font-bold text-white">2. Keamanan Data</h3>
            <p>
              Data riwayat Anda disimpan dalam Edge Database (Neon Serverless) yang diamankan. Kami tidak menyimpan kata sandi Anda karena autentikasi di-handle sepenuhnya oleh Google OAuth.
            </p>

            <h3 className="text-lg font-bold text-white">3. Pihak Ketiga</h3>
            <p>
              Video disajikan melalui infrastruktur Edge Cloudflare dan API publik atau server eksternal (pihak ketiga). Interaksi Anda dengan video player tidak akan dilacak dengan tracker komersial, namun alamat IP Anda tetap mengikuti standar logging Cloudflare atau jaringan terkait.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}