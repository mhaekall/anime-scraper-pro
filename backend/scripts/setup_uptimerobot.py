import os
import urllib.request
import urllib.error
import json

# UptimeRobot API Key (Get it from your UptimeRobot Dashboard > My Settings)
API_KEY = os.getenv("UPTIMEROBOT_API_KEY", "your_uptimerobot_api_key_here")

# Hugging Face Space URL
SPACE_URL = os.getenv("SPACE_URL", "https://jonyyyyyyyu-anime-scraper-api.hf.space/healthz")
MONITOR_NAME = "Anime Scraper Pro - HF Space"

def create_uptimerobot_monitor():
    """
    Creates an HTTP monitor on UptimeRobot to ping the Hugging Face space every 5 minutes.
    This prevents the space from going to sleep.
    """
    url = "https://api.uptimerobot.com/v2/newMonitor"

    payload_dict = {
        "api_key": API_KEY,
        "format": "json",
        "type": 1,  # 1 = HTTP(s)
        "url": SPACE_URL,
        "friendly_name": MONITOR_NAME,
        "interval": 300,  # 5 minutes (300 seconds)
    }
    
    # URL encode payload
    data = urllib.parse.urlencode(payload_dict).encode('utf-8')

    headers = {
        "cache-control": "no-cache",
        "content-type": "application/x-www-form-urlencoded"
    }
    
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")

    print(f"Creating UptimeRobot monitor for: {SPACE_URL}")
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            res_data = json.loads(res_body)
            
            if res_data.get("stat") == "ok":
                print(f"✅ Monitor successfully created! ID: {res_data['monitor']['id']}")
            else:
                print(f"❌ Failed to create monitor: {res_data.get('error', {}).get('message', 'Unknown error')}")
                
    except urllib.error.HTTPError as e:
        print(f"❌ API Request failed with status code: {e.code}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    import urllib.parse
    if API_KEY == "your_uptimerobot_api_key_here":
        print("⚠️ Warning: UPTIMEROBOT_API_KEY is not set.")
        print("Please set the environment variable or replace the placeholder in the script.")
    create_uptimerobot_monitor()
