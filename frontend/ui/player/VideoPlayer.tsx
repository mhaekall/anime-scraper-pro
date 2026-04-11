// ui/player/VideoPlayer.tsx — Lightweight video player
// KEY FIX: HLS.js loaded dynamically only when needed. No import at module level.

"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import { IconPlay, IconPause, IconFullscreen, IconVolume, IconSettings } from "@/ui/icons";
import { useSettings } from "@/core/stores/app-store";
import { useWatchHistory } from "@/core/hooks/use-watch-history";
import { useVideoGestures } from "@/core/hooks/use-video-gestures";
import type { VideoSource } from "@/core/types/anime";
import { API } from "@/core/lib/api";

const BACKEND = API;
const QUALITY_ORDER = ["1080p", "720p", "480p", "360p", "Auto"];
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function proxyUrl(url: string): string {
  if (!url || url.startsWith("/api/")) return url;
  return `${BACKEND}/api/v1/stream?url=${encodeURIComponent(url)}`;
}

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

interface Props {
  title: string;
  poster?: string;
  sources: VideoSource[];
  animeSlug?: string;
  episodeNum?: number;
  onRequireAutoNext?: () => void;
  onTimeUpdate?: (time: number) => void;
  isLoadingSources?: boolean;
}

function VideoPlayerInner({ title, poster, sources, animeSlug, episodeNum, onRequireAutoNext, onTimeUpdate, isLoadingSources }: Props) {
  const accent = useSettings((s) => s.settings.accentColor);
  const autoPlayNext = useSettings((s) => s.settings.autoPlayNext);
  const { updateProgress } = useWatchHistory();

  const videoRef = useRef<HTMLVideoElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saveTimer = useRef<ReturnType<typeof setInterval>>(undefined);

  const direct = sources
    .filter((s) => s.type !== "iframe" && (s.url || s.resolved) && s.quality !== "360p" && s.quality !== "480p")
    .map((s) => ({ ...s, url: s.url ?? s.resolved ?? "" }))
    .sort((a, b) => QUALITY_ORDER.indexOf(a.quality) - QUALITY_ORDER.indexOf(b.quality));
  
  const defaultSrc = direct.find((s) => s.quality === "720p") ?? direct.find((s) => s.quality === "1080p") ?? direct.find((s) => s.quality === "Auto") ?? direct[0] ?? null;

  const [current, setCurrent] = useState(defaultSrc);
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

  // Dynamic HLS.js import
  const loadSource = useCallback(async (src: VideoSource, seekTo?: number) => {
    const video = videoRef.current;
    if (!video || !src) return;
    setLoading(true);
    setError(null);

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const isHls = src.type === "hls" || src.url.includes("m3u8");

    if (isHls) {
      try {
        // Dynamic import — only loads HLS.js when actually needed
        const { default: Hls } = await import("hls.js");
        
        if (Hls.isSupported()) {
          const hls = new Hls({ 
            startLevel: -1, 
            maxMaxBufferLength: 30,
            backBufferLength: 30,
            enableWorker: true,
          });
          hlsRef.current = hls;
          hls.loadSource(src.url);
          hls.attachMedia(video);
          hls.once("hlsManifestParsed" as any, (_: any, data: any) => { 
            // Enforce minimum 720p for Auto quality
            if (data.levels && Array.isArray(data.levels)) {
              const allowedLevels = data.levels
                .map((l: any, i: number) => ({ ...l, index: i }))
                .filter((l: any) => l.height >= 720);
              
              if (allowedLevels.length > 0) {
                // Find the index of the first 720p level
                const firstHDIndex = allowedLevels[0].index;
                hls.startLevel = firstHDIndex;
                
                // Override the level controller to only pick from HD levels
                hls.on("hlsLevelLoading" as any, () => {
                  if (hls.autoLevelEnabled) {
                    if (hls.nextLevel < firstHDIndex) {
                      hls.nextLevel = firstHDIndex;
                    }
                  }
                });
              }
            }
            
            setLoading(false); 
            if (seekTo != null) video.currentTime = seekTo; 
            video.play().catch(() => {}); 
          });
          hls.on("hlsError" as any, (_: any, data: any) => {
            if (data.fatal) { setError("Stream gagal dimuat."); setLoading(false); }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = src.url;
          video.onloadedmetadata = () => { setLoading(false); if (seekTo != null) video.currentTime = seekTo; video.play().catch(() => {}); };
        }
      } catch (e) {
        console.error("HLS Load Error:", e);
        setError("Gagal memuat player.");
        setLoading(false);
      }
    } else {
      video.src = src.url;
      video.oncanplay = () => { setLoading(false); if (seekTo != null) video.currentTime = seekTo; video.play().catch(() => {}); };
      video.load();
    }
  }, [animeSlug, episodeNum]);

  useEffect(() => { if (current) loadSource(current); return () => hlsRef.current?.destroy(); }, [current, loadSource]);

  // Video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setProgress(v.currentTime);
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
      
      // Auto-Next 90% threshold
      const dur = v.duration;
      if (dur > 0 && (v.currentTime / dur) >= 0.9 && autoPlayNext && !hasTriggeredAutoNext && onRequireAutoNext) {
        onRequireAutoNext();
        setHasTriggeredAutoNext(true);
      }
    };
    const onDur = () => setDuration(v.duration);
    const onPlay = () => setPlaying(true);
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

  // Save progress every 15s
  useEffect(() => {
    if (!animeSlug || !episodeNum) return;
    clearInterval(saveTimer.current);
    saveTimer.current = setInterval(() => {
      if (progress < 2 || duration < 2) return;
      updateProgress({ animeSlug, animeTitle: title.split(" - ")[0] ?? title, episode: episodeNum, episodeTitle: title, timestampSec: Math.floor(progress), durationSec: Math.floor(duration), completed: duration > 0 && progress / duration > 0.9 });
    }, 15_000);
    return () => clearInterval(saveTimer.current);
  }, [progress, duration, animeSlug, episodeNum, title, updateProgress]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.code) {
        case "Space": e.preventDefault(); togglePlay(); break;
        case "ArrowRight": e.preventDefault(); skip(10); break;
        case "ArrowLeft": e.preventDefault(); skip(-10); break;
        case "KeyF": e.preventDefault(); toggleFS(); break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const reveal = useCallback(() => { setControls(true); clearTimeout(hideTimer.current); if (videoRef.current && !videoRef.current.paused) hideTimer.current = setTimeout(() => setControls(false), 3000); }, []);
  const togglePlay = useCallback(() => { const v = videoRef.current; if (!v) return; v.paused ? v.play() : v.pause(); reveal(); }, [reveal]);
  const skip = useCallback((s: number) => { const v = videoRef.current; if (!v || !duration) return; v.currentTime = Math.max(0, Math.min(duration, v.currentTime + s)); reveal(); }, [duration, reveal]);
  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => { const b = barRef.current; const v = videoRef.current; if (!b || !v || !duration) return; v.currentTime = Math.max(0, Math.min(1, (e.clientX - b.getBoundingClientRect().left) / b.offsetWidth)) * duration; }, [duration]);
  const switchQ = useCallback((s: VideoSource) => { const t = videoRef.current?.currentTime ?? 0; setCurrent(s); setShowSettings(false); loadSource(s, t); }, [loadSource]);
  const toggleFS = useCallback(() => { if (!document.fullscreenElement) containerRef.current?.requestFullscreen(); else document.exitFullscreen(); }, []);
  const changeSpeed = useCallback((s: number) => { setSpeed(s); if (videoRef.current) videoRef.current.playbackRate = s; }, []);
  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await videoRef.current.requestPictureInPicture();
      setShowSettings(false);
    } catch (e) { console.error("PiP error:", e); }
  }, []);

  const pct = duration > 0 ? (progress / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  // Loading sources
  if (isLoadingSources && direct.length === 0) return (
    <div className="w-full aspect-video bg-[#0a0c10] md:rounded-2xl flex flex-col items-center justify-center text-[#8e8e93] gap-3 border border-white/5">
      <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full anim-spin" />
      <p className="text-sm font-semibold">Mencari sumber video...</p>
    </div>
  );

  // No sources
  if (direct.length === 0) return (
    <div className="w-full aspect-video bg-[#0a0c10] md:rounded-2xl flex flex-col items-center justify-center text-[#8e8e93] gap-2 border border-white/5">
      <p className="text-sm font-semibold">Video tidak tersedia</p>
      <p className="text-xs text-[#48484a]">Coba kembali nanti</p>
    </div>
  );

  return (
    <div ref={containerRef} tabIndex={-1} className="relative w-full aspect-video bg-black md:rounded-2xl overflow-hidden outline-none select-none border border-white/5 group" onMouseMove={reveal} onMouseLeave={() => playing && setControls(false)} onClick={togglePlay} onTouchStart={handleTouchStart}>
      {/* @ts-ignore */}
      <video ref={videoRef} poster={poster} className="w-full h-full object-contain" playsInline muted={muted} preload="auto" onContextMenu={(e) => e.preventDefault()} onClick={(e) => e.stopPropagation()} onDoubleClick={toggleFS} referrerPolicy="no-referrer" />

      {/* Ripple effect for double tap */}
      {ripple && (
        <div className={`absolute top-0 bottom-0 w-1/2 pointer-events-none flex items-center justify-center overflow-hidden z-30 ${ripple.side === 'left' ? 'left-0' : 'right-0'}`}>
          <div className="absolute inset-0 bg-white/10 opacity-0 animate-[ripple_0.5s_ease-out]" />
          <div className="flex flex-col items-center justify-center gap-2 bg-black/40 rounded-full p-4 animate-in fade-in zoom-in duration-200">
             <span className="text-white font-bold text-sm">
                {ripple.side === 'left' ? '⏪ -10s' : '+10s ⏩'}
             </span>
          </div>
        </div>
      )}

      {(loading || isLoadingSources) && !error && <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none"><div className="w-10 h-10 border-3 border-white/20 border-t-white rounded-full anim-spin" /></div>}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
          <p className="text-white/80 text-sm font-bold">{error}</p>
          <div className="flex gap-2">
            {direct.filter((s) => s !== current).slice(0, 2).map((s) => <button key={s.quality + s.provider} onClick={(e) => { e.stopPropagation(); switchQ(s); }} className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full">Coba {s.quality}</button>)}
          </div>
        </div>
      )}

      {!playing && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center border border-white/10"><IconPlay className="w-8 h-8 ml-0.5" /></div>
        </div>
      )}

      {/* Settings Menu */}
      {showSettings && (
        <div className="absolute bottom-16 right-4 z-50 bg-[#1c1c1e]/95 border border-white/10 rounded-2xl p-4 shadow-2xl min-w-[240px] animate-in fade-in slide-in-from-bottom-4 duration-200 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
            <span className="text-white font-bold text-sm">Pengaturan</span>
            <button onClick={() => setShowSettings(false)} className="text-[#8e8e93]"><IconSettings className="w-4 h-4" /></button>
          </div>
          
          <div className="space-y-4">
            {/* Quality Section */}
            {direct.length > 0 && (
              <div>
                <p className="text-[#8e8e93] text-[10px] uppercase font-bold tracking-wider mb-2">Kualitas Video</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {direct.map((s) => (
                    <button key={s.quality} onClick={() => switchQ(s)} className={`py-1.5 rounded-lg text-[11px] font-bold transition-all ${s === current ? 'bg-white text-black' : 'bg-white/5 text-[#8e8e93] hover:bg-white/10'}`}>
                      {s.quality.replace('p', '')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Speed Section */}
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

            {/* PiP Toggle */}
            <button onClick={togglePiP} className="w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/5 transition-all">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><rect x="3" y="5" width="18" height="14" rx="2" /><rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" stroke="none" /></svg>
              Picture in Picture
            </button>
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-200 z-20 pointer-events-none ${controls ? "opacity-100" : "opacity-0"}`} onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-b from-black/70 to-transparent p-3 pointer-events-auto">
          <div className="flex items-center justify-between gap-2">
            <p className="text-white font-bold text-xs truncate max-w-[70%]">{title}</p>
          </div>
        </div>

        <div className="flex-1" />

        <div className="bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8 pointer-events-auto">
          <div ref={barRef} className="relative h-1 cursor-pointer rounded-full bg-white/20 mb-3 group/bar hover:h-2 transition-all" onClick={seek}>
            <div className="absolute inset-y-0 left-0 bg-white/25 rounded-full pointer-events-none" style={{ width: `${bufPct}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full pointer-events-none" style={{ width: `${pct}%`, background: accent }} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white">{playing ? <IconPause /> : <IconPlay />}</button>
              <span className="text-white text-[11px] font-mono tabular-nums">{fmt(progress)} / {fmt(duration)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 group/vol">
                <button onClick={(e) => { e.stopPropagation(); const v = videoRef.current; if (v) { v.muted = !v.muted; setMuted(v.muted); if (!v.muted && volume === 0) { v.volume = 1; setVolume(1); } } }} className="text-white"><IconVolume muted={muted || volume === 0} /></button>
                <div className="w-0 group-hover/vol:w-16 overflow-hidden transition-all duration-200 hidden md:block">
                  <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => { const val = Number(e.target.value); setVolume(val); if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; setMuted(val === 0); } }} className="w-full h-1 cursor-pointer accent-white" />
                </div>
              </div>
              
              <button onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }} className={`transition-transform duration-200 ${showSettings ? 'rotate-90 text-white' : 'text-[#8e8e93] hover:text-white'}`}>
                <IconSettings />
              </button>

              <button onClick={(e) => { e.stopPropagation(); toggleFS(); }} className="text-white hover:scale-110 transition-transform"><IconFullscreen /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const VideoPlayer = memo(VideoPlayerInner);
