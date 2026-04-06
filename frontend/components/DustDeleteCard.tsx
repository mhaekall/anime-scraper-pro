"use client";

import { useState, useEffect, useRef } from "react";

interface DustDeleteCardProps {
  children: React.ReactNode;
  isDeleting: boolean;
  onDeleted: () => void;
}

export const DustDeleteCard = ({ children, isDeleting, onDeleted }: DustDeleteCardProps) => {
  const [particles, setParticles] = useState<any[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDeleting && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const newParticles = Array.from({ length: 25 }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const velocity = 30 + Math.random() * 80;
        return {
          id: i,
          x: rect.width / 2, 
          y: rect.height / 2,
          tx: `${Math.cos(angle) * velocity}px`,
          ty: `${Math.sin(angle) * velocity}px`,
          color: ['#FF453A', '#FF9F0A', '#E5E5EA', '#8E8E93'][Math.floor(Math.random() * 4)],
          size: Math.random() * 4 + 2,
          delay: Math.random() * 0.15
        };
      });
      setParticles(newParticles);
      const timer = setTimeout(() => onDeleted(), 700);
      return () => clearTimeout(timer);
    }
  }, [isDeleting, onDeleted]);

  return (
    <div className="relative w-full">
      {isDeleting && (
        <div className="absolute inset-0 z-20 pointer-events-none">
          {particles.map(p => (
            <div key={p.id} className="absolute rounded-full"
              style={{ 
                width: p.size, height: p.size, left: p.x, top: p.y, backgroundColor: p.color, 
                '--tx': p.tx, '--ty': p.ty, animation: `dustFly 0.6s cubic-bezier(0.2, 1, 0.3, 1) ${p.delay}s forwards` 
              } as any}
            />
          ))}
        </div>
      )}
      <div ref={cardRef} className={`transition-all duration-400 ease-in-out ${isDeleting ? 'scale-90 opacity-0 blur-sm pointer-events-none' : 'opacity-100 scale-100 blur-none'}`}>
        {children}
      </div>
    </div>
  );
};
