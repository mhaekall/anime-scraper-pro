// ui/player/VideoPlayer.tsx — Lightweight video player
// STRICT MODE: Direct Stream only (HLS/MP4). No Iframes.

"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { IconPlay, IconPause, IconFullscreen, IconVolume, IconSettings } from "@/ui/icons";
import { useSettings } from "@/core/stores/app-store";
import { useWatchHistory } from "@/core/hooks/use-watch-history";
import { useVideoGestures } from "@/core/hooks/use-video-gestures";
import type { VideoSource } from "@/core/types/anime";

const QUALITY_ORDER = ["1080p", "720p", "480p", "360p", "Auto"];
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Pre-load HLS.js promise so it starts fetching before the video source is ready
let hlsModulePromise: Promise<typeof import("hls.js")> | null = null;

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

const SkipBackwardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
);
const SkipForwardIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>
);

interface Props {
  anilistId: number;
  title: string;
  poster?: string;
  sources: VideoSource[];
  animeSlug?: string;
  episodeNum?: number;
  onRequireAutoNext?: () => void;
  onTimeUpdate?: (time: number) => void;
  isLoadingSources?: boolean;
}

function VideoPlayerInner({ anilistId, title, poster, sources, animeSlug, episodeNum, onRequireAutoNext, onTimeUpdate, isLoadingSources }: Props) {
  const accent = "#0A84FF";
  const autoPlayNext = useSettings((s) => s.settings.autoPlayNext);
  const { updateProgress } = useWatchHistory();

  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const rafRef = useRef<number | undefined>(undefined);
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const isDragging = useRef(false);

  // Trigger HLS module download immediately when the player mounts
  useEffect(() => {
    if (!hlsModulePromise && typeof window !== "undefined") {
      hlsModulePromise = import("hls.js");
    }
  }, []);

  // STRICT FILTER: Remove all iframes (User only uses direct stream)
  const direct = (sources || [])
    .filter((s) => s.type !== "iframe" && (s.url || s.resolved))
    .map((s) => ({ ...s, url: s.url ?? s.resolved ?? "" }))
    .sort((a, b) => QUALITY_ORDER.indexOf(a.quality) - QUALITY_ORDER.indexOf(b.quality));
  
  const defaultSrc = direct.find((s) => s.quality === "720p") ?? 
                    direct.find((s) => s.quality === "1080p") ?? 
                    direct[0] ?? null;

  const [current, setCurrent] = useState<VideoSource | null>(defaultSrc);
  const [isAuto, setIsAuto] = useState(true); // Default to Auto for HLS
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [controls, setControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [hasTriggeredAutoNext, setHasTriggeredAutoNext] = useState(false);
  const [volume, setVolume] = useState(1);

  const { containerRef, handleTouchStart, ripple } = useVideoGestures(videoRef);

  // Sync current when sources load
  useEffect(() => {
    if (!current && defaultSrc) {
      setCurrent(defaultSrc);
    }
  }, [defaultSrc, current]);

  // Dynamic HLS.js import with preloaded promise
  const loadSource = useCallback(async (src: VideoSource, seekTo?: number, autoQuality = true) => {
    const video = videoRef.current;
    if (!video || !src) return;
    setLoading(true);
    setError(null);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const isHls = src.type === "hls" || src.url.includes("m3u8");

    if (isHls) {
      try {
        if (!hlsModulePromise) hlsModulePromise = import("hls.js");
        const { default: Hls } = await hlsModulePromise;
        
        if (Hls.isSupported()) {
          const hls = new Hls({ 
            startLevel: autoQuality ? -1 : undefined, 
            capLevelToPlayerSize: true, 
            maxMaxBufferLength: 30, 
            maxBufferSize: 30 * 1000 * 1000,
            enableWorker: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;
          hls.loadSource(src.url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => { 
            setLoading(false); 
            if (seekTo != null) video.currentTime = seekTo; 
            video.play().catch(() => {}); 
          });
          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) { 
              console.error("Fatal HLS Error:", data);
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  hls.recoverMediaError();
                  break;
                default:
                  setError("Gagal memuat video stream."); 
                  setLoading(false);
                  hls.destroy();
                  break;
              }
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src.url;
          video.onloadedmetadata = () => { setLoading(false); if (seekTo != null) video.currentTime = seekTo; video.play().catch(() => {}); };
        }
      } catch (e) {
        console.error("HLS Initialization Error:", e);
        setError("Gagal memuat player video.");
        setLoading(false);
      }
    } else {
      video.src = src.url;
      video.oncanplay = () => { setLoading(false); if (seekTo != null) video.currentTime = seekTo; video.play().catch(() => {}); };
      video.onerror = () => { setError("Gagal memuat file MP4."); setLoading(false); };
      video.load();
    }
  }, [animeSlug, episodeNum]);

  useEffect(() => { if (current) loadSource(current, undefined, isAuto); return () => hlsRef.current?.destroy(); }, [current, loadSource, isAuto]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      progressRef.current = v.currentTime;
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
      const dur = v.duration;
      if (dur > 0 && (v.currentTime / dur) >= 0.9 && autoPlayNext && !hasTriggeredAutoNext && onRequireAutoNext) {
        onRequireAutoNext();
        setHasTriggeredAutoNext(true);
      }
    };
    const onDur = () => {
      setDuration(v.duration);
      durationRef.current = v.duration;
    };
    const onPlay = () => { setPlaying(true); setLoading(false); };
    const onPause = () => setPlaying(false);
    const onWait = () => setLoading(true);
    const onCan = () => setLoading(false);
    const onEnd = () => {
      setPlaying(false);
      if (autoPlayNext && !hasTriggeredAutoNext && onRequireAutoNext) {
        onRequireAutoNext();
        setHasTriggeredAutoNext(true);
      }
    };
    
    v.addEventListener("timeupdate", onTime); v.addEventListener("durationchange", onDur);
    v.addEventListener("play", onPlay); v.addEventListener("pause", onPause);
    v.addEventListener("waiting", onWait); v.addEventListener("canplay", onCan);
    v.addEventListener("ended", onEnd);
    return () => { v.removeEventListener("timeupdate", onTime); v.removeEventListener("durationchange", onDur); v.removeEventListener("play", onPlay); v.removeEventListener("pause", onPause); v.removeEventListener("waiting", onWait); v.removeEventListener("canplay", onCan); v.removeEventListener("ended", onEnd); };
  }, [autoPlayNext, hasTriggeredAutoNext, onRequireAutoNext]);

  useEffect(() => {
    if (!anilistId || !episodeNum) return;
    clearInterval(saveTimer.current);
    saveTimer.current = setInterval(() => {
      if (progress < 2 || duration < 2) return;
      updateProgress({ 
        anilistId,
        animeSlug: animeSlug || String(anilistId), 
        animeTitle: title.split(" - ")[0] ?? title, 
        episode: episodeNum, 
        episodeTitle: title, 
        timestampSec: Math.floor(progress), 
        durationSec: Math.floor(duration), 
        completed: duration > 0 && progress / duration > 0.9 
      });
    }, 15_000);
    return () => clearInterval(saveTimer.current);
  }, [progress, duration, anilistId, animeSlug, episodeNum, title, updateProgress]);

  const reveal = useCallback(() => { setControls(true); clearTimeout(hideTimer.current); if (videoRef.current && !videoRef.current.paused) hideTimer.current = setTimeout(() => setControls(false), 3000); }, []);
  const togglePlay = useCallback(() => { const v = videoRef.current; if (!v) return; v.paused ? v.play() : v.pause(); reveal(); }, [reveal]);
  const skip = useCallback((s: number) => { const v = videoRef.current; if (!v || !duration) return; v.currentTime = Math.max(0, Math.min(duration, v.currentTime + s)); reveal(); }, [duration, reveal]);
  const getSeekPercent = (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
    const b = barRef.current;
    if (!b) return 0;
    let clientX = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if ('clientX' in e) {
      clientX = (e as any).clientX;
    } else {
      return 0;
    }
    return Math.max(0, Math.min(1, (clientX - b.getBoundingClientRect().left) / b.offsetWidth));
  };

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => { 
    const v = videoRef.current; 
    if (!v || !duration) return; 
    v.currentTime = getSeekPercent(e) * duration; 
  }, [duration]);

  useEffect(() => {
    const onUp = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      if (videoRef.current && duration) {
        videoRef.current.currentTime = getSeekPercent(e) * duration;
      }
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      setProgress(getSeekPercent(e) * duration); // Preview posisi
    };
    window.addEventListener('mouseup', onUp as any);
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('touchend', onUp as any);
    window.addEventListener('touchmove', onMove as any);
    return () => {
      window.removeEventListener('mouseup', onUp as any);
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('touchend', onUp as any);
      window.removeEventListener('touchmove', onMove as any);
    };
  }, [duration]);
  const switchQ = useCallback((s: VideoSource, auto = false) => { 
    if (hlsRef.current && s.url === current?.url) {
      if (auto) {
        hlsRef.current.currentLevel = -1; // Auto ABR
      } else {
        const levelIndex = hlsRef.current.levels.findIndex(
          (l: any) => l.height === parseInt(s.quality)
        );
        if (levelIndex !== -1) {
          hlsRef.current.currentLevel = levelIndex; // Switch tanpa rebuild
          setIsAuto(false);
          setCurrent(s);
          setShowSettings(false);
          return;
        }
      }
    }
    const t = videoRef.current?.currentTime ?? 0; 
    setIsAuto(auto);
    setCurrent(s); 
    setShowSettings(false); 
    loadSource(s, t, auto); 
  }, [loadSource, current]);
  // Deteksi iOS
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const toggleFS = useCallback(async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    // iOS: gunakan native video fullscreen
    if (isIOS) {
      if ((video as any).webkitEnterFullscreen) {
        (video as any).webkitEnterFullscreen();
        return;
      }
    }

    if (!document.fullscreenElement) {
      try {
        await container.requestFullscreen();
        // Lock landscape setelah fullscreen granted
        if ((screen.orientation as any)?.lock) {
          await (screen.orientation as any).lock("landscape").catch(() => {});
        }
      } catch (e) {
        // Fallback: coba lewat video element
        if ((video as any).webkitRequestFullscreen) {
          (video as any).webkitRequestFullscreen();
        }
      }
    } else {
      await document.exitFullscreen().catch(() => {});
      (screen.orientation as any)?.unlock?.();
    }
  }, [isIOS]);
  useEffect(() => {
    const handleOrientationChange = () => {
      if (window.screen.orientation?.type.includes("landscape")) {
        if (videoRef.current && !videoRef.current.paused && !document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(() => {});
        }
      }
      if (window.screen.orientation?.type.includes("portrait")) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    screen.orientation?.addEventListener("change", handleOrientationChange);
    return () => screen.orientation?.removeEventListener("change", handleOrientationChange);
  }, []);

  const changeSpeed = useCallback((s: number) => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; }, []);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  if (isLoadingSources && direct.length === 0) return (
    <div className="w-full aspect-video bg-[#0a0c10] md:rounded-2xl flex flex-col items-center justify-center text-[#8e8e93] gap-3 border border-white/5">
      <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full anim-spin" />
      <p className="text-sm font-semibold">Mencari sumber video...</p>
    </div>
  );

  if (direct.length === 0 && !isLoadingSources) return (
    <div className="w-full aspect-video bg-[#0a0c10] md:rounded-2xl flex flex-col items-center justify-center text-[#8e8e93] gap-2 border border-white/5">
      <p className="text-sm font-semibold">Video tidak tersedia</p>
      <p className="text-xs text-[#48484a]">Provider tidak memberikan jalur stream langsung.</p>
    </div>
  );

  return (
    <div 
      ref={containerRef} 
      tabIndex={-1} 
      className="relative w-full aspect-video bg-black md:rounded-2xl overflow-hidden outline-none select-none border border-white/5 group" 
      onMouseMove={reveal} 
      onMouseLeave={() => playing && setControls(false)} 
      onClick={togglePlay} 
      onTouchStart={handleTouchStart}
    >
      <video 
        ref={videoRef} 
        autoPlay={true} 
        poster={poster} 
        className="w-full h-full object-contain" 
        playsInline 
        muted={muted} 
        preload="auto" 
        onContextMenu={(e) => e.preventDefault()} 
        onClick={(e) => e.stopPropagation()} 
      />

      {ripple && (
        <div className={`absolute top-0 bottom-0 w-1/2 pointer-events-none flex items-center justify-center overflow-hidden z-30 ${ripple.side === 'left' ? 'left-0' : 'right-0'}`}>
          <div className="absolute inset-0 bg-white/10 opacity-0 animate-[ripple_0.5s_ease-out]" />
          <div className="flex flex-col items-center justify-center gap-1 bg-black/40 rounded-full w-20 h-20 animate-in fade-in zoom-in duration-200">
             {ripple.side === 'left' ? (
               <>
                 <SkipBackwardIcon className="w-6 h-6 text-white" />
                 <span className="text-white font-bold text-xs">10s</span>
               </>
             ) : (
               <>
                 <SkipForwardIcon className="w-6 h-6 text-white" />
                 <span className="text-white font-bold text-xs">10s</span>
               </>
             )}
          </div>
        </div>
      )}

      {loading && !error && <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none"><div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full anim-spin" /></div>}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
          <p className="text-white/80 text-sm font-bold">{error}</p>
          <div className="flex gap-2">
            {direct.filter((s) => s !== current).slice(0, 2).map((s) => <button key={s.quality} onClick={(e) => { e.stopPropagation(); switchQ(s); }} className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full">Coba {s.quality}</button>)}
          </div>
        </div>
      )}

      {!playing && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center border border-white/10"><IconPlay className="w-8 h-8 ml-0.5" /></div>
        </div>
      )}

      {showSettings && (
        <div className="absolute bottom-16 right-4 z-50 bg-[#1c1c1e]/95 border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[240px] animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <span className="text-white font-bold text-sm">Pengaturan</span>
            <button onClick={() => setShowSettings(false)} className="text-[#8e8e93]"><IconSettings className="w-4 h-4" /></button>
          </div>
          <div className="space-y-4">
            {direct.length > 0 && (
              <div>
                <p className="text-[#8e8e93] text-[10px] uppercase font-bold tracking-wider mb-2">Kualitas Video</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {/* Auto Option for HLS */}
                  <button 
                    onClick={() => switchQ(direct[0], true)} 
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${isAuto ? 'bg-white text-black' : 'bg-white/5 text-[#8e8e93] hover:bg-white/10'}`}
                  >
                    Auto
                  </button>
                  {direct.map((s) => (
                    <button key={`${s.quality}-${s.provider}`} onClick={() => switchQ(s, false)} className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${s === current && !isAuto ? 'bg-white text-black' : 'bg-white/5 text-[#8e8e93] hover:bg-white/10'}`}>
                      {s.quality.replace('p', '')}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[#8e8e93] text-[10px] uppercase font-bold tracking-wider mb-2">Kecepatan</p>
              <div className="flex flex-wrap gap-1.5">
                {SPEED_OPTIONS.map((s) => (
                  <button key={s} onClick={() => changeSpeed(s)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${speed === s ? 'bg-white text-black' : 'bg-white/5 text-[#8e8e93] hover:bg-white/10'}`}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-200 z-20 pointer-events-none ${controls ? "opacity-100" : "opacity-0"}`} onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-b from-black/80 to-transparent p-4 md:p-6 pointer-events-auto">
          <p className="text-white font-bold text-sm md:text-base lg:text-lg truncate max-w-[80%] drop-shadow-md">{title}</p>
        </div>
        <div className="flex-1" />
        <div className="bg-gradient-to-t from-black/90 to-transparent px-safe pb-4 pt-12 pointer-events-auto">
          <div className="py-2 -my-2 group/bar cursor-pointer" 
            onMouseDown={(e) => {
              isDragging.current = true;
              const pct = getSeekPercent(e);
              setProgress(pct * duration); // Visual update dulu
            }}
            onTouchStart={(e) => {
              isDragging.current = true;
              const pct = getSeekPercent(e);
              setProgress(pct * duration); // Visual update dulu
            }}
          >
            <div ref={barRef} className="relative h-1 md:h-1.5 rounded-full bg-white/30 transition-all group-hover/bar:h-2 md:group-hover/bar:h-2.5">
              <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full pointer-events-none" style={{ width: `${bufPct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full pointer-events-none flex items-center justify-end" style={{ width: `${pct}%`, background: accent }}>
                <div className="w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full shadow translate-x-2 opacity-0 group-hover/bar:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white p-1.5 hover:bg-white/10 rounded-full transition-colors">{playing ? <IconPause className="w-6 h-6 md:w-7 md:h-7" /> : <IconPlay className="w-6 h-6 md:w-7 md:h-7" />}</button>
              
              <div className="flex items-center gap-2 group/vol">
                <button onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); if (!v.muted && volume === 0) { v.volume = 1; setVolume(1); } } }} className="text-white p-1.5 hover:bg-white/10 rounded-full transition-colors"><IconVolume muted={muted || volume === 0} className="w-5 h-5 md:w-6 md:h-6" /></button>
                <div className="w-0 group-hover/vol:w-16 overflow-hidden transition-all duration-200 hidden md:block">
                  <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => { const val = Number(e.target.value); setVolume(val); if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; setMuted(val === 0); } }} className="w-full h-1 cursor-pointer accent-white" />
                </div>
              </div>

              <span className="text-white/90 text-xs md:text-sm font-medium tabular-nums ml-1 md:ml-2">{fmt(progress)} <span className="text-white/50 mx-1">/</span> {fmt(duration)}</span>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className={`p-1.5 rounded-full transition-all duration-200 ${showSettings ? 'rotate-90 text-white bg-white/10' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}><IconSettings className="w-5 h-5 md:w-6 md:h-6" /></button>
              <button onClick={(e) => { e.stopPropagation(); toggleFS(); }} className="text-white p-1.5 hover:bg-white/10 rounded-full hover:scale-105 transition-all"><IconFullscreen className="w-5 h-5 md:w-6 md:h-6" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const VideoPlayer = memo(VideoPlayerInner);
