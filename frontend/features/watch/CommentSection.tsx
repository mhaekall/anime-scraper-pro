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
    <div className="flex flex-col h-auto anim-fade">
      {/* Composer */}
      <div className="flex gap-4 mb-8">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
          U
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col group">
          <input 
            type="text" 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Tambahkan komentar..."
            className="w-full bg-transparent text-white text-sm pb-1 border-b border-white/20 focus:outline-none focus:border-white transition-colors"
          />
          <div className="flex justify-between items-center mt-2">
            <div className="text-[11px] text-[#8e8e93] flex items-center gap-1 opacity-0 group-focus-within:opacity-100 transition-opacity">
              <IconInfo className="w-3 h-3" /> Waktu: {formatTime(currentTime)}
            </div>
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setNewComment("")}
                className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${newComment ? 'text-white hover:bg-white/10' : 'text-transparent pointer-events-none'}`}
              >
                Batal
              </button>
              <button 
                type="submit" 
                disabled={!newComment.trim()}
                className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${newComment.trim() ? 'bg-[#0a84ff] text-white hover:bg-blue-600' : 'bg-white/10 text-white/30'}`}
              >
                Komentar
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full anim-spin" /></div>
        ) : comments.length === 0 ? (
          <div className="text-center text-[#8e8e93] text-sm py-8">Belum ada komentar. Jadilah yang pertama!</div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex gap-4 group/comment">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                {c.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-[13px]">@{c.username.toLowerCase()}</span>
                  <span className="text-[#8e8e93] text-[12px]">{new Date(c.created_at).toLocaleDateString()}</span>
                  {c.timestamp_sec != null && (
                    <button 
                      onClick={() => onSeek(c.timestamp_sec!)}
                      className="text-[#0a84ff] text-[12px] font-medium hover:underline transition-all"
                    >
                      {formatTime(c.timestamp_sec)}
                    </button>
                  )}
                </div>
                <p className="text-white text-[14px] leading-relaxed">{c.text}</p>
                <div className="flex items-center gap-4 mt-2">
                  <button onClick={() => handleReact(c.id)} className="flex items-center gap-1.5 text-[#8e8e93] hover:text-white transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                    <span className="text-[12px] font-medium">{c.reactions > 0 ? c.reactions : ''}</span>
                  </button>
                  <button className="flex items-center text-[#8e8e93] hover:text-white transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 transform rotate-180"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                  </button>
                  <button className="text-[12px] font-medium text-white hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors -ml-2">Balas</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
