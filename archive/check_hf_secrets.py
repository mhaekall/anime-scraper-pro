import os
import httpx

HF_TOKEN="HF_TOKEN_PLACEHOLDER"
REPO="jonyyyyyyyu/anime-scraper-api"

res = httpx.get(
    f"https://huggingface.co/api/spaces/{REPO}/secrets",
    headers={"Authorization": f"Bearer {HF_TOKEN}"}
)
print("Secrets from HF API:")
print(res.text)
