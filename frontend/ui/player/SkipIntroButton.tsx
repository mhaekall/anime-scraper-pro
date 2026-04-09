"use client";
import { useState, useEffect } from 'react';
import { useSettings } from '@/core/stores/app-store';

interface SkipIntroProps {
  currentTime: number;
  onSkip: (targetTime: number) => void;
  showAt?: number; 
  hideAt?: number;
}

export function SkipIntroButton({ currentTime, onSkip, showAt = 30, hideAt = 120 }: SkipIntroProps) {
  const autoSkip = useSettings(s => s.settings.skipIntro);
  const [hasSkipped, setHasSkipped] = useState(false);

  // Munculkan hanya di dalam window time, dan jika belum ditekan
  const isVisible = currentTime >= showAt && currentTime <= hideAt && !hasSkipped;

  // Fitur "Ghost": Auto-Skip tanpa klik jika diaktifkan di store
  useEffect(() => {
    if (autoSkip && isVisible) {
      onSkip(hideAt);
      setHasSkipped(true);
    }
  }, [autoSkip, isVisible, hideAt, onSkip]);

  if (!isVisible) return null;

  return (
    <button 
      onClick={(e) => { 
        e.stopPropagation(); 
        onSkip(hideAt); 
        setHasSkipped(true); 
      }}
      className="absolute bottom-24 right-6 z-30 px-5 py-2.5 bg-black/80 hover:bg-black text-white text-sm font-bold rounded-lg border border-white/20 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-right-4 duration-300"
    >
      Lewati Opening <span className="text-[#0a84ff]">▶▶</span>
    </button>
  );
}
