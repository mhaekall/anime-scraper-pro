import { useState, useRef, MutableRefObject } from 'react';

/**
 * Hook untuk mengenali gestur double-tap kiri/kanan pada kontainer video
 */
export function useVideoGestures(videoRef: MutableRefObject<HTMLVideoElement | null>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripple, setRipple] = useState<{ side: 'left' | 'right', id: number } | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (!videoRef.current || !containerRef.current) return;
    
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    // Deteksi Double Tap
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      e.preventDefault(); // Mencegah zoom bawaan browser
      
      let clientX;
      if ('touches' in e) clientX = e.touches[0].clientX;
      else clientX = (e as React.MouseEvent).clientX;

      const rect = containerRef.current.getBoundingClientRect();
      const isRightSide = (clientX - rect.left) > (rect.width / 2);
      
      // Hitung lompatan waktu (10 detik)
      const skipAmount = isRightSide ? 10 : -10;
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + skipAmount));
      
      // Trigger animasi ripple
      setRipple({ side: isRightSide ? 'right' : 'left', id: now });
      setTimeout(() => setRipple(null), 500); // Bersihkan ripple
      
      lastTapRef.current = 0; // Reset
    } else {
      lastTapRef.current = now;
    }
  };

  return { containerRef, handleTouchStart, ripple };
}
