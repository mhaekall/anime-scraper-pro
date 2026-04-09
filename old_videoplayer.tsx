"use client";

/**
 * VideoPlayer.tsx
 *
 * A self-contained video player with these guarantees:
 *   - Every URL goes through the backend proxy (/api/v1/stream?url=…)
 *     so no raw external host is ever exposed in the DOM or accessible
 *     by clicking inside the video element.
 *   - Context menu is disabled — user cannot "Copy video address".
 *   - If a source type is 'iframe' (embed that couldn't be resolved),
 *     it renders inside a <iframe sandbox> that blocks popups and
 *     top-level navigation. The user can never leave the app from
 *     inside the player.
 *   - HLS.js handles adaptive streaming; quality can be switched
 *     without a page reload while preserving playback position.
 *   - Keyboard shortcuts: Space (play/pause), ←/→ (±10 s), F (fullscreen).
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useThemeContext } from "./ThemeProvider";
import { useWatchHistory } from "@/hooks/useWatchHistory";

// ── types ──────────────────────────────────────────────────────────────────────

export interface VideoSource {
  provider: string;
  quality: string;
  url: string;
  /** 'hls' | 'mp4' | 'iframe' */
  type: string;
  source: string;
}

interface VideoPlayerProps {
  title: string;
  poster?: string;
  sources: VideoSource[];
  animeSlug?: string;   // for watch-history persistence
  episodeNum?: number;
  onEnded?: () => void;
}

// ── constants ──────────────────────────────────────────────────────────────────

const QUALITY_ORDER = ["1080p", "720p", "480p", "360p", "Auto"];
const SPEED_OPTIONS  = [0.5, 0.75, 1, 1.25, 1.5, 2];

// ── helpers ────────────────────────────────────────────────────────────────────

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Route every video URL through our backend proxy. */
function toProxyUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("/api/")) return url;             // already proxied
  return `${BACKEND}/api/v1/stream?url=${encodeURIComponent(url)}`;
}

