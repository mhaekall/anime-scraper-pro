import httpx
import sys

def check():
    for aid in [172463, 178788, 21, 163146, 166873]:
        try:
            res = httpx.get(f"https://jonyyyyyyyu-anime-scraper-api.hf.space/api/v2/anime/{aid}/episodes", timeout=10.0)
            data = res.json()
            success = data.get("success")
            eps = data.get("data", [])
            print(f"ID {aid}: Success={success}, Episodes={len(eps)}, Syncing={data.get('syncing')}")
        except Exception as e:
            print(f"Error {aid}: {e}")

if __name__ == "__main__":
    check()
