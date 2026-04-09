// ui/overlays/BottomSheet.tsx — Reusable modal/sheet

"use client";

import { useEffect, useState } from "react";
import { IconClose } from "@/ui/icons";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  full?: boolean;
}

export function BottomSheet({ open, onClose, title, children, full }: Props) {
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) { setRendered(true); requestAnimationFrame(() => setVisible(true)); }
    else { setVisible(false); const t = setTimeout(() => setRendered(false), 350); return () => clearTimeout(t); }
  }, [open]);

  if (!rendered) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end md:justify-center md:items-center">
      <div className={`absolute inset-0 bg-black/80 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div className={`relative w-full md:w-[600px] bg-[#121212] md:rounded-3xl rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        visible ? "translate-y-0 scale-100" : "translate-y-full md:translate-y-10 md:scale-95"
      } ${full ? "h-[95vh] md:h-[85vh]" : "max-h-[92vh] md:max-h-[85vh]"}`}>
        <div className="w-full flex justify-center py-3 md:hidden"><div className="w-12 h-1.5 bg-[#3a3a3c] rounded-full" /></div>
        {title && (
          <div className="flex items-center justify-between px-6 pb-4 pt-2 md:pt-6 border-b border-white/5">
            <h2 className="text-xl font-black text-white">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 bg-[#2c2c2e] rounded-full flex items-center justify-center text-[#8e8e93]"><IconClose /></button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto no-scrollbar">{children}</div>
      </div>
    </div>
  );
}
