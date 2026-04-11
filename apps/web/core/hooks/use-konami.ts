import { useEffect, useRef } from "react";

const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];

export function useKonami(callback: () => void) {
  const seq = useRef<string[]>([]);
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      seq.current = [...seq.current, e.key].slice(-KONAMI.length);
      if (seq.current.join(",") === KONAMI.join(",")) {
        callback();
        seq.current = [];
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [callback]);
}