import httpx
import json
import time

BASE_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space"

def test_endpoint(name, path):
    url = f"{BASE_URL}{path}"
    print(f"🔍 Mengetes {name}...")
    try:
        response = httpx.post(url)
        status = response.status_code
        print(f"📡 URL: {url}")
        print(f"📡 Status Code: {status}")
        
        if status == 404:
            print(f"❌ ERROR: Rute {path} benar-benar TIDAK DITEMUKAN (404).")
        elif status == 500:
            print(f"✅ TERDETEKSI: Rute {path} ADA, tapi error karena kita tidak mengirim data QStash yang sah (Ini Normal).")
        elif status == 400 or status == 401:
            print(f"✅ TERDETEKSI: Rute {path} ADA dan sistem keamanan (Security Guard) aktif.")
        else:
            print(f"❓ Info: Respons lain ({status})")
    except Exception as e:
        print(f"🚨 Error Koneksi: {e}")

if __name__ == "__main__":
    print("⏳ Menjalankan Verifikasi Akhir Stack Backend...")
    test_endpoint("Endpoint Prefetch", "/api/v2/webhook/prefetch")
    print("-" * 30)
    test_endpoint("Endpoint Ingestion Workflow", "/api/v2/webhook/ingest-workflow")
