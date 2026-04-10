"use client";

import { useState, useEffect } from "react";
import { API } from "@/core/lib/api";

export default function AdminDashboard() {
  const [targetId, setTargetId] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const addLog = (msg: string) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/api/v2/admin/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (e) {
      console.error("Failed to fetch stats");
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Auto-refresh stats every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!targetId) return;
    setLoading(true);
    addLog(`Memulai ekstraksi manual untuk Anilist ID: ${targetId}...`);
    
    try {
      const res = await fetch(`${API}/api/v2/anime/${targetId}/debug-sync`);
      const data = await res.json();
      
      if (data.success) {
        addLog(`✅ Sukses: Tersinkronisasi ${data.result.synced} episode dari provider ${data.result.providers.join(", ")}`);
      } else {
        addLog(`❌ Gagal: ${data.error || JSON.stringify(data.trace)}`);
      }
    } catch (e: any) {
      addLog(`❌ Error koneksi: ${e.message}`);
    }
    
    setLoading(false);
    fetchStats();
  };

  const handleForceInject = async () => {
    setLoading(true);
    addLog(`🚀 Menjalankan Injeksi Masterpiece Custom...`);
    try {
      const res = await fetch(`${API}/api/v2/admin/add-custom-direct`, { method: "POST" });
      const data = await res.json();
      addLog(data.success ? `✅ Injeksi Masterpiece Selesai` : `❌ Gagal: ${data.error}`);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    }
    setLoading(false);
    fetchStats();
  };

  const handleMassSync = async () => {
    setLoading(true);
    addLog(`🚀 Mengirim 100 Top Trending Anime ke QStash Swarm Proxy...`);
    try {
      const res = await fetch(`${API}/api/v2/admin/mass-sync`, { method: "POST" });
      const data = await res.json();
      addLog(data.success ? `✅ Sukses: ${data.message}` : `❌ Gagal: ${data.error}`);
      addLog(`Mulai sekarang, Swarm Proxy Cloudflare + QStash akan mengekstraksi 100 judul ini di background tanpa membebani server utama!`);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-2">Pusat Komando Scraping</h1>
          <p className="text-[#8e8e93]">Pantau status sinkronisasi, antrean QStash, dan eksekusi injeksi Direct Stream.</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
            <span className="text-[#8e8e93] text-sm font-bold uppercase mb-1">Total Anime di Database</span>
            <span className="text-4xl font-black text-white">{stats?.total_anime || 0}</span>
          </div>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
            <span className="text-[#8e8e93] text-sm font-bold uppercase mb-1">Total Episode Terindeks</span>
            <span className="text-4xl font-black text-[#0a84ff]">{stats?.total_episodes || 0}</span>
          </div>
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center">
            <span className="text-[#8e8e93] text-sm font-bold uppercase mb-1">Status Serverless Queue</span>
            <span className="text-xl font-black text-[#30d158] flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#30d158] animate-pulse" /> QStash Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Injeksi Spesifik (Synchronous)</h2>
              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Anilist ID (Misal: 163146)"
                  className="bg-black border border-white/20 rounded-xl px-4 py-2 focus:outline-none focus:border-[#0a84ff]"
                />
                <button
                  onClick={handleSync}
                  disabled={loading}
                  className="w-full bg-[#0a84ff] hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl disabled:opacity-50"
                >
                  Ekstrak Instan
                </button>
              </div>
            </div>

            <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold">Operasi Skala Besar</h2>
              <button
                onClick={handleMassSync}
                disabled={loading}
                className="w-full bg-[#30d158]/20 hover:bg-[#30d158]/30 text-[#30d158] font-bold px-4 py-3 rounded-xl border border-[#30d158]/50 disabled:opacity-50 transition-colors"
              >
                ⚡ Tarik 100 Anime Trending (QStash)
              </button>
              <button
                onClick={handleForceInject}
                disabled={loading}
                className="w-full bg-white/5 hover:bg-white/10 text-[#8e8e93] font-bold px-4 py-3 rounded-xl border border-white/10 disabled:opacity-50 transition-colors"
              >
                Injeksi Ulang Anime Masterpiece
              </button>
            </div>
            
            <div className="bg-black border border-white/10 rounded-2xl p-4">
              <h2 className="text-sm font-bold mb-2 flex items-center gap-2 text-[#8e8e93]">
                Live Terminal
              </h2>
              <div className="h-48 overflow-y-auto font-mono text-[10px] text-[#30d158] space-y-1">
                {logs.map((log, i) => <div key={i} className="break-words">{log}</div>)}
              </div>
            </div>
          </div>

          {/* Database Viewer */}
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-6 lg:col-span-2 flex flex-col h-[700px]">
            <h2 className="text-xl font-bold mb-4">Log Sinkronisasi Terkini (Auto-Refresh)</h2>
            <div className="flex-1 overflow-y-auto rounded-xl border border-white/5">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/50 text-[#8e8e93] sticky top-0">
                  <tr>
                    <th className="p-3">Anilist ID</th>
                    <th className="p-3">Judul Anime</th>
                    <th className="p-3">Provider</th>
                    <th className="p-3 text-right">Total Episode</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recent?.map((anime: any) => (
                    <tr key={anime.anilistId} className="border-t border-white/5 hover:bg-white/5">
                      <td className="p-3 font-mono text-xs">{anime.anilistId}</td>
                      <td className="p-3 font-medium truncate max-w-[200px]" title={anime.title}>{anime.title}</td>
                      <td className="p-3">
                        {anime.providerId ? (
                          <span className="bg-[#0a84ff]/20 text-[#0a84ff] px-2 py-0.5 rounded-full text-xs font-bold uppercase">{anime.providerId}</span>
                        ) : (
                          <span className="bg-[#ff453a]/20 text-[#ff453a] px-2 py-0.5 rounded-full text-xs font-bold uppercase">Pending/Queue</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold">
                        {anime.episode_count > 0 ? (
                           <span className="text-[#30d158]">{anime.episode_count} Eps</span>
                        ) : (
                           <span className="text-[#ff453a] animate-pulse">0 Eps</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!stats && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-[#8e8e93]">Memuat data dari database Serverless...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
