// ui/overlays/Toaster.tsx — Lightweight toast notifications

"use client";

import { useToast } from "@/core/stores/app-store";
import { IconCheck, IconClose, IconInfo } from "@/ui/icons";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[999] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto max-w-md w-full glass rounded-2xl p-3 flex items-center justify-between anim-toast">
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              t.type === "success" ? "bg-[#30D158]/20 text-[#30D158]" :
              t.type === "error" ? "bg-[#FF453A]/20 text-[#FF453A]" :
              "bg-[#0A84FF]/20 text-[#0A84FF]"
            }`}>
              {t.type === "success" ? <IconCheck /> : t.type === "error" ? <IconClose /> : <IconInfo />}
            </div>
            <p className="text-white text-[13px] font-medium">{t.message}</p>
          </div>
          <button onClick={() => dismiss(t.id)} className="text-[#8e8e93] p-1"><IconClose /></button>
        </div>
      ))}
    </div>
  );
}