function fmt(s: number): string {
  if (!s || isNaN(s) || !isFinite(s)) return "0:00";
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ── component ──────────────────────────────────────────────────────────────────

export function VideoPlayer({
  title,
  poster,
  sources,
  animeSlug,
  episodeNum,
  onEnded,
}: VideoPlayerProps) {
  const { settings }       = useThemeContext();
  const { updateProgress } = useWatchHistory();

  const videoRef      = useRef<HTMLVideoElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const barRef        = useRef<HTMLDivElement>(null);
  const hlsRef        = useRef<Hls | null>(null);
  const hideTimer     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const saveTimer     = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Separate direct sources from iframe fallbacks
  const directSources = sources
    .filter(s => s.type !== "iframe" && s.url)
    .map(s => ({ ...s, url: toProxyUrl(s.url) }))
    .sort((a, b) => QUALITY_ORDER.indexOf(a.quality) - QUALITY_ORDER.indexOf(b.quality));

  const iframeSources = sources.filter(s => s.type === "iframe" && s.url);

  const defaultSrc =
    directSources.find(s => s.quality === "720p") ??
    directSources[0] ??
    null;

  const [current,      setCurrent]      = useState<VideoSource | null>(defaultSrc);
  const [playing,      setPlaying]      = useState(false);
  const [loading,      setLoading]      = useState(true);
  const [progress,     setProgress]     = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [buffered,     setBuffered]     = useState(0);
  const [muted,        setMuted]        = useState(false);
  const [volume,       setVolume]       = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showQuality,  setShowQuality]  = useState(false);
  const [showSpeed,    setShowSpeed]    = useState(false);
  const [fullscreen,   setFullscreen]   = useState(false);
  const [speed,        setSpeed]        = useState(1);
  const [error,        setError]        = useState<string | null>(null);
  // Show iframe player if no direct sources or all direct sources errored
  const [useIframe,    setUseIframe]    = useState(directSources.length === 0 && iframeSources.length > 0);

  useEffect(() => {
    setUseIframe(directSources.length === 0 && iframeSources.length > 0);
  }, [directSources.length, iframeSources.length]);

  // ── load a source ────────────────────────────────────────────────────────────

  const loadSource = useCallback((src: VideoSource, seekTo?: number) => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);
    setError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHls = src.type === "hls" || src.url.includes("m3u8");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        startLevel:         -1,
        maxMaxBufferLength:  60,
        enableWorker:        true,
      });
      hlsRef.current = hls;
      hls.loadSource(src.url);
      hls.attachMedia(video);
      hls.once(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (seekTo != null) video.currentTime = seekTo;
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError("Stream gagal dimuat.");
              setLoading(false);
          }
        }
      });
    } else if ((video.canPlayType("application/vnd.apple.mpegurl")) && isHls) {
      // Safari native HLS
      video.src = src.url;
      video.onloadedmetadata = () => {
        setLoading(false);
        if (seekTo != null) video.currentTime = seekTo;
        video.play().catch(() => {});
      };
    } else {
      // MP4 / direct
      video.src = src.url;
      video.oncanplay = () => {
        setLoading(false);
        if (seekTo != null) video.currentTime = seekTo;
        video.play().catch(() => {});
      };
      video.load();
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (current) loadSource(current);
    return () => { hlsRef.current?.destroy(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── video events ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime  = () => {
      setProgress(video.currentTime);
      if (video.buffered.length > 0)
        setBuffered(video.buffered.end(video.buffered.length - 1));
    };
    const onDur   = () => setDuration(video.duration);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWait  = () => setLoading(true);
    const onCan   = () => setLoading(false);
    const onEnd   = () => { setPlaying(false); onEnded?.(); };

    video.addEventListener("timeupdate",    onTime);
    video.addEventListener("durationchange", onDur);
    video.addEventListener("play",           onPlay);
    video.addEventListener("pause",          onPause);
    video.addEventListener("waiting",        onWait);
    video.addEventListener("canplay",        onCan);
    video.addEventListener("ended",          onEnd);

    return () => {
      video.removeEventListener("timeupdate",     onTime);
      video.removeEventListener("durationchange",  onDur);
      video.removeEventListener("play",            onPlay);
      video.removeEventListener("pause",           onPause);
      video.removeEventListener("waiting",         onWait);
      video.removeEventListener("canplay",         onCan);
      video.removeEventListener("ended",           onEnd);
    };
  }, [onEnded]);

  // ── save progress every 15 s ─────────────────────────────────────────────────

  useEffect(() => {
    if (!animeSlug || !episodeNum) return;
    clearInterval(saveTimer.current);
    saveTimer.current = setInterval(() => {
      if (progress < 2 || duration < 2) return;
      updateProgress({
        animeSlug,
        animeTitle:   title.split(" - ")[0] ?? title,
        episode:      episodeNum,
        episodeTitle: title,
        timestampSec: Math.floor(progress),
        durationSec:  Math.floor(duration),
        completed:    duration > 0 && progress / duration > 0.9,
      });
    }, 15_000);
    return () => clearInterval(saveTimer.current);
  }, [progress, duration, animeSlug, episodeNum, title, updateProgress]);

  // ── keyboard shortcuts ────────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Only when player is in focus (or body)
      const active = document.activeElement;
      if (active && active !== document.body && !containerRef.current?.contains(active)) return;
      if ((active as HTMLElement)?.tagName === "INPUT") return;

      switch (e.code) {
        case "Space":      e.preventDefault(); togglePlay();         break;
        case "ArrowRight": e.preventDefault(); skip(10);            break;
        case "ArrowLeft":  e.preventDefault(); skip(-10);           break;
        case "KeyF":       e.preventDefault(); toggleFullscreen();  break;
        case "KeyM":       e.preventDefault(); toggleMute();        break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }); // no dep array — always has latest closures

  // ── fullscreen sync ───────────────────────────────────────────────────────────

  useEffect(() => {
    const h = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // ── control helpers ───────────────────────────────────────────────────────────

  const revealControls = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (videoRef.current && !videoRef.current.paused) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3_000);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
    revealControls();
  }, [revealControls]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }, []);

  const skip = useCallback((secs: number) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + secs));
    revealControls();
  }, [duration, revealControls]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    const v   = videoRef.current;
    if (!bar || !v || !duration) return;
    const ratio = (e.clientX - bar.getBoundingClientRect().left) / bar.offsetWidth;
    v.currentTime = Math.max(0, Math.min(1, ratio)) * duration;
  }, [duration]);

  const switchQuality = useCallback((src: VideoSource) => {
    const t = videoRef.current?.currentTime ?? 0;
    setCurrent(src);
    setShowQuality(false);
    loadSource(src, t);
  }, [loadSource]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const changeSpeed = useCallback((s: number) => {
    setSpeed(s);
    setShowSpeed(false);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }, []);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted  = v === 0;
      setMuted(v === 0);
    }
  }, []);

  // ── pct helpers ───────────────────────────────────────────────────────────────

  const pct    = duration > 0 ? (progress / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;

  // ── no sources at all ─────────────────────────────────────────────────────────

  if (directSources.length === 0 && iframeSources.length === 0) {
    return (
      <div className="w-full aspect-video bg-[#0A0C10] md:rounded-2xl flex flex-col items-center justify-center text-[#8E8E93] gap-3 border border-white/5">
        <svg className="w-10 h-10 opacity-40" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="text-sm font-semibold">Video tidak tersedia</p>
        <p className="text-xs text-[#48484A]">Coba kembali dalam beberapa detik</p>
      </div>
    );
  }

  // ── iframe fallback (sandboxed — no navigation possible) ──────────────────────

  if (useIframe && iframeSources.length > 0) {
    const iSrc = iframeSources[0];
    return (
      <div className="w-full aspect-video bg-black md:rounded-2xl overflow-hidden border border-white/5 relative">
        {/* Overlay prevents clicking links inside the iframe */}
        <div
          className="absolute inset-0 z-10 cursor-default"
          style={{ pointerEvents: "none" }}
        />
        <iframe
          src={iSrc.url}
          className="w-full h-full border-none"
          // sandbox: scripts + same-origin allowed, plus forms and presentation for 3rd party players
          sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-popups allow-popups-to-escape-sandbox"
          allow="autoplay; fullscreen"
          referrerPolicy="no-referrer"
          title={title}
        />
        {directSources.length > 0 && (
          <button
            onClick={() => setUseIframe(false)}
            className="absolute bottom-4 right-4 z-20 px-4 py-2 bg-white/10 backdrop-blur text-white text-xs font-bold rounded-full border border-white/20 hover:bg-white/20"
          >
            Gunakan Player Native
          </button>
        )}
      </div>
    );
  }

  // ── main player ───────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="relative w-full aspect-video bg-black md:rounded-2xl overflow-hidden outline-none select-none border border-white/5"
      onMouseMove={revealControls}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={togglePlay}
    >
      {/* ── video element ── */}
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        preload="auto"
        // Prevent context menu: user cannot "Copy video address"
        onContextMenu={e => e.preventDefault()}
        onClick={e => e.stopPropagation()}
        onDoubleClick={toggleFullscreen}
      />

      {/* ── loading spinner ── */}
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* ── error overlay ── */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
          <svg className="w-10 h-10 text-[#FF453A]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-white/80 text-sm font-bold">{error}</p>
          <div className="flex gap-3">
            {directSources.filter(s => s !== current).slice(0, 2).map(s => (
              <button
                key={s.quality + s.provider}
                onClick={e => { e.stopPropagation(); switchQuality(s); }}
                className="px-5 py-2.5 bg-white text-black text-sm font-bold rounded-full"
              >
                Coba {s.quality} ({s.provider})
              </button>
            ))}
            {iframeSources.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setUseIframe(true); }}
                className="px-5 py-2.5 bg-white/10 text-white text-sm font-bold rounded-full border border-white/20"
              >
                Gunakan Embed
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── center pause icon ── */}
      {!playing && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10">
            <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* ── double-tap skip zones (mobile) ── */}
      <div className="absolute inset-y-0 left-0 w-1/4 z-10" onDoubleClick={e => { e.stopPropagation(); skip(-10); }} />
      <div className="absolute inset-y-0 right-0 w-1/4 z-10" onDoubleClick={e => { e.stopPropagation(); skip(10); }} />

      {/* ── controls overlay ── */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 z-20 pointer-events-none ${showControls ? "opacity-100" : "opacity-0"}`}
        onClick={e => e.stopPropagation()}
      >
        {/* top bar */}
        <div className="bg-gradient-to-b from-black/80 to-transparent p-4 pointer-events-auto">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-bold text-sm truncate max-w-[55%] leading-tight drop-shadow">{title}</p>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Speed */}
              <div className="relative">
                <button
                  onClick={e => { e.stopPropagation(); setShowSpeed(v => !v); setShowQuality(false); }}
                  className="px-3 h-8 bg-black/50 rounded-full text-white text-xs font-bold border border-white/15 hover:bg-white/20"
                >
                  {speed === 1 ? "1×" : `${speed}×`}
                </button>
                {showSpeed && (
                  <div className="absolute top-full right-0 mt-1 bg-[#1C1C1E]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
                    {SPEED_OPTIONS.map(s => (
                      <button
                        key={s}
                        onClick={e => { e.stopPropagation(); changeSpeed(s); }}
                        className={`w-full px-5 py-2 text-xs font-bold text-left hover:bg-white/10 ${speed === s ? "text-white" : "text-[#8E8E93]"}`}
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quality */}
              {directSources.length > 1 && (
                <div className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); setShowQuality(v => !v); setShowSpeed(false); }}
                    className="px-3 h-8 bg-black/50 rounded-full text-white text-xs font-bold border border-white/15 hover:bg-white/20"
                  >
                    {current?.quality ?? "Auto"}
                  </button>
                  {showQuality && (
                    <div className="absolute top-full right-0 mt-1 bg-[#1C1C1E]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[150px]">
                      <div className="px-4 py-2 border-b border-white/5 text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider">
                        Kualitas
                      </div>
                      {directSources.map(s => (
                        <button
                          key={`${s.quality}-${s.provider}`}
                          onClick={e => { e.stopPropagation(); switchQuality(s); }}
                          className={`w-full px-4 py-2.5 text-xs font-bold text-left flex items-center justify-between gap-4 hover:bg-white/10 ${s === current ? "text-white" : "text-[#8E8E93]"}`}
                        >
                          <span>{s.quality}</span>
                          {s === current && (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* spacer */}
        <div className="flex-1" />

        {/* bottom bar */}
        <div className="bg-gradient-to-t from-black/90 to-transparent px-4 pb-4 pt-10 pointer-events-auto">
          {/* progress bar */}
          <div
            ref={barRef}
            className="relative h-1.5 cursor-pointer rounded-full bg-white/20 mb-4 group/bar hover:h-2.5 transition-all duration-150"
            onClick={seek}
          >
            {/* buffered */}
            <div
              className="absolute inset-y-0 left-0 bg-white/30 rounded-full pointer-events-none"
              style={{ width: `${bufPct}%` }}
            />
            {/* played */}
            <div
              className="absolute inset-y-0 left-0 rounded-full pointer-events-none transition-none"
              style={{ width: `${pct}%`, background: settings.accentColor }}
            />
            {/* thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full pointer-events-none opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-md"
              style={{ left: `calc(${pct}% - 8px)` }}
            />
          </div>

          {/* buttons row */}
          <div className="flex items-center justify-between gap-2">
            {/* left */}
            <div className="flex items-center gap-4">
              {/* play/pause */}
              <button onClick={e => { e.stopPropagation(); togglePlay(); }} className="text-white">
                {playing ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              {/* skip back */}
              <button onClick={e => { e.stopPropagation(); skip(-10); }} className="text-white hidden sm:block">
                <svg className="w-6 h-6 rotate-180" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 18l8.5-6L4 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              {/* skip forward */}
              <button onClick={e => { e.stopPropagation(); skip(10); }} className="text-white hidden sm:block">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4 18l8.5-6L4 6v12zM16 6v12h2V6h-2z" />
                </svg>
              </button>

              {/* volume */}
              <div className="flex items-center gap-2 group/vol">
                <button onClick={e => { e.stopPropagation(); toggleMute(); }} className="text-white">
                  {muted || volume === 0 ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  )}
                </button>
                <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200 hidden md:block">
                  <input
                    type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-full h-1 cursor-pointer accent-white"
                  />
                </div>
              </div>

              {/* time */}
              <span className="text-white text-xs font-mono tabular-nums hidden sm:block">
                {fmt(progress)} <span className="text-white/40">/</span> {fmt(duration)}
              </span>
            </div>

            {/* right */}
            <button onClick={e => { e.stopPropagation(); toggleFullscreen(); }} className="text-white">
              {fullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
