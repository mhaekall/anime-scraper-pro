"use client";

import { useState, useEffect, useMemo } from "react";
import { API } from "@/core/lib/api";

interface AnimeRow {
  anilistId: number;
  title: string;
  genres: string[] | string | null;
  status: string;
  year: number;
  cover: string;
  episode_count: number;
  providerId: string | null;
}

export default function AdminDashboard() {
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState("");
  const [targetId, setTargetId] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  // Database explorer states
  const [dbData, setDbData] = useState<AnimeRow[]>([]);
  const [filterGenre, setFilterGenre] = useState<string>("All");
  const [filterEps, setFilterEps] = useState<string>("All");
  const [search, setSearch] = useState("");

  const addLog = (msg: string) => setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));

  const fetchData = async () => {
    try {
      // 1. Fetch quick stats
      const resStats = await fetch(`${API}/api/v2/admin/stats`);
      const dataStats = await resStats.json();
      if (dataStats.success) setStats(dataStats);

      // 2. Fetch full database
      const resDb = await fetch(`${API}/api/v2/admin/database`);
      const dataDb = await resDb.json();
      if (dataDb.success) setDbData(dataDb.data);
      
    } catch (e) {
      console.error("Failed to fetch data");
    }
  };

  useEffect(() => {
    if (auth) fetchData();
  }, [auth]);

  const handleSync = async (idToSync: string) => {
    if (!idToSync) return;
    setLoading(true);
    addLog(`🔍 Mengekstrak ID Anilist: ${idToSync}...`);
    
    try {
      const res = await fetch(`${API}/api/v2/anime/${idToSync}/debug-sync`);
      const data = await res.json();
      if (data.success) {
        addLog(`✅ Sukses [ID ${idToSync}]: ${data.result.synced} episode dari ${data.result.providers.join(", ")}`);
      } else {
        addLog(`❌ Gagal [ID ${idToSync}]: ${data.error || "Unknown Error"}`);
      }
    } catch (e: any) {
      addLog(`❌ Error koneksi: ${e.message}`);
    }
    
    setLoading(false);
    fetchData();
  };

  const handleMassSync = async () => {
    setLoading(true);
    addLog(`🚀 Mengirim 100 Anime Terbaru dari Samehadaku ke Serverless Queue...`);
    try {
      const res = await fetch(`${API}/api/v2/admin/mass-sync`, { method: "POST" });
      const data = await res.json();
      addLog(data.success ? `✅ Sukses: ${data.message}` : `❌ Gagal: ${data.error}`);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    }
    setLoading(false);
  };

  const handleSyncMissing = async () => {
    setLoading(true);
    addLog(`🔎 Mencari dan memasukkan semua anime "0 Episode" ke antrean prioritas...`);
    try {
      const res = await fetch(`${API}/api/v2/admin/sync-missing`, { method: "POST" });
      const data = await res.json();
      addLog(data.success ? `✅ ${data.message}` : `❌ Gagal: ${data.error}`);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    }
    setLoading(false);
    fetchData();
  };

  // Derived Data for Filters
  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    dbData.forEach(item => {
      if (Array.isArray(item.genres)) {
        item.genres.forEach(g => genres.add(g));
      }
    });
    return Array.from(genres).sort();
  }, [dbData]);

  const filteredData = useMemo(() => {
    return dbData.filter(item => {
      // Search
      const matchSearch = item.title?.toLowerCase().includes(search.toLowerCase()) || String(item.anilistId).includes(search);
      // Genre
      let matchGenre = true;
      if (filterGenre !== "All") {
        matchGenre = Array.isArray(item.genres) ? item.genres.includes(filterGenre) : false;
      }
      // Eps
      let matchEps = true;
      if (filterEps === "Zero") matchEps = item.episode_count === 0;
      if (filterEps === "HasEps") matchEps = item.episode_count > 0;

      return matchSearch && matchGenre && matchEps;
    });
  }, [dbData, search, filterGenre, filterEps]);

  if (!auth) {
    return (
      <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center font-sans">
        <div className="bg-[#1c1c1e] p-8 rounded-2xl border border-white/10 w-full max-w-sm">
          <h1 className="text-2xl font-black text-white mb-4">Admin Access</h1>
          <form onSubmit={(e) => { e.preventDefault(); if (password === 'admin123') setAuth(true); else alert('Wrong password'); }}>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password..." 
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white mb-4 focus:outline-none focus:border-[#0a84ff]"
            />
            <button type="submit" className="w-full bg-[#0a84ff] text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition-colors">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black mb-2 tracking-tight">Kuronime Database Explorer</h1>
            <p className="text-[#8e8e93] text-sm">Sistem eksploitasi data (Data-Driven Dashboard) dengan Direct Stream Resolver.</p>
          </div>
          <div className="flex gap-4">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-[#8e8e93] tracking-widest">Total Anime</p>
              <p className="text-3xl font-black text-white">{stats?.total_anime || 0}</p>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-[#8e8e93] tracking-widest">Total Eps</p>
              <p className="text-3xl font-black text-[#0a84ff]">{stats?.total_episodes || 0}</p>
            </div>
          </div>
        </div>

        {/* Action Panel & Terminal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#8e8e93] uppercase tracking-widest flex items-center gap-2">
              ⚡ Action Center
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleMassSync} disabled={loading} className="bg-[#30d158]/20 hover:bg-[#30d158]/30 text-[#30d158] font-bold p-3 rounded-xl border border-[#30d158]/50 disabled:opacity-50 transition-all text-xs">
                1. Tarik Katalog 100 Anime Baru (Background)
              </button>
              <button onClick={handleSyncMissing} disabled={loading} className="bg-[#ff453a]/20 hover:bg-[#ff453a]/30 text-[#ff453a] font-bold p-3 rounded-xl border border-[#ff453a]/50 disabled:opacity-50 transition-all text-xs">
                2. Selesaikan yang 0 Episode (Re-Queue)
              </button>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder="Target ID Spesifik (Cth: 182205)"
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#0a84ff]"
              />
              <button onClick={() => handleSync(targetId)} disabled={loading || !targetId} className="bg-[#0a84ff] hover:bg-blue-600 text-white font-bold px-6 py-2 rounded-xl disabled:opacity-50 text-sm">
                Ekstrak Paksa (Sync)
              </button>
            </div>
          </div>
          
          {/* Terminal */}
          <div className="bg-black border border-white/10 rounded-2xl p-5 h-[200px] flex flex-col">
            <h2 className="text-sm font-bold text-[#8e8e93] uppercase tracking-widest mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#30d158] animate-pulse" /> Live Terminal Logs
            </h2>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-[#30d158] space-y-1">
              {logs.length === 0 ? <span className="text-white/30">Menunggu komandan...</span> : logs.map((log, i) => <div key={i}>{log}</div>)}
            </div>
          </div>
        </div>

        {/* Database Explorer Grid */}
        <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl flex flex-col h-[700px]">
          
          {/* Filter Bar */}
          <div className="p-4 border-b border-white/10 bg-white/5 flex flex-wrap gap-4 items-center rounded-t-2xl">
            <div className="flex-1 min-w-[200px]">
              <input 
                type="text" 
                placeholder="Cari judul anime atau ID..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-[#0a84ff]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8e8e93] font-bold uppercase">Genre:</span>
              <select value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="All">Semua Genre</option>
                {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#8e8e93] font-bold uppercase">Filter Eps:</span>
              <select value={filterEps} onChange={(e) => setFilterEps(e.target.value)} className="bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="All">Semua Anime</option>
                <option value="Zero">0 Episode (Kosong)</option>
                <option value="HasEps">Ada Episode</option>
              </select>
            </div>
            
            <div className="text-xs text-[#8e8e93] font-bold">
              Menampilkan {filteredData.length} Data
            </div>
          </div>

          {/* Table Data */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-black/80 text-[#8e8e93] sticky top-0 z-10 backdrop-blur-xl">
                <tr>
                  <th className="p-3 border-b border-white/10 font-bold uppercase text-[10px] tracking-widest">Cover</th>
                  <th className="p-3 border-b border-white/10 font-bold uppercase text-[10px] tracking-widest w-[40%]">Anime</th>
                  <th className="p-3 border-b border-white/10 font-bold uppercase text-[10px] tracking-widest">Status / Thn</th>
                  <th className="p-3 border-b border-white/10 font-bold uppercase text-[10px] tracking-widest">Episodes</th>
                  <th className="p-3 border-b border-white/10 font-bold uppercase text-[10px] tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredData.map((item) => (
                  <tr key={item.anilistId} className="hover:bg-white/5 transition-colors group">
                    <td className="p-3">
                      <div className="w-10 h-14 rounded overflow-hidden bg-black border border-white/10">
                        {item.cover && <img src={item.cover} alt="" className="w-full h-full object-cover" />}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white mb-1 line-clamp-1" title={item.title}>{item.title}</div>
                      <div className="flex items-center gap-2">
                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-[9px] font-mono text-[#8e8e93]">ID: {item.anilistId}</span>
                        {item.providerId && <span className="bg-[#0a84ff]/20 text-[#0a84ff] px-1.5 py-0.5 rounded text-[9px] uppercase font-bold">{item.providerId}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {Array.isArray(item.genres) && item.genres.slice(0, 3).map(g => (
                          <span key={g} className="text-[9px] text-[#8e8e93] border border-white/10 px-1 rounded">{g}</span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'RELEASING' ? 'bg-[#30d158]/20 text-[#30d158]' : 'bg-white/10 text-[#8e8e93]'}`}>
                        {item.status}
                      </span>
                      <div className="text-xs text-[#8e8e93] mt-1">{item.year}</div>
                    </td>
                    <td className="p-3">
                      {item.episode_count > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-[#30d158]">{item.episode_count}</span>
                          <span className="text-[10px] text-[#8e8e93] uppercase">Eps</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-[#ff453a]">{item.episode_count}</span>
                          <span className="text-[10px] text-[#ff453a] uppercase animate-pulse">Missing</span>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => handleSync(String(item.anilistId))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-1.5 bg-white text-black text-[10px] font-bold rounded-lg hover:scale-105"
                      >
                        Force Scrape
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[#8e8e93]">Tidak ada data anime.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}