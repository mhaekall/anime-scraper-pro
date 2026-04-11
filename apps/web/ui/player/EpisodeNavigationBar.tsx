"use client";
import Link from "next/link";
import { useEffect } from "react";

// Inline Icons
const PrevIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>;
const NextIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;

interface NavigationProps {
  prevUrl?: string;
  nextUrl?: string;
  currentTitle: string;
}

export function EpisodeNavigationBar({ prevUrl, nextUrl, currentTitle }: NavigationProps) {
  // Shortcut listeners for Prev/Next
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 'n' && nextUrl) window.location.href = nextUrl;
      if (e.key.toLowerCase() === 'p' && prevUrl) window.location.href = prevUrl;
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextUrl, prevUrl]);

  return (
    <div className="flex items-center justify-between w-full bg-[#1c1c1e]/50 border-y border-[#2c2c2e] px-4 py-3 shrink-0">
      {prevUrl ? (
        <Link href={prevUrl} className="flex items-center gap-2 text-[#8e8e93] hover:text-white text-sm font-bold transition-colors">
          <PrevIcon /> Prev (P)
        </Link>
      ) : <div className="w-24" />}

      <div className="text-white text-sm font-bold truncate max-w-[50%] text-center">
        {currentTitle}
      </div>

      {nextUrl ? (
        <Link href={nextUrl} className="flex items-center gap-2 text-[#0a84ff] hover:text-[#64d2ff] text-sm font-bold transition-colors">
          Next (N) <NextIcon />
        </Link>
      ) : <div className="w-24 text-right text-xs text-[#8e8e93] font-bold">TAMAT</div>}
    </div>
  );
}
