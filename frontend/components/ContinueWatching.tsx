"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlayCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

export function ContinueWatching() {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    const data = localStorage.getItem("anime_watch_history");
    if (data) {
      setHistory(JSON.parse(data));
    }
  }, []);

  if (history.length === 0) return null;

  return (
    <section className="flex flex-col gap-6 w-full mt-4 mb-8">
      <div className="flex items-center gap-2">
        <Clock className="text-blue-500 w-6 h-6" />
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white/90">
          Melanjutkan Tontonan
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
        {history.map((item, idx) => (
          <motion.div
            key={item.id + item.epId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="snap-start shrink-0 w-[280px] sm:w-[320px]"
          >
            <Link href={`/watch/${item.id}/${item.epId}`} className="group relative flex flex-col gap-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-900 shadow-xl ring-1 ring-white/10 transition-all duration-300 group-hover:ring-blue-500/50">
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
                
                {/* Real Image or Fallback pattern */}
                {item.poster ? (
                  <img src={item.poster} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                    <PlayCircle className="w-12 h-12 text-white/10" />
                  </div>
                )}

                <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white line-clamp-1">{item.title}</span>
                    <span className="text-xs text-blue-400 font-medium">Eps {item.epId.replace(/-/g, ' ')}</span>
                  </div>
                  <div className="p-2 bg-blue-500 rounded-full text-white transform translate-x-4 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
                    <PlayCircle className="w-4 h-4" fill="currentColor" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
