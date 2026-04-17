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

const IconChevronRight = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
);

const IconChevronLeft = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
);

// Pre-load HLS.js promise
let hlsModulePromise: Promise<typeof import("hls.js")> | null = null;

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = Math.floor(s % 60);
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
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
  const progressRef = useRef(0);
  const durationRef = useRef(0);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!hlsModulePromise && typeof window !== "undefined") {
      hlsModulePromise = import("hls.js");
    }
  }, []);

  const direct = (sources || [])
    .filter((s) => s.type !== "iframe" && (s.url || s.resolved))
    .map((s) => ({ ...s, url: s.url ?? s.resolved ?? "" }))
    .sort((a, b) => QUALITY_ORDER.indexOf(a.quality) - QUALITY_ORDER.indexOf(b.quality));
  
  const defaultSrc = direct.find((s) => s.quality === "720p") ?? 
                    direct.find((s) => s.quality === "1080p") ?? 
                    direct[0] ?? null;

  const [current, setCurrent] = useState<VideoSource | null>(defaultSrc);
  const [isAuto, setIsAuto] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [muted, setMuted] = useState(false);
  const [controls, setControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [menuView, setMenuView] = useState<"main" | "quality" | "speed">("main");
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [hasTriggeredAutoNext, setHasTriggeredAutoNext] = useState(false);
  const [volume, setVolume] = useState(1);
  const [previewPos, setPreviewPos] = useState<number | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  const { containerRef, handleTouchStart, ripple } = useVideoGestures(videoRef);

  useEffect(() => {
    if (!current && defaultSrc) setCurrent(defaultSrc);
  }, [defaultSrc, current]);

  // Safe play helper to avoid AbortError
  const safePlay = useCallback(async (v: HTMLVideoElement) => {
    try {
      await v.play();
    } catch (e) {
      if ((e as any).name !== "AbortError") console.error("Play Error:", e);
    }
  }, []);

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
          });
          hls.on(Hls.Events.ERROR, (_: any, data: any) => {
            if (data.fatal) { 
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
                case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
                default: setError("Video tidak dapat dimuat."); setLoading(false); hls.destroy(); break;
              }
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src.url;
          video.onloadedmetadata = () => { setLoading(false); if (seekTo != null) video.currentTime = seekTo; };
        }
      } catch (e) {
        setError("Gagal menyiapkan video.");
        setLoading(false);
      }
    } else {
      video.src = src.url;
      video.oncanplay = () => { setLoading(false); if (seekTo != null) video.currentTime = seekTo; };
      video.onerror = () => { setError("Gagal memuat file video."); setLoading(false); };
      video.load();
    }
  }, []);

  useEffect(() => { if (current) loadSource(current, undefined, isAuto); return () => hlsRef.current?.destroy(); }, [current, loadSource, isAuto]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      progressRef.current = v.currentTime;
      if (!isDragging.current) setProgress(v.currentTime);
      if (onTimeUpdate) onTimeUpdate(v.currentTime);
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
      const dur = v.duration;
      if (dur > 0 && (v.currentTime / dur) >= 0.9 && autoPlayNext && !hasTriggeredAutoNext && onRequireAutoNext) {
        onRequireAutoNext();
        setHasTriggeredAutoNext(true);
      }
    };
    const onDur = () => { setDuration(v.duration); durationRef.current = v.duration; };
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
  }, [autoPlayNext, hasTriggeredAutoNext, onRequireAutoNext, onTimeUpdate]);

  const toggleFS = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) await container.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  }, []);

  const reveal = useCallback(() => { setControls(true); clearTimeout(hideTimer.current); if (videoRef.current && !videoRef.current.paused) hideTimer.current = setTimeout(() => setControls(false), 3000); }, []);

  // Keyboard Controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const v = videoRef.current;
      if (!v) return;

      switch(e.key.toLowerCase()) {
        case " ": e.preventDefault(); v.paused ? safePlay(v) : v.pause(); break;
        case "arrowright": v.currentTime = Math.min(v.duration, v.currentTime + 5); reveal(); break;
        case "arrowleft": v.currentTime = Math.max(0, v.currentTime - 5); reveal(); break;
        case "f": e.preventDefault(); toggleFS(); break;
        case "m": v.muted = !v.muted; setMuted(v.muted); break;
        case "arrowup": e.preventDefault(); setVolume(prev => { const n = Math.min(1, prev + 0.1); v.volume = n; return n; }); break;
        case "arrowdown": e.preventDefault(); setVolume(prev => { const n = Math.max(0, prev - 0.1); v.volume = n; return n; }); break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [toggleFS, reveal, safePlay]);

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

  const togglePlay = useCallback((e?: React.MouseEvent | React.TouchEvent) => { 
    if (e) e.stopPropagation();
    const v = videoRef.current; 
    if (!v) return; 
    v.paused ? safePlay(v) : v.pause(); 
    reveal(); 
  }, [reveal, safePlay]);

  const getSeekPercent = (e: MouseEvent | React.MouseEvent | TouchEvent | React.TouchEvent) => {
    const b = barRef.current;
    if (!b) return 0;
    let clientX = 0;
    if ('touches' in e && (e as any).touches.length > 0) clientX = (e as any).touches[0].clientX;
    else if ('clientX' in e) clientX = (e as any).clientX;
    else return 0;
    return Math.max(0, Math.min(1, (clientX - b.getBoundingClientRect().left) / b.offsetWidth));
  };

  useEffect(() => {
    const onUp = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      setPreviewPos(null);
      if (videoRef.current && duration) videoRef.current.currentTime = getSeekPercent(e) * duration;
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current) return;
      const pct = getSeekPercent(e);
      const time = pct * duration;
      setProgress(time);
      setPreviewPos(pct * 100);
      if (previewVideoRef.current) previewVideoRef.current.currentTime = time;
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
    const t = videoRef.current?.currentTime ?? 0; 
    setIsAuto(auto);
    setCurrent(s); 
    setShowSettings(false); 
    loadSource(s, t, auto); 
  }, [loadSource]);

  const changeSpeed = useCallback((s: number) => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; }, []);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  if (isLoadingSources && direct.length === 0) return (
    <div className="w-full aspect-video bg-[#0a0c10] md:rounded-2xl flex flex-col items-center justify-center text-[#8e8e93] gap-3 border border-white/5">
      <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full anim-spin" />
      <p className="text-sm font-semibold">Memuat video...</p>
    </div>
  );

  return (
    <div 
      ref={containerRef} 
      tabIndex={-1} 
      className="relative w-full aspect-video bg-black md:rounded-2xl overflow-hidden outline-none select-none border border-white/5 group" 
      onMouseMove={reveal} 
      onMouseLeave={() => playing && setControls(false)} 
      onClick={() => togglePlay()} 
      onTouchStart={handleTouchStart}
    >
      <video 
        ref={videoRef} 
        autoPlay={false} 
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
          <div className="flex flex-col items-center justify-center gap-1 bg-black/40 rounded-full w-20 h-20">
             {ripple.side === 'left' ? <SkipBackwardIcon className="w-6 h-6 text-white" /> : <SkipForwardIcon className="w-6 h-6 text-white" />}
             <span className="text-white font-bold text-xs">10s</span>
          </div>
        </div>
      )}

      {loading && !error && <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none"><div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full anim-spin" /></div>}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3 p-6 text-center">
          <p className="text-white text-sm font-bold">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-white text-black text-xs font-bold rounded-full">Muat Ulang</button>
        </div>
      )}

      {!playing && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto" onClick={(e) => togglePlay(e)}>
          <div className="w-20 h-20 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center border border-white/10 scale-100 hover:scale-110 active:scale-90 transition-all cursor-pointer">
            <IconPlay className="w-10 h-10 ml-1.5 fill-white text-white" />
          </div>
        </div>
      )}

      {showSettings && (
        <div className="absolute bottom-16 right-4 z-50 bg-[#1c1c1e]/95 border border-white/10 rounded-2xl shadow-2xl min-w-[220px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {menuView === "main" && (
            <div className="p-1.5 flex flex-col">
              <div className="px-3 py-2 border-b border-white/5 mb-1 flex items-center justify-between">
                 <span className="text-white font-bold text-xs uppercase tracking-widest opacity-50">Setelan</span>
                 <button onClick={() => setShowSettings(false)} className="text-[#8e8e93] hover:text-white transition-colors p-1"><IconSettings className="w-3.5 h-3.5" /></button>
              </div>
              <button onClick={() => setMenuView("quality")} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/10 transition-colors group">
                <div className="flex flex-col items-start"><span className="text-white text-sm font-semibold">Kualitas</span><span className="text-[#8e8e93] text-[11px] font-medium">{isAuto ? 'Auto' : current?.quality}</span></div>
                <IconChevronRight />
              </button>
              <button onClick={() => setMenuView("speed")} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-white/10 transition-colors group mt-0.5">
                <div className="flex flex-col items-start"><span className="text-white text-sm font-semibold">Kecepatan</span><span className="text-[#8e8e93] text-[11px] font-medium">{speed === 1 ? 'Normal' : `${speed}x`}</span></div>
                <IconChevronRight />
              </button>
            </div>
          )}

          {menuView === "quality" && (
            <div className="p-1.5 flex flex-col min-w-[200px]">
              <button onClick={() => setMenuView("main")} className="flex items-center gap-2 px-3 py-2 text-[#8e8e93] hover:text-white transition-colors mb-1">
                <IconChevronLeft />
                <span className="text-sm font-bold">Kualitas Video</span>
              </button>
              <div className="space-y-0.5">
                <button 
                  onClick={() => switchQ(direct[0], true)} 
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${isAuto ? 'bg-white/10 text-[#0a84ff]' : 'text-white/80 hover:bg-white/5'}`}
                >
                  <span className="text-sm font-semibold">Auto</span>
                  {isAuto && <div className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] shadow-[0_0_8px_#0a84ff]" />}
                </button>
                {direct.map((s) => (
                  <button 
                    key={`${s.quality}-${s.provider}`} 
                    onClick={() => switchQ(s, false)} 
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${!isAuto && s.url === current?.url ? 'bg-white/10 text-[#0a84ff]' : 'text-white/80 hover:bg-white/5'}`}
                  >
                    <span className="text-sm font-semibold">{s.quality}</span>
                    {!isAuto && s.url === current?.url && <div className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] shadow-[0_0_8px_#0a84ff]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {menuView === "speed" && (
            <div className="p-1.5 flex flex-col min-w-[180px]">
              <button onClick={() => setMenuView("main")} className="flex items-center gap-2 px-3 py-2 text-[#8e8e93] hover:text-white transition-colors mb-1">
                <IconChevronLeft />
                <span className="text-sm font-bold">Kecepatan</span>
              </button>
              <div className="space-y-0.5">
                {SPEED_OPTIONS.map((s) => (
                  <button 
                    key={s} 
                    onClick={() => { changeSpeed(s); setShowSettings(false); }} 
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${speed === s ? 'bg-white/10 text-[#0a84ff]' : 'text-white/80 hover:bg-white/5'}`}
                  >
                    <span className="text-sm font-semibold">{s === 1 ? 'Normal' : `${s}x`}</span>
                    {speed === s && <div className="w-1.5 h-1.5 rounded-full bg-[#0a84ff] shadow-[0_0_8px_#0a84ff]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-200 z-20 pointer-events-none ${controls ? "opacity-100" : "opacity-0"}`} onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-b from-black/80 to-transparent p-4 md:p-6 pointer-events-auto">
          <p className="text-white font-bold text-sm md:text-base lg:text-lg truncate max-w-[80%] drop-shadow-md">{title}</p>
        </div>
        <div className="bg-gradient-to-t from-black/90 to-transparent px-safe pb-4 pt-12 pointer-events-auto">
          <div className="relative py-3 -my-2 group/bar cursor-pointer touch-none" 
            onMouseDown={(e) => { isDragging.current = true; const pct = getSeekPercent(e); setProgress(pct * duration); setPreviewPos(pct * 100); }}
            onMouseMove={(e) => { if (!isDragging.current) { const pct = getSeekPercent(e); setPreviewPos(pct * 100); if (previewVideoRef.current) previewVideoRef.current.currentTime = pct * duration; } }}
            onMouseLeave={() => !isDragging.current && setPreviewPos(null)}
          >
            {previewPos !== null && duration > 0 && (
              <div className="absolute bottom-full mb-4 -translate-x-1/2 pointer-events-none" style={{ left: `${previewPos}%` }}>
                <div className="relative w-32 md:w-48 aspect-video bg-black border-2 border-white/20 rounded-lg overflow-hidden shadow-2xl">
                  <video ref={previewVideoRef} src={current?.url} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-bold text-white">{fmt((previewPos / 100) * duration)}</div>
                </div>
              </div>
            )}
            <div ref={barRef} className="relative h-1.5 md:h-2 rounded-full bg-white/20 transition-all group-hover/bar:h-2.5">
              <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufPct}%` }} />
              <div className="absolute inset-y-0 left-0 rounded-full flex items-center justify-end" style={{ width: `${pct}%`, background: accent }}>
                <div className="w-4 h-4 md:w-5 md:h-5 bg-white rounded-full shadow-lg scale-100 group-hover/bar:scale-110 transition-transform translate-x-1/2" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-3">
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={(e) => togglePlay(e)} className="text-white p-1.5 hover:bg-white/10 rounded-full">{playing ? <IconPause className="w-6 h-6" /> : <IconPlay className="w-6 h-6" />}</button>
              <span className="text-white/90 text-xs md:text-sm font-medium tabular-nums ml-1">{fmt(progress)} <span className="text-white/50 mx-1">/</span> {fmt(duration)}</span>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className={`p-1.5 rounded-full transition-all ${showSettings ? 'bg-white text-black' : 'text-white/90 hover:bg-white/10'}`}><IconSettings className="w-5 h-5" /></button>
              <button onClick={(e) => { e.stopPropagation(); toggleFS(); }} className="text-white p-1.5 hover:bg-white/10 rounded-full"><IconFullscreen className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const VideoPlayer = memo(VideoPlayerInner);
