import { useState, useEffect } from 'react';

// Tipe spesifik untuk event Chrome
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function useA2HS() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Deteksi jika aplikasi sudah berjalan di mode Standalone (PWA terinstall)
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      // Kompatibilitas iOS tambahan
      const isStandaloneIOS = ('standalone' in window.navigator) && (window.navigator as any).standalone;
      setIsStandalone(isStandaloneMedia || !!isStandaloneIOS);
    };

    checkStandalone();

    // Deteksi perangkat iOS (karena Apple tidak men-support event beforeinstallprompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Tangkap event instalasi di Chrome/Android
    const handleBeforeInstallPrompt = (e: Event) => {
      // Mencegah mini-infobar default muncul
      e.preventDefault();
      // Simpan event untuk di-trigger nanti via tombol
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    
    // Munculkan prompt native
    await deferredPrompt.prompt();
    
    // Tunggu respon pengguna
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the A2HS prompt');
    }
    
    // Reset prompt karena hanya bisa dipanggil sekali
    setDeferredPrompt(null);
  };

  return {
    isInstallable: !!deferredPrompt,
    isIOS,
    isStandalone,
    promptInstall,
  };
}
