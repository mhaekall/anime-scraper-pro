"use client";

import { useState, useEffect } from "react";
import { Icons } from "./Icons";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  fullHeight?: boolean;
}

export const BottomSheet = ({ isOpen, onClose, children, title, fullHeight = false }: BottomSheetProps) => {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsRendered(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end md:justify-center md:items-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-400 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      {/* Sheet / Dialog */}
      <div 
        className={`relative w-full md:w-[600px] lg:w-[800px] bg-[#121212] md:rounded-[24px] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl transition-transform duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-full md:translate-y-10 md:scale-95'} ${fullHeight ? 'h-[95vh] md:h-[85vh]' : 'max-h-[92vh] md:max-h-[85vh]'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Grabber for mobile */}
        <div className="w-full flex justify-center py-3 md:hidden">
          <div className="w-12 h-1.5 bg-[#3A3A3C] rounded-full" />
        </div>
        
        {/* Optional Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pb-4 pt-2 md:pt-6 border-b border-white/5">
            <h2 className="text-[20px] md:text-[24px] font-black text-white">{title}</h2>
            <button onClick={onClose} className="w-8 h-8 bg-[#2C2C2E] rounded-full flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors active:scale-90"><Icons.Close /></button>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto hide-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
