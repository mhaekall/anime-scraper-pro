import sys
import asyncio
import logging
import os
import httpx
import importlib.util

sys.path.append("../../apps/api")
sys.path.append(".")
sys.path.append("..")

from services.transport import ProviderTransport
from ingestion.core.fetcher import VideoFetcher
from ingestion.core.slicer import VideoSlicer
from ingestion.uploader.telegram import TelegramUploader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_anilist_title(anilist_id: int):
    query = """
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        title { romaji english }
      }
    }
    """
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://graphql.anilist.co", json={"query": query, "variables": {"id": anilist_id}})
        if resp.status_code != 200:
            return "Classroom of the Elite"
        data = resp.json()
        media = data.get("data", {}).get("Media")
        if not media:
            return "Classroom of the Elite"
        title = media.get("title", {})
        return title.get("english") or title.get("romaji")

async def sync_episode(anilist_id: int, episode_number: float):
    # Log everything to a file so user can read it while it runs in background
    log_file = f"/data/data/com.termux/files/usr/tmp/ingestion_full_ep{episode_number}.log"
    sys.stdout = open(log_file, "w", buffering=1)
    sys.stderr = sys.stdout

    print(f"\n==============================================")
    print(f"🚀 FULL INGESTION ENGINE: SAMEHADAKU -> WIBUFILE")
    print(f"==============================================\n")
    
    title = await get_anilist_title(anilist_id)
    print(f"Judul AniList: {title} (ID: {anilist_id})")
    
    transport = ProviderTransport()
    
    # Initialize Samehadaku Provider
    try:
        from providers.samehadaku.provider import SamehadakuProvider
    except ImportError:
        print("Gagal mengimpor SamehadakuProvider")
        return
        
    provider = SamehadakuProvider(transport)
    
    print(f"\nMencari '{title}' di Samehadaku...")
    try:
        results = await provider.search(title)
        if not results:
            print("Pencarian spesifik gagal. Mencoba 'Classroom of the Elite Season 4'...")
            results = await provider.search("Classroom of the Elite Season 4")
            if not results:
                print("❌ Anime tidak ditemukan di Samehadaku.")
                return
                
        first_result = results[0]
        res_title = first_result.get("title") if isinstance(first_result, dict) else first_result.title
        res_url = first_result.get("url") if isinstance(first_result, dict) else first_result.url
        print(f"Ketemu: {res_title}")
        
        details = await provider.get_anime_detail(res_url)
        episodes = details.episodes if not isinstance(details, dict) else details.get("episodes", [])
        
        if not episodes:
            print("❌ Tidak ada episode tersedia.")
            return
            
        target_ep = None
        for ep in episodes:
            ep_num = ep.get("number") if isinstance(ep, dict) else ep.number
            if ep_num == episode_number:
                target_ep = ep
                break
                
        if not target_ep:
            target_ep = episodes[-1]
            t_num = target_ep.get("number") if isinstance(target_ep, dict) else target_ep.number
            print(f"⚠️ Episode {episode_number} tidak ketemu, menggunakan episode {t_num}...")
            
        t_num = target_ep.get("number") if isinstance(target_ep, dict) else target_ep.number
        t_url = target_ep.get("url") if isinstance(target_ep, dict) else target_ep.url
        print(f"Mengekstrak Video URL Episode {t_num}...")
        
        sources = await provider.get_episode_sources(t_url)
        if not sources:
            print("❌ Gagal mengekstrak sumber video.")
            return
            
        src_list = sources if isinstance(sources, list) else sources.get("sources", []) if isinstance(sources, dict) else getattr(sources, "sources", [])
        
        from utils.extractor import UniversalExtractor
        extractor = UniversalExtractor()
        
        direct_url = None
        
        # 1. Prio: Cari Wibufile
        for src in src_list:
            u = src.get("url") if isinstance(src, dict) else src.url
            t = src.get("type") if isinstance(src, dict) else src.type
            p = src.get("provider", "").lower() if isinstance(src, dict) else src.provider.lower()
            
            if "wibufile" in p or "wibufile" in u.lower():
                print(f"Mengekstrak Wibufile: {u}")
                if u.endswith(".mp4") or u.endswith(".m3u8"):
                    direct_url = u
                    print(f"   ↳ Wibufile Direct MP4 ditemukan: {direct_url[:80]}...")
                    break
                try:
                    raw_url = await extractor.extract_raw_video(u)
                    if raw_url and raw_url != u and raw_url.startswith("http"):
                        direct_url = raw_url
                        print(f"   ↳ Wibufile Raw MP4 ditemukan: {direct_url[:80]}...")
                        break
                except Exception as e:
                    print(f"   ↳ Gagal ekstrak Wibufile: {e}")
                    
        # 2. Fallback ke Iframe lain jika wibufile gagal/tidak ada
        if not direct_url:
            for src in src_list:
                u = src.get("url") if isinstance(src, dict) else src.url
                t = src.get("type") if isinstance(src, dict) else src.type
                if t == "iframe" and "wibufile" not in u.lower():
                    print(f"Mencoba Iframe lain: {u[:50]}...")
                    try:
                        raw_url = await extractor.extract_raw_video(u)
                        if raw_url and raw_url != u and raw_url.startswith("http"):
                            direct_url = raw_url
                            print(f"   ↳ Berhasil ekstrak raw url: {direct_url[:80]}...")
                            break
                    except Exception:
                        pass
        
        if not direct_url:
            print("❌ Semua sumber video gagal diekstrak.")
            return
            
        print(f"\n✅ FULL EPISODE DIRECT URL SIAP DIUNDUH: {direct_url[:100]}...\n")
        
        TMP_DIR = os.getenv("TMPDIR", "/data/data/com.termux/files/usr/tmp") + "/test_ingestion"
        os.makedirs(TMP_DIR, exist_ok=True)
        print("[TAHAP 1] MENGUNDUH EPISODE PENUH (HARAP SABAR)...")
        
        mp4_filename = f"anime_{anilist_id}_ep{t_num}_full_samehadaku.mp4"
        mp4_path = os.path.join(TMP_DIR, mp4_filename)
        
        import subprocess
        # HAPUS LIMITASI -t 15 UNTUK MENGUNDUH FULL EPISODE
        print(f"Mengeksekusi ffmpeg untuk mendownload MP4 secara utuh...")
        cmd = [
            "ffmpeg", "-y", 
            "-headers", "Referer: https://v2.samehadaku.how/\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n", 
            "-i", direct_url, 
            "-c", "copy", 
            mp4_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        
        if not os.path.exists(mp4_path) or os.path.getsize(mp4_path) < 1000:
            print(f"❌ ffmpeg download error: {res.stderr}")
            return
            
        file_size_mb = os.path.getsize(mp4_path) / (1024 * 1024)
        print(f"✅ Download MP4 berhasil! Ukuran file: {file_size_mb:.2f} MB")
        
        print("\n[TAHAP 2] MEMOTONG MENJADI RATUSAN HLS SEGMENTS (.ts)...")
        slicer = VideoSlicer(output_dir=TMP_DIR + "/hls")
        m3u8_path = await slicer.slice(mp4_path, segment_time=2) # 2s segments for near-0ms perceived latency
        
        if not m3u8_path:
            print("❌ Gagal memotong video.")
            return
            
        print(f"✅ Video berhasil dipotong: {m3u8_path}")
        
        print("\n[TAHAP 3] MENGUNGGAH SELURUH SEGMEN KE TELEGRAM SWARM (PARALLEL UPLOAD)...")
        import time
        start_time = time.time()
        
        os.environ["TELEGRAM_BOT_TOKEN"] = "8782570865:AAFlGrid6H-XFPu-jAbE26dHD_DgXHhRBpE"
        os.environ["TELEGRAM_CHAT_ID"] = "-1003704693082"
        uploader = TelegramUploader()
        
        # Tingkatkan max_workers ke 10 agar upload ratusan segmen lebih cepat
        new_playlist_path = await uploader.process_hls_playlist_parallel(m3u8_path, max_workers=10)
        
        if new_playlist_path:
            duration = time.time() - start_time
            print(f"\n✅ PROSES FULL PARALLEL UPLOAD SELESAI DALAM {duration:.2f} DETIK!")
            print(f"Playlist Streaming (0ms Latency):")
            print(f"   => {new_playlist_path}")
            
            # Print the new master playlist URL to a separate file so user can easily get it
            with open(f"/data/data/com.termux/files/usr/tmp/final_hls_ep{episode_number}.txt", "w") as f:
                f.write(new_playlist_path)
        else:
            print("❌ UPLOAD PARALLEL GAGAL")
            
    except Exception as e:
        print(f"❌ Kesalahan Sistem: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Penggunaan: python test_ingest.py <ANILIST_ID> <EPISODE_NUMBER>")
        sys.exit(1)
        
    anilist_id = int(sys.argv[1])
    episode_number = float(sys.argv[2])
    asyncio.run(sync_episode(anilist_id, episode_number))
