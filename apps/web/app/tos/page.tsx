import { FileText } from "lucide-react";
import Link from "next/link";
import { IconBack } from "@/ui/icons";

export default function TosPage() {
  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <div className="sticky top-0 z-30 bg-black/80 backdrop-blur-2xl px-5 md:px-8 py-4 border-b border-white/5 flex items-center gap-4">
        <Link href="/profile" className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
          <IconBack />
        </Link>
        <h1 className="font-bold text-lg">Ketentuan Layanan</h1>
      </div>

      <div className="max-w-2xl mx-auto px-5 md:px-8 pt-8 space-y-8 anim-fade">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
          <FileText className="w-8 h-8 text-white" />
        </div>

        <div>
          <h2 className="text-2xl font-black mb-2">Syarat Penggunaan</h2>
          <p className="text-[#8e8e93] text-sm mb-6">Mulai efektif: 13 April 2026</p>
          
          <div className="space-y-6 text-[15px] leading-relaxed text-[#e5e5ea]">
            <p>
              Selamat datang di AnimeScraper Pro. Dengan mengakses atau menggunakan aplikasi ini, Anda setuju untuk terikat oleh Ketentuan Layanan berikut.
            </p>
            
            <h3 className="text-lg font-bold text-white">1. Sifat Layanan</h3>
            <p>
              AnimeScraper Pro beroperasi sebagai <strong>Mesin Pencari dan Pengindeks</strong>. Kami tidak menyimpan, mendistribusikan, atau menghosting file media berhak cipta pada server kami. Seluruh media diambil dari penyedia pihak ketiga publik di internet melalui mekanisme scraping/parser *on-the-fly*.
            </p>
            
            <h3 className="text-lg font-bold text-white">2. Penggunaan Wajar</h3>
            <p>
              Aplikasi ini dirancang sebagai proyek eksperimen dan edukasi untuk mendemonstrasikan efisiensi arsitektur Edge dan SWR (Stale-While-Revalidate). Pengguna dilarang menggunakan bot atau skrip agresif untuk mengganggu layanan API kami (Hugging Face Spaces / Cloudflare Workers).
            </p>

            <h3 className="text-lg font-bold text-white">3. Penafian (Disclaimer)</h3>
            <p>
              Kami tidak bertanggung jawab atas konten, akurasi, atau kepatuhan hak cipta dari media pihak ketiga. Pengguna bertanggung jawab penuh atas kebijakan hukum di wilayah masing-masing terkait akses konten streaming.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}