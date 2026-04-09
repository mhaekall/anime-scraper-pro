"use client";

import { useState, useEffect } from "react";
import { IconPlay, IconInfo } from "@/ui/icons";

interface Comment {
  id: number;
  user_id: string;
  username: string;
  text: string;
  timestamp_sec: number | null;
  created_at: string;
  reactions: number;
  avatar?: string;
}

interface Props {
  anilistId: string;
  episode: string;
  currentTime: number;
  onSeek: (time: number) => void;
}

export function CommentSection({ anilistId, episode, currentTime, onSeek }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  
  const userId = "local_user_" + Math.floor(Math.random() * 1000); // MVP Mock User

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v2/social/comments?anilistId=${anilistId}&episodeNumber=${episode}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setComments(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [anilistId, episode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    // Optimistic UI
    const optimisticComment: Comment = {
      id: Date.now(),
      user_id: userId,
      username: "You",
      text: newComment,
      timestamp_sec: Math.floor(currentTime),
      created_at: new Date().toISOString(),
      reactions: 0,
    };
    setComments([optimisticComment, ...comments]);
    setNewComment("");

    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v2/social/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          anilistId: parseInt(anilistId),
          episodeNumber: parseFloat(episode),
          text: optimisticComment.text,
          timestamp_sec: optimisticComment.timestamp_sec
        })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReact = async (commentId: number) => {
    setComments(prev => prev.map(c => c.id === commentId ? { ...c, reactions: c.reactions + 1 } : c));
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/v2/social/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment_id: commentId,
          user_id: userId,
          emoji: "🔥"
        })
      });
    } catch(e) {}
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-full anim-fade">
      {/* Composer */}
      <div className="p-4 border-b border-[#2c2c2e] bg-[#0a0c10] sticky top-0 z-10">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            type="text" 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Tulis komentar..."
            className="flex-1 bg-[#1c1c1e] text-white text-sm rounded-full px-4 py-2 border border-white/10 focus:outline-none focus:border-[#0a84ff]"
          />
          <button type="submit" className="bg-[#0a84ff] text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-blue-600 transition-colors">
            Kirim
          </button>
        </form>
        <div className="mt-2 text-[11px] text-[#8e8e93] flex items-center gap-1">
          <IconInfo className="w-3 h-3" /> Komentar akan di-tag pada {formatTime(currentTime)}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full anim-spin" /></div>
        ) : comments.length === 0 ? (
          <div className="text-center text-[#8e8e93] text-sm pt-8">Belum ada komentar. Jadilah yang pertama!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-3 group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {c.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-xs">{c.username}</span>
                  <span className="text-[#8e8e93] text-[10px]">{new Date(c.created_at).toLocaleDateString()}</span>
                  {c.timestamp_sec != null && (
                    <button 
                      onClick={() => onSeek(c.timestamp_sec!)}
                      className="text-[#0a84ff] text-[10px] font-mono bg-[#0a84ff]/10 px-1.5 py-0.5 rounded hover:bg-[#0a84ff]/20 transition-colors"
                    >
                      {formatTime(c.timestamp_sec)}
                    </button>
                  )}
                </div>
                <p className="text-[#d1d1d6] text-sm mt-1 leading-relaxed">{c.text}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => handleReact(c.id)} className="flex items-center gap-1 text-[#8e8e93] hover:text-white transition-colors">
                    <span className="text-xs">🔥</span>
                    <span className="text-[11px] font-medium">{c.reactions}</span>
                  </button>
                  <button className="text-[11px] text-[#8e8e93] hover:text-white font-medium transition-colors">Balas</button>
                  <button className="text-[11px] text-[#8e8e93] hover:text-white font-medium transition-colors opacity-0 group-hover:opacity-100">Ikuti</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
