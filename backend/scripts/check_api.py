import httpx

def check_api():
    try:
        res = httpx.get("https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/home", timeout=10.0)
        data = res.json()
        
        if data.get("success"):
            print("=== Anime Baru di Beranda (Homepage) ===")
            latest = data.get("data", {}).get("latest", [])
            for item in latest[:5]:
                print(f"- {item.get('title')} (ID: {item.get('anilistId')})")
                
            test_ids = [182255, 172463, 178788, 21] 
            
            for aid in test_ids:
                print(f"\n=== Memeriksa Anime ID: {aid} ===")
                ep_res = httpx.get(f"https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/anime/{aid}/episodes", timeout=10.0)
                ep_data = ep_res.json()
                
                if ep_data.get("success") and ep_data.get("data"):
                    eps = ep_data["data"]
                    print(f"✅ Berhasil mengekstrak {len(eps)} episode!")
                    
                    if eps:
                        ep_num = eps[0].get("episodeNumber")
                        print(f"   -> Mengecek Stream Episode {ep_num} ({eps[0].get('episodeTitle')})...")
                        
                        stream_res = httpx.get(f"https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/anime/{aid}/episodes/{ep_num}/stream", timeout=30.0)
                        stream_data = stream_res.json()
                        
                        if stream_data.get("success") and stream_data.get("sources"):
                            print(f"   🎥 Ditemukan {len(stream_data['sources'])} Direct Stream 100% Native:")
                            for s in stream_data["sources"][:3]:
                                url_short = str(s.get('url'))[:80] + '...' if s.get('url') else ''
                                print(f"      [{s.get('type')}] {s.get('quality')} ({s.get('provider')}) -> {url_short}")
                        else:
                            print("   ⏳ Direct stream sedang diekstrak di background oleh Swarm Proxy...")
                else:
                    print(f"❌ Episode masih dalam proses sinkronisasi QStash (syncing: {ep_data.get('syncing')})")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_api()
