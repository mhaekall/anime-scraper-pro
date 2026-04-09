"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AutoNextOverlayProps {
  nextEpisodeUrl: string;
  nextEpisodeTitle: string;
  nextThumbnail?: string;
  onCancel: () => void;
  isLastEpisode: boolean;
}

export function AutoNextOverlay({ nextEpisodeUrl, nextEpisodeTitle, nextThumbnail, onCancel, isLastEpisode }: AutoNextOverlayProps) {
  const [countdown, setCountdown] = useState(10);
  const router = useRouter();

  useEffect(() => {
    if (isLastEpisode) return;
    if (countdown === 0) {
      router.push(nextEpisodeUrl);
      return;
    }
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, nextEpisodeUrl, router, isLastEpisode]);

  return (
    <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {isLastEpisode ? (
        <>
          <h3 className="text-white text-3xl font-black mb-4">Anime Selesai! 🎉</h3>
          <p className="text-[#8e8e93] mb-8">Terima kasih telah menonton serial ini.</p>
          <button onClick={onCancel} className="px-8 py-3 bg-[#1c1c1e] border border-white/20 text-white font-bold rounded-full hover:bg-white/10 transition-colors">
            Tutup Layar
          </button>
        </>
      ) : (
        <>
          <p className="text-[#8e8e93] font-semibold mb-2 uppercase tracking-widest text-xs">Memutar Berikutnya</p>
          <h3 className="text-white text-2xl font-bold mb-8 text-center px-4 line-clamp-2">{nextEpisodeTitle}</h3>
          
          <div className="relative w-56 aspect-video rounded-xl overflow-hidden mb-8 border border-white/20 shadow-2xl">
            <img src={nextThumbnail || '/placeholder-bg.jpg'} alt="Next" className="w-full h-full object-cover opacity-60" />
            
            {/* Netflix-style Circular Countdown */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white font-black text-5xl drop-shadow-lg">{countdown}</div>
              <svg className="absolute w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
                <circle cx="50" cy="50" r="46" fill="none" stroke="var(--accent, #0a84ff)" strokeWidth="6" 
                        strokeDasharray="289" strokeDashoffset={289 - (289 * countdown) / 10} 
                        className="transition-all duration-1000 ease-linear" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="flex gap-4">
            <button onClick={() => router.push(nextEpisodeUrl)} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
              Putar Sekarang
            </button>
            <button onClick={onCancel} className="px-8 py-3 bg-[#1c1c1e] text-white font-bold rounded-full border border-white/20 hover:bg-white/10 transition-colors">
              Batal
            </button>
          </div>
        </>
      )}
    </div>
  );
}
