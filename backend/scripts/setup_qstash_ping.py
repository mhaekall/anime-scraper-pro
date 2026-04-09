#!/usr/bin/env python3
"""
setup_qstash_ping.py

Registers a 4-minute cron job on Upstash QStash to hit the /healthz endpoint.
This keeps the Neon Serverless Postgres connection warm and prevents the Hugging Face Space from sleeping deeply.
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

QSTASH_URL = "https://qstash.upstash.io/v2/schedules"
QSTASH_TOKEN = os.getenv("UPSTASH_QSTASH_TOKEN")

# Replace this with your actual Hugging Face API URL
API_URL = "https://jonyyyyyyyu-anime-scraper-api.hf.space/healthz"

def setup_cron():
    if not QSTASH_TOKEN:
        print("Error: UPSTASH_QSTASH_TOKEN environment variable is not set.")
        return

    headers = {
        "Authorization": f"Bearer {QSTASH_TOKEN}",
        "Content-Type": "application/json",
        "Upstash-Cron": "*/4 * * * *",  # Every 4 minutes
        "Upstash-Method": "GET",
    }

    try:
        response = requests.post(
            f"{QSTASH_URL}/{API_URL}",
            headers=headers
        )
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"Success! Cron job registered.")
            print(f"Schedule ID: {data.get('scheduleId')}")
        else:
            print(f"Failed to register cron job. Status: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error making request to QStash: {e}")

if __name__ == "__main__":
    setup_cron()
