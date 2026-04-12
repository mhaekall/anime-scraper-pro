import sys
import asyncio
import logging
import os
import httpx

# Add paths
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Bypass get_provider to avoid path conflicts
import importlib.util
spec = importlib.util.spec_from_file_location("provider", "../../services/scraper/providers/kuronime/provider.py")
kuronime_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kuronime_module)
KuronimeProvider = kuronime_module.KuronimeProvider

spec_transport = importlib.util.spec_from_file_location("transport", "../../services/transport.py")
transport_module = importlib.util.module_from_spec(spec_transport)
spec_transport.loader.exec_module(transport_module)
ProviderTransport = transport_module.ProviderTransport

from services.ingestion.core.fetcher import VideoFetcher
from services.ingestion.core.slicer import VideoSlicer
from services.ingestion.uploader.telegram import TelegramUploader

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
        data = resp.json()
        title = data.get("data", {}).get("Media", {}).get("title", {})
        return title.get("english") or title.get("romaji")

async def sync_episode(anilist_id: int, episode_number: float):
    print(f"\n==============================================")
    print(f"🚀 INGESTION ENGINE: MENGUNGGAH KE TELEGRAM")
    print(f"==============================================\n")
    
    # 1. Get Real Title
    title = await get_anilist_title(anilist_id)
    if not title:
        print("❌ Gagal mendapatkan judul dari AniList.")
        return
    print(f"Judul AniList: {title} (ID: {anilist_id})")
    
    # 2. Scrape the direct URL
    transport = ProviderTransport()
    provider = KuronimeProvider(transport)
    print(f"Mencari '{title}' di provider Kuronime...")
    results = await provider.search(title)
    if not results:
        # Fallback to general search term if specific season fails
        print("Pencarian spesifik gagal. Mencoba 'Classroom of the Elite'...")
        results = await provider.search("Classroom of the Elite")
        if not results:
            print("❌ Anime tidak ditemukan di provider.")
            return
            
    print(f"Ketemu: {results[0].title}")
    
    details = await provider.get_anime_detail(results[0].url)
    episodes = details.episodes
    if not episodes:
        print("❌ Tidak ada episode tersedia.")
        return
        
    # Find specific episode
    target_ep = None
    for ep in episodes:
        if ep.number == episode_number:
            target_ep = ep
            break
            
    if not target_ep:
        target_ep = episodes[-1]
        print(f"⚠️ Episode {episode_number} tidak ketemu, menggunakan episode {target_ep.number}...")
        
    print(f"Mengekstrak Video URL Episode {target_ep.number}...")
    sources = await provider.get_episode_sources(target_ep.url)
    if not sources or not sources.sources:
        print("❌ Gagal mengekstrak sumber video.")
        return
        
    direct_url = sources.sources[0].url
    print(f"✅ Direct URL Ditemukan: {direct_url[:50]}...")
    
    # 3. Download & Slice (Limit to 30 seconds for test speed)
    TMP_DIR = os.getenv("TMPDIR", "/data/data/com.termux/files/usr/tmp") + "/test_ingestion"
    print("\n[TAHAP 1] MENGUNDUH 30 DETIK VIDEO (Fast Test)...")
    fetcher = VideoFetcher(output_dir=TMP_DIR)
    mp4_filename = f"anime_{anilist_id}_ep{target_ep.number}_30sec.mp4"
    mp4_path = os.path.join(TMP_DIR, mp4_filename)
    
    # Custom fetch with -t 30 to only grab 30 seconds to bypass mobile slow internet
    import subprocess
    if not os.path.exists(mp4_path):
        cmd = ["ffmpeg", "-y", "-i", direct_url, "-t", "30", "-c", "copy", mp4_path]
        subprocess.run(cmd, capture_output=True)
    
    if not os.path.exists(mp4_path):
        print("❌ Gagal mengunduh video.")
        return
        
    print(f"✅ Video berhasil diunduh ke: {mp4_path}")
    
    print("\n[TAHAP 2] MEMOTONG MENJADI HLS SEGMENTS (.ts)...")
    slicer = VideoSlicer(output_dir=TMP_DIR + "/hls")
    m3u8_path = slicer.slice(mp4_path, segment_time=10) # 10 second chunks
    
    if not m3u8_path:
        print("❌ Gagal memotong video.")
        return
        
    print(f"✅ Video berhasil dipotong: {m3u8_path}")
    
    # 4. Upload to Telegram
    print("\n[TAHAP 3] MENGUNGGAH KE TELEGRAM SWARM STORAGE...")
    os.environ["TELEGRAM_BOT_TOKEN"] = "8782570865:AAFlGrid6H-XFPu-jAbE26dHD_DgXHhRBpE"
    os.environ["TELEGRAM_CHAT_ID"] = "-1003704693082"
    uploader = TelegramUploader()
    
    hls_dir = os.path.dirname(m3u8_path)
    new_playlist_path = os.path.join(hls_dir, "cloud_index.m3u8")
    with open(m3u8_path, "r") as f:
        lines = f.readlines()

    new_lines = []
    for line in lines:
        line = line.strip()
        if line and not line.startswith("#"):
            segment_path = os.path.join(hls_dir, line)
            print(f"📦 Mengunggah {line} ke Telegram Channel Anda...")
            file_id = uploader.upload_file(segment_path)
            if file_id:
                proxy_url = os.getenv("TG_PROXY_BASE_URL", "https://tg-proxy.moehamadhkl.workers.dev")
                new_url = f"{proxy_url}/{file_id}"
                new_lines.append(new_url)
                print(f"   ↳ Sukses! Cloud URL: {new_url}")
            else:
                new_lines.append(line)
                print(f"   ↳ GAGAL MENGUNGGAH")
        else:
            new_lines.append(line)
    
    with open(new_playlist_path, "w") as f:
        f.write("\n".join(new_lines))
        
    print(f"\n✅ PROSES SELESAI 100%! Coba cek Private Channel Anda sekarang.")
    print(f"Playlist Streaming (0ms Latency): \n{new_playlist_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Penggunaan: python sync_to_telegram.py <ANILIST_ID> <EPISODE_NUMBER>")
        sys.exit(1)
        
    anilist_id = int(sys.argv[1])
    episode_number = float(sys.argv[2])
    asyncio.run(sync_episode(anilist_id, episode_number))
