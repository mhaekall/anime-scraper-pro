'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Icons } from './Icons';

interface AnimePlayerProps {
  src: string | null;
  poster?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onError?: (err: string) => void;
}

export default function AnimePlayer({ src, poster, autoPlay = true, onEnded, onError }: AnimePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls;
    setIsBuffering(true);

    if (Hls.isSupported() && src.includes('.m3u8')) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
        if (autoPlay) {
          video.play().catch(e => console.error("Autoplay failed:", e));
        }
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
            if (onError) onError('Stream failed to load.');
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl') || src.includes('.mp4')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsBuffering(false);
        if (autoPlay) {
          video.play().catch(e => console.error("Autoplay failed:", e));
        }
      });
      video.addEventListener('error', () => {
        if (onError) onError('Failed to load video source.');
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src, autoPlay, onError]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const manualChange = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = (videoRef.current.duration / 100) * manualChange;
      setProgress(manualChange);
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden group font-sans"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onClick={handlePlayPause}
    >
      {!src && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#111] z-20">
          <p className="text-white/50 text-sm font-medium">Resolving stream...</p>
        </div>
      )}

      {src && isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={onEnded}
        playsInline
      />

      <div 
        className={`absolute bottom-0 left-0 right-0 p-4 pt-16 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 w-full mb-3">
          <input
            type="range"
            min="0"
            max="100"
            value={progress || 0}
            onChange={handleSeek}
            className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:h-1.5 transition-all"
          />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-5">
            <button onClick={handlePlayPause} className="hover:scale-110 transition-transform">
              {isPlaying ? <Icons.Pause cls="w-7 h-7 fill-white" /> : <Icons.Play cls="w-7 h-7 fill-white" />}
            </button>
            <button onClick={handleMute} className="hover:scale-110 transition-transform text-white">
              {isMuted ? <Icons.VolumeMute /> : <Icons.VolumeUp />}
            </button>
            <span className="text-xs font-medium opacity-90 font-mono tracking-wide">
              {formatTime(currentTime)} <span className="opacity-50 mx-1">/</span> {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-5">
            <button className="hover:scale-110 transition-transform text-white opacity-90">
              <Icons.Settings />
            </button>
            <button onClick={toggleFullscreen} className="hover:scale-110 transition-transform text-white opacity-90">
              <Icons.Maximize />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
