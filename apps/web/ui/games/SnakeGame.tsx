"use client";

import { useEffect, useRef, useState } from "react";

const CELL = 20;
const ROWS = 20;
const COLS = 20;

type Point = { x: number; y: number };
type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";

export function SnakeGame({ onClose }: { onClose: () => void }) {
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [dir, setDir] = useState<Dir>("RIGHT");
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const dirRef = useRef<Dir>("RIGHT");
  const snakeRef = useRef(snake);
  snakeRef.current = snake;

  const randFood = (): Point => ({
    x: Math.floor(Math.random() * COLS),
    y: Math.floor(Math.random() * ROWS),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowUp: "UP", ArrowDown: "DOWN",
        ArrowLeft: "LEFT", ArrowRight: "RIGHT",
        w: "UP", s: "DOWN", a: "LEFT", d: "RIGHT",
      };
      const next = map[e.key];
      if (!next) return;
      const opp = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" };
      if (next !== opp[dirRef.current]) {
        dirRef.current = next;
        setDir(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (dead) return;
    const tick = setInterval(() => {
      setSnake(prev => {
        const head = { ...prev[0] };
        const d = dirRef.current;
        if (d === "UP") head.y--;
        if (d === "DOWN") head.y++;
        if (d === "LEFT") head.x--;
        if (d === "RIGHT") head.x++;

        // Wall collision
        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
          setDead(true); return prev;
        }
        // Self collision
        if (prev.some(p => p.x === head.x && p.y === head.y)) {
          setDead(true); return prev;
        }

        const newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 10);
          setFood(randFood());
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    }, 120);
    return () => clearInterval(tick);
  }, [dead, food]);

  return (
    <div className="fixed inset-0 z-[500] bg-black/95 flex flex-col items-center justify-center gap-4">
      <div className="text-center mb-2">
        <p className="text-[#30d158] font-black text-sm uppercase tracking-widest">SNAKE</p>
        <p className="text-white font-black text-3xl">{score}</p>
      </div>
      
      <div
        className="relative border border-[#2c2c2e] rounded-lg overflow-hidden"
        style={{ width: COLS * CELL, height: ROWS * CELL, background: "#0a0c10" }}
      >
        {/* Grid dots */}
        {Array.from({ length: ROWS }).map((_, y) =>
          Array.from({ length: COLS }).map((_, x) => (
            <div key={`${x}-${y}`} className="absolute w-0.5 h-0.5 rounded-full bg-white/5"
              style={{ left: x * CELL + CELL/2, top: y * CELL + CELL/2 }} />
          ))
        )}
        
        {/* Food */}
        <div className="absolute rounded-sm bg-[#ff453a] transition-all"
          style={{ left: food.x * CELL + 2, top: food.y * CELL + 2, width: CELL - 4, height: CELL - 4 }} />
        
        {/* Snake */}
        {snake.map((seg, i) => (
          <div key={i} className="absolute rounded-sm transition-none"
            style={{
              left: seg.x * CELL + 1, top: seg.y * CELL + 1,
              width: CELL - 2, height: CELL - 2,
              background: i === 0 ? "#30d158" : `hsl(${140 - i * 2}, 70%, ${50 - i * 0.5}%)`
            }} />
        ))}
        
        {/* Dead overlay */}
        {dead && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3">
            <p className="text-white font-black text-xl">GAME OVER</p>
            <p className="text-[#30d158] font-bold">Score: {score}</p>
            <button
              onClick={() => {
                setSnake([{ x: 10, y: 10 }]);
                setFood(randFood());
                setDir("RIGHT"); dirRef.current = "RIGHT";
                setScore(0); setDead(false);
              }}
              className="px-6 py-2 bg-white text-black font-black rounded-full text-sm"
            >
              RESTART
            </button>
          </div>
        )}
      </div>
      
      <div className="flex gap-6 text-[#8e8e93] text-xs font-mono">
        <span>WASD / Arrows</span>
        <span>•</span>
        <button onClick={onClose} className="text-[#ff453a] hover:text-white transition-colors">ESC / Close</button>
      </div>
    </div>
  );
}