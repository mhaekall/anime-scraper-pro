"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { useWatchHistory } from "@/hooks/useWatchHistory";

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

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function Player({ title, poster, sources, animeSlug, episodeNum }: PlayerProps) {
  const { updateProgress, getProgress } = useWatchHistory();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sort sources by quality
  const sorted = [...sources]
    .filter(s => s.type !== 'iframe' && s.resolved)
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
        video.play().then(() => setPlaying(true)).catch(() => {});
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
        video.play().then(() => setPlaying(true)).catch(() => {});
      }, { once: true });
    } else {
      // Direct MP4
      video.src = src.resolved;
      video.addEventListener('canplay', () => {
        setLoading(false);
        if (seekTo) video.currentTime = seekTo;
        video.play().then(() => setPlaying(true)).catch(() => {});
      }, { once: true });
      video.load();
    }
  }, []);

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

    const interval = setInterval(() => updateProgress(progressData), 15000); 

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        navigator.sendBeacon('/api/history', JSON.stringify(progressData));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
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
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
    showCtrl();
  }, [showCtrl]);

  // Seek
  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
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
  const toggleFullscreen = useCallback(() => {
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

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      const video = videoRef.current;
      if (!video) return;
      switch(e.key) {
        case ' ':
        case 'k': e.preventDefault(); togglePlay(); break;
        case 'ArrowRight': video.currentTime = Math.min(video.currentTime + 10, duration); break;
        case 'ArrowLeft': video.currentTime = Math.max(video.currentTime - 10, 0); break;
        case 'ArrowUp': video.volume = Math.min(video.volume + 0.1, 1); setVolume(video.volume); break;
        case 'ArrowDown': video.volume = Math.max(video.volume - 0.1, 0); setVolume(video.volume); break;
        case 'f': toggleFullscreen(); break;
        case 'm': setMuted(m => { if (video) video.muted = !m; return !m; }); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, toggleFullscreen, duration]);

  if (!current && sources.length === 0) {
    return (
      <div className="w-full aspect-video bg-zinc-900 rounded-2xl flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Tidak ada sumber video tersedia</p>
      </div>
    );
  }

  // Fallback to iframe if no resolvable source
  const iframeSrc = sources.find(s => s.type === 'iframe');
  if (!current && iframeSrc) {
    return (
      <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden">
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
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden select-none group"
      onMouseMove={showCtrl}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={togglePlay}
      style={{ cursor: showControls ? 'default' : 'none' }}
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
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-3">
          <p className="text-white/70 text-sm">{error}</p>
          {sorted.length > 1 && (
            <button
              onClick={e => { e.stopPropagation(); const next = sorted.find(s => s !== current); if (next) switchQuality(next); }}
              className="px-4 py-2 bg-white text-black text-sm font-bold rounded-full"
            >
              Coba Server Lain
            </button>
          )}
        </div>
      )}

      {/* PAUSE ICON FLASH */}
      {!playing && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
            <svg className="w-7 h-7 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </div>
        </div>
      )}

      {/* CONTROLS OVERLAY */}
      <div
        className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        onClick={e => e.stopPropagation()}
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 40%)' }}
      >
        {/* PROGRESS BAR */}
        <div className="px-4 pb-2">
          <div
            className="relative h-1 hover:h-1.5 transition-all cursor-pointer rounded-full bg-white/25 group/prog"
            onClick={seek}
          >
            {/* Buffered */}
            <div
              className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
              style={{ width: `${bufPct}%` }}
            />
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
              style={{ width: `${pct}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover/prog:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="flex items-center gap-3 px-4 pb-3">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="text-white hover:scale-110 transition-transform"
          >
            {playing ? (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            )}
          </button>

          {/* Skip buttons */}
          <button
            onClick={() => { if (videoRef.current) videoRef.current.currentTime -= 10; }}
            className="text-white hover:scale-110 transition-transform"
            title="-10s"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <text x="9.5" y="14" fontSize="7" fill="currentColor" stroke="none">10</text>
            </svg>
          </button>
          <button
            onClick={() => { if (videoRef.current) videoRef.current.currentTime += 10; }}
            className="text-white hover:scale-110 transition-transform"
            title="+10s"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <text x="9.5" y="14" fontSize="7" fill="currentColor" stroke="none">10</text>
            </svg>
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setMuted(m => { if (videoRef.current) videoRef.current.muted = !m; return !m; }); }}
              className="text-white"
            >
              {muted || volume === 0 ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="m11 5-6 4H1v6h4l6 4V5Z"/>
                  <line x1="22" x2="16" y1="9" y2="15" stroke="white" strokeWidth="2"/>
                  <line x1="16" x2="22" y1="9" y2="15" stroke="white" strokeWidth="2"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 5 5 9H1v6h4l6 4V5ZM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" stroke="white" strokeWidth="2" fill="none"/>
                  <path d="m11 5-6 4H1v6h4l6 4V5Z"/>
                </svg>
              )}
            </button>
            <input
              type="range" min="0" max="1" step="0.05"
              value={muted ? 0 : volume}
              onChange={changeVolume}
              className="w-16 h-1 accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Time */}
          <span className="text-white text-xs font-medium ml-1 tabular-nums">
            {fmt(progress)} / {fmt(duration)}
          </span>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Quality Selector */}
          <div className="relative">
            <button
              onClick={() => setShowQuality(q => !q)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              {current?.quality || 'Auto'}
            </button>

            {showQuality && (
              <div className="absolute bottom-full right-0 mb-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl min-w-[140px]">
                <div className="px-3 py-2 border-b border-white/5 text-xs text-zinc-400 font-bold uppercase tracking-wider">
                  Kualitas
                </div>
                {sorted.map(s => (
                  <button
                    key={s.quality + s.provider}
                    onClick={() => switchQuality(s)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                      current?.quality === s.quality && current?.provider === s.provider
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'text-white/80 hover:bg-white/5'
                    }`}
                  >
                    <span className="font-semibold">{s.quality}</span>
                    {current?.quality === s.quality && (
                      <svg className="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="text-white hover:scale-110 transition-transform">
            {fullscreen ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* SERVER INFO */}
      {showControls && current && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs text-white/60 pointer-events-none">
          {current.provider}
        </div>
      )}
    </div>
  );
}