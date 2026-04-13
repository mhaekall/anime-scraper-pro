import os
import asyncio
import httpx
import logging
import random
from typing import Optional, Dict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# To use Telegram as a $0 cost unlimited object storage:
# 1. Create a Bot via BotFather and get BOT_TOKEN.
# 2. Get a CHAT_ID (can be a private channel or group) where the bot is admin.
# 3. Upload documents using sendDocument API endpoint.
# 4. Extract 'file_id' from the response.
# 5. The Cloudflare Worker proxy will stream the file by its 'file_id' via the getFile API.

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")
# Proxy endpoint configured on Cloudflare worker that serves file_id directly
PROXY_BASE_URL = os.getenv("TG_PROXY_BASE_URL", "https://tg-proxy.workers.dev")

class TelegramUploader:
    def __init__(self):
        self.bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")
        if not self.bot_token or not self.chat_id:
            logger.warning("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set. Uploader will fail.")

    async def upload_file(self, file_path: str, max_retries: int = 3) -> Optional[str]:
        """
        Uploads a single file to Telegram with retries and exponential backoff.
        """
        file_size = os.path.getsize(file_path)
        endpoint = "sendVideo" if file_size > 10_000_000 else "sendDocument"
        url = f"https://api.telegram.org/bot{self.bot_token}/{endpoint}"
        
        logger.info(f"Uploading {file_path} to Telegram (using {endpoint})...")
        
        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    with open(file_path, "rb") as f:
                        file_key = "video" if endpoint == "sendVideo" else "document"
                        files = {file_key: (os.path.basename(file_path), f)}
                        data = {"chat_id": self.chat_id}
                        
                        response = await client.post(url, data=data, files=files)
                        
                        if response.status_code == 200:
                            resp_json = response.json()
                            if "document" in resp_json.get("result", {}):
                                return resp_json["result"]["document"]["file_id"]
                            elif "video" in resp_json.get("result", {}):
                                return resp_json["result"]["video"]["file_id"]
                        elif response.status_code == 429:
                            # Too Many Requests
                            retry_after = response.json().get("parameters", {}).get("retry_after", 2 ** attempt)
                            wait = retry_after + random.uniform(0, 1)
                            logger.warning(f"Rate limited (429) for {file_path}, waiting {wait:.1f}s")
                            await asyncio.sleep(wait)
                            continue
                        else:
                            logger.error(f"Failed to upload {file_path}. HTTP {response.status_code}: {response.text}")
            except Exception as e:
                logger.error(f"Exception during Telegram upload (attempt {attempt+1}): {str(e)}")
            
            wait = 2 ** attempt + random.uniform(0, 1)
            logger.warning(f"Upload retry {attempt+1} for {file_path}, waiting {wait:.1f}s")
            await asyncio.sleep(wait)

        return None

    async def process_hls_playlist_parallel(self, m3u8_path: str, max_workers: int = 5) -> Optional[str]:
        """
        Reads a local .m3u8 playlist, uploads each .ts segment to Telegram IN PARALLEL using asyncio.Semaphore,
        and creates a new 'cloud' playlist where segments point to proxy URLs.
        Returns the path to the new .m3u8 playlist.
        """
        if not os.path.exists(m3u8_path):
            logger.error(f"Playlist {m3u8_path} not found.")
            return None

        hls_dir = os.path.dirname(m3u8_path)
        new_playlist_path = os.path.join(hls_dir, "cloud_index.m3u8")
        
        with open(m3u8_path, "r") as f:
            lines = f.readlines()

        segment_lines = [(i, line.strip()) for i, line in enumerate(lines) if line.strip() and not line.startswith("#")]
        
        uploaded_segments: Dict[int, str] = {}
        semaphore = asyncio.Semaphore(max_workers)

        async def _upload_task(index: int, line: str):
            segment_path = os.path.join(hls_dir, line)
            if not os.path.exists(segment_path):
                logger.error(f"Segment missing locally: {segment_path}")
                return index, None
            
            async with semaphore:
                file_id = await self.upload_file(segment_path)
                return index, file_id

        logger.info(f"Starting parallel upload of {len(segment_lines)} segments with {max_workers} workers...")
        
        tasks = [_upload_task(idx, line) for idx, line in segment_lines]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, tuple) and len(result) == 2:
                idx, file_id = result
                if file_id:
                    uploaded_segments[idx] = file_id
                else:
                    logger.error(f"Failed to upload segment at line {idx}")
            else:
                logger.error(f"Segment generated an exception: {result}")

        if len(uploaded_segments) < len(segment_lines):
            logger.error("Not all segments were uploaded successfully. Aborting playlist generation.")
            return None

        new_lines = []
        for i, line in enumerate(lines):
            line = line.strip()
            if line and not line.startswith("#"):
                file_id = uploaded_segments.get(i)
                if file_id:
                    new_url = f"{PROXY_BASE_URL}/{file_id}"
                    new_lines.append(new_url)
                else:
                    new_lines.append(line)
            else:
                new_lines.append(line)

        with open(new_playlist_path, "w") as f:
            f.write("\n".join(new_lines))
        
        logger.info(f"Successfully processed playlist to cloud: {new_playlist_path}")
        return new_playlist_path
