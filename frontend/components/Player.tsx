"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Settings, Play, Server, ChevronDown } from "lucide-react";

interface Source {
  resolved: string;
  quality: string;
  provider: string;
  type: string;
}

interface PlayerProps {
  title: string;
  poster?: string;
  sources: Source[];
}

export function Player({ title, poster, sources }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSource, setCurrentSource] = useState<Source | null>(sources[0] || null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentSource) return;

    let hls: Hls;
    const src = currentSource.resolved;

    if (currentSource.type === 'iframe') {
      return;
    }

    if (Hls.isSupported() && src.includes(".m3u8")) {
      hls = new Hls({
        maxMaxBufferLength: 100,
        startLevel: -1,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              setError("Gagal memuat video. Server mungkin down.");
              break;
          }
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
    } else {
      video.src = src;
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [currentSource]);

  if (!currentSource) {
    return <div className="text-white">Video tidak tersedia.</div>;
  }

  // Grup sumber berdasarkan kualitas
  const qualities = Array.from(new Set(sources.map(s => s.quality))).sort((a, b) => {
    const rank: Record<string, number> = {"1080p": 4, "720p": 3, "480p": 2, "360p": 1, "Auto": 0};
    return (rank[b] || 0) - (rank[a] || 0);
  });

  return (
    <div className="flex flex-col gap-0 w-full max-w-5xl mx-auto rounded-[2rem] overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl">
      
      {/* Player Container */}
      <div className="relative w-full aspect-video bg-black group">
        {currentSource.type === 'iframe' ? (
          <iframe 
            src={currentSource.resolved} 
            allowFullScreen 
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-presentation"
            className="w-full h-full border-none"
            title={title}
          />
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center text-white/80 bg-zinc-900 backdrop-blur-md">
            <p className="px-6 py-3 bg-red-500/20 text-red-200 border border-red-500/30 rounded-xl font-medium">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            controls
            autoPlay
            poster={poster}
            className="w-full h-full outline-none"
            playsInline
            crossOrigin="anonymous"
            title={title}
          />
        )}
      </div>

      {/* Control Bar (YouTube-like) */}
      <div className="flex items-center justify-between p-4 sm:px-6 bg-zinc-950 border-t border-white/5">
        <div className="flex items-center gap-3">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-sm font-medium text-white/80">Streaming Aktif</span>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-semibold">{currentSource.quality}</span>
          </button>

            {showSettings && (
              <div 
                className="absolute right-0 bottom-full mb-2 w-48 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col py-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="px-4 py-2 border-b border-white/5 mb-1">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Kualitas Video</span>
                </div>
                {qualities.map(q => {
                   const bestSourceForQuality = sources.find(s => s.quality === q);
                   return (
                     <button
                       key={q}
                       onClick={() => {
                         if (bestSourceForQuality) setCurrentSource(bestSourceForQuality);
                         setShowSettings(false);
                       }}
                       className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors ${
                         currentSource.quality === q ? 'bg-blue-500/20 text-blue-400' : 'text-white/80 hover:bg-white/5 hover:text-white'
                       }`}
                     >
                       {q}
                       {currentSource.quality === q && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                     </button>
                   );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}