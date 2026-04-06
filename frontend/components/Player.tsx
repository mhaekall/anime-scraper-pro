"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useWatchHistory } from "@/hooks/useWatchHistory";
import { Icons } from "./Icons";
import { useThemeContext } from "./ThemeProvider";

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
  animeSlug?: string;
  episodeNum?: number;
}

const QUALITY_RANK: Record<string, number> = {
  "1080p": 4, "720p": 3, "480p": 2, "360p": 1, "Auto": 0
};

const getProxiedUrl = (url: string) => {
  if (!url || url.includes('/api/v1/stream')) return url;
  // Gunakan URL absolut ke backend jika perlu, atau relatif jika satu domain
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${backendUrl}/api/v1/stream?url=${encodeURIComponent(url)}`;
};

const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function Player({ title, poster, sources, animeSlug, episodeNum }: PlayerProps) {
  const { updateProgress } = useWatchHistory();
  const { settings, watchlist, updateWatchlistStatus } = useThemeContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sort sources by quality and Wrap with Proxy
  const sorted = [...sources]
    .filter(s => s.type !== 'iframe' && s.resolved)
    .map(s => ({ ...s, resolved: getProxiedUrl(s.resolved) }))
    .sort((a, b) => (QUALITY_RANK[b.quality] || 0) - (QUALITY_RANK[a.quality] || 0));

  // Default to 720p if available
  const default720 = sorted.find(s => s.quality === '720p') || sorted[0];
  
  const [current, setCurrent] = useState<Source | null>(default720 || null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQuality, setShowQuality] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);

  // Load video source
  const loadSource = useCallback((src: Source, seekTo?: number) => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);
    setError(null);

    // Cleanup existing HLS
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isM3U8 = src.resolved.includes('.m3u8') || src.resolved.includes('m3u8');

    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1, // auto quality
        maxMaxBufferLength: 60,
        enableWorker: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src.resolved);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (seekTo) video.currentTime = seekTo;
        if (settings.autoPlayNext) video.play().then(() => setPlaying(true)).catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('Stream tidak dapat dimuat. Coba server lain.');
          setLoading(false);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') && isM3U8) {
      video.src = src.resolved;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (seekTo) video.currentTime = seekTo;
        if (settings.autoPlayNext) video.play().then(() => setPlaying(true)).catch(() => {});
      }, { once: true });
    } else {
      // Direct MP4
      video.src = src.resolved;
      video.addEventListener('canplay', () => {
        setLoading(false);
        if (seekTo) video.currentTime = seekTo;
        if (settings.autoPlayNext) video.play().then(() => setPlaying(true)).catch(() => {});
      }, { once: true });
      video.load();
    }
  }, [settings.autoPlayNext]);

  // Initial load
  useEffect(() => {
    if (current) loadSource(current);
    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, []);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setProgress(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDuration = () => setDuration(video.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onEnded = () => setPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
    };
  }, []);

  // Sync progress to cloud & Handle Sudden Exit
  useEffect(() => {
    if (!animeSlug || !episodeNum || duration <= 0) return;
    
    const progressData = {
      animeSlug,
      animeTitle: title.split(' - ')[0] || title,
      animeCover: poster,
      episode: episodeNum,
      episodeTitle: title,
      timestampSec: Math.floor(progress),
      durationSec: Math.floor(duration),
      source: current?.provider,
      quality: current?.quality,
      completed: duration > 0 && (progress / duration) > 0.9,
    };

    const interval = setInterval(() => {
      updateProgress(progressData);
      if (animeSlug && watchlist.find(w => w.id === animeSlug)) {
        updateWatchlistStatus(animeSlug, undefined, episodeNum);
      }
    }, 15000); 

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        navigator.sendBeacon('/api/history', JSON.stringify(progressData));
        if (animeSlug && watchlist.find(w => w.id === animeSlug)) {
          updateWatchlistStatus(animeSlug, undefined, episodeNum);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      // Final save on unmount
      if (progress > 5) {
        updateProgress(progressData);
        if (animeSlug && watchlist.find(w => w.id === animeSlug)) {
          updateWatchlistStatus(animeSlug, undefined, episodeNum);
        }
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [progress, duration, animeSlug, episodeNum, title, poster, current, updateProgress]);

  // Auto-hide controls
  const showCtrl = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    if (playing) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  // Toggle play/pause
  const togglePlay = useCallback((e?: any) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    showCtrl();
  }, [showCtrl]);

  // Skip time
  const skip = useCallback((amount: number, e?: any) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video || !duration) return;
    const np = clamp(video.currentTime + amount, 0, duration);
    video.currentTime = np;
    setProgress(np);
    showCtrl();
  }, [duration, showCtrl]);

  // Progress Bar Seek
  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration || !barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    let clientX = 0;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    video.currentTime = ratio * duration;
    setProgress(ratio * duration);
  }, [duration]);

  // Volume
  const changeVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      setMuted(v === 0);
    }
  }, []);

  // Quality switch (preserve position)
  const switchQuality = useCallback((src: Source) => {
    const currentTime = videoRef.current?.currentTime || 0;
    setCurrent(src);
    setShowQuality(false);
    loadSource(src, currentTime);
  }, [loadSource]);

  // Fullscreen
  const toggleFullscreen = useCallback((e?: any) => {
    e?.stopPropagation();
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  // Change Speed
  const toggleSpeed = useCallback((e: any) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    video.playbackRate = nextSpeed;
    setSpeed(nextSpeed);
  }, [speed]);

  if (!current && sources.length === 0) {
    return (
      <div className="w-full aspect-video bg-[#1C1C1E] rounded-[24px] flex flex-col items-center justify-center border border-white/5">
        <Icons.Play cls="w-12 h-12 text-[#8E8E93] mb-2 opacity-50" />
        <p className="text-[#8E8E93] font-bold text-sm">Sumber video tidak tersedia</p>
      </div>
    );
  }

  // Fallback to iframe if no resolvable source
  const iframeSrc = sources.find(s => s.type === 'iframe');
  if (!current && iframeSrc) {
    return (
      <div className="w-full aspect-video bg-black rounded-[24px] overflow-hidden border border-white/5 shadow-2xl">
        <iframe
          src={iframeSrc.resolved}
          className="w-full h-full border-none"
          allowFullScreen
          allow="autoplay; fullscreen"
        />
      </div>
    );
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black md:rounded-[24px] overflow-hidden select-none group border border-white/5 shadow-2xl"
      onMouseMove={showCtrl}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={() => setShowControls(p => !p)}
    >
      {/* VIDEO */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        preload="auto"
        onClick={e => e.stopPropagation()}
        onDoubleClick={toggleFullscreen}
      />

      {/* LOADING SPINNER */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin shadow-lg" />
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4 backdrop-blur-md">
          <Icons.Info />
          <p className="text-white/70 text-[15px] font-bold">{error}</p>
          {sorted.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); const next = sorted.find(s => s !== current); if (next) switchQuality(next); }}
              className="px-6 py-3 bg-white text-black text-[14px] font-bold rounded-full active:scale-95 transition-transform"
            >
              Coba Server Lain
            </button>
          )}
        </div>
      )}

      {/* FLASH PAUSE/PLAY (Center) */}
      {!playing && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] animate-fade-in">
            <Icons.Play cls="w-10 h-10 ml-1" />
          </div>
        </div>
      )}

      {/* DOUBLE TAP ZONES (Mobile) */}
      <div className="absolute inset-y-0 left-0 w-1/3 z-10" onDoubleClick={(e) => skip(-10, e)} />
      <div className="absolute inset-y-0 right-0 w-1/3 z-10" onDoubleClick={(e) => skip(10, e)} />

      {/* CONTROLS OVERLAY */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 z-20 pointer-events-none ${showControls ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/60 pointer-events-none" />

        {/* TOP BAR */}
        <div className="flex items-start justify-between p-4 md:p-6 relative z-30 pointer-events-auto">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-white font-bold text-[16px] md:text-[20px] truncate drop-shadow-md">{title}</h2>
            {current && <p className="text-[#8E8E93] text-[12px] font-medium mt-1">Server: {current.provider}</p>}
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={toggleSpeed} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full text-white text-[12px] font-bold border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
              {speed}x
            </button>
            
            <div className="relative pointer-events-auto">
              <button onClick={(e) => { e.stopPropagation(); setShowQuality(q => !q); }} className="px-3 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center gap-1.5 text-white text-[12px] font-bold border border-white/10 hover:bg-white/20 active:scale-95 transition-all">
                {current?.quality || 'Auto'}
              </button>
              
              {showQuality && (
                <div className="absolute top-full right-0 mt-2 bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 rounded-[16px] overflow-hidden shadow-2xl min-w-[140px] animate-fade-in pointer-events-auto">
                  <div className="px-4 py-2 border-b border-[#2C2C2E] text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider">Kualitas</div>
                  {sorted.map(s => (
                    <button
                      key={s.quality + s.provider}
                      onClick={(e) => { e.stopPropagation(); switchQuality(s); }}
                      className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-bold transition-colors text-white hover:bg-[#2C2C2E]"
                    >
                      {s.quality}
                      {current?.quality === s.quality && current?.provider === s.provider && <Icons.Check cls="w-4 h-4 text-[var(--accent)]" style={{ '--accent': settings.accentColor } as any} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 pointer-events-none" />

        {/* BOTTOM CONTROLS */}
        <div className="pb-4 md:pb-6 relative z-30 pointer-events-auto" onClick={e => e.stopPropagation()}>
          
          {/* Progress Bar (Draggable) */}
          <div className="px-4 md:px-8 mb-4">
            <div 
              ref={barRef}
              className="relative h-1.5 md:h-2 hover:h-2.5 transition-all cursor-pointer rounded-full bg-white/20 group/prog"
              onMouseDown={handleSeek}
              onTouchStart={handleSeek}
            >
              {/* Buffered */}
              <div className="absolute top-0 left-0 h-full bg-white/30 rounded-full transition-all" style={{ width: `${bufPct}%` }} />
              {/* Progress */}
              <div className="absolute top-0 left-0 h-full rounded-full transition-all duration-100" style={{ width: `${pct}%`, backgroundColor: settings.accentColor }} />
              {/* Thumb */}
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)] opacity-0 group-hover/prog:opacity-100 transition-opacity" style={{ left: `calc(${pct}% - 8px)` }} />
            </div>
          </div>

          <div className="flex items-center justify-between px-4 md:px-8">
            {/* Left Controls */}
            <div className="flex items-center gap-4 md:gap-6">
              <button onClick={togglePlay} className="text-white active:scale-90 transition-transform">
                {playing ? <Icons.Pause cls="w-7 h-7" /> : <Icons.Play cls="w-7 h-7" />}
              </button>
              
              {/* Volume (Desktop mainly) */}
              <div className="hidden md:flex items-center gap-3 group/vol">
                <button onClick={() => { setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m; }); }} className="text-white active:scale-90">
                  {muted || volume === 0 ? <Icons.VolumeMute /> : <Icons.VolumeUp />}
                </button>
                <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300">
                  <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={changeVolume} className="w-full h-1 cursor-pointer accent-white" />
                </div>
              </div>

              {/* Time */}
              <div className="text-white font-bold text-[13px] tabular-nums tracking-wide">
                {fmt(progress)} <span className="text-[#8E8E93] font-medium mx-1">/</span> {fmt(duration)}
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4 md:gap-6">
              <button onClick={(e) => skip(-10, e)} className="text-white active:scale-90 transition-transform hidden sm:block"><Icons.SkipBack /></button>
              <button onClick={(e) => skip(10, e)} className="text-white active:scale-90 transition-transform hidden sm:block"><Icons.SkipForward /></button>
              
              <button onClick={toggleFullscreen} className="text-white active:scale-90 transition-transform ml-2">
                <Icons.Maximize />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
