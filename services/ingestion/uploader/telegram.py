import os
import requests
import logging
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

    def upload_file(self, file_path: str) -> Optional[str]:
        """
        Uploads a single file to Telegram and returns its file_id.
        """
        url = f"https://api.telegram.org/bot{self.bot_token}/sendDocument"
        
        logger.info(f"Uploading {file_path} to Telegram...")
        try:
            with open(file_path, "rb") as f:
                files = {"document": f}
                data = {"chat_id": self.chat_id}
                
                response = requests.post(url, data=data, files=files)
                
                if response.status_code == 200:
                    resp_json = response.json()
                    # Extract file_id from document
                    if "document" in resp_json.get("result", {}):
                        file_id = resp_json["result"]["document"]["file_id"]
                        return file_id
                    elif "video" in resp_json.get("result", {}):
                        file_id = resp_json["result"]["video"]["file_id"]
                        return file_id
                else:
                    logger.error(f"Failed to upload {file_path}. HTTP {response.status_code}: {response.text}")
                    return None
        except Exception as e:
            logger.error(f"Exception during Telegram upload: {str(e)}")
            return None

    def process_hls_playlist(self, m3u8_path: str) -> Optional[str]:
        """
        Reads a local .m3u8 playlist, uploads each .ts segment to Telegram,
        and creates a new 'cloud' playlist where segments point to proxy URLs.
        Returns the path to the new .m3u8 playlist.
        """
        if not os.path.exists(m3u8_path):
            logger.error(f"Playlist {m3u8_path} not found.")
            return None

        hls_dir = os.path.dirname(m3u8_path)
        new_playlist_path = os.path.join(hls_dir, "cloud_index.m3u8")
        
        # We process line by line
        with open(m3u8_path, "r") as f:
            lines = f.readlines()

        new_lines = []
        uploaded_segments: Dict[str, str] = {} # keep track of already uploaded files

        for line in lines:
            line = line.strip()
            # If it's a segment file (.ts)
            if line and not line.startswith("#"):
                segment_path = os.path.join(hls_dir, line)
                if os.path.exists(segment_path):
                    # Check cache to avoid re-uploading on retry
                    if line not in uploaded_segments:
                        file_id = self.upload_file(segment_path)
                        if file_id:
                            uploaded_segments[line] = file_id
                        else:
                            logger.error(f"Aborting upload process due to failure on {segment_path}")
                            return None
                    
                    # Create the new URL
                    file_id = uploaded_segments[line]
                    new_url = f"{PROXY_BASE_URL}/{file_id}"
                    new_lines.append(new_url)
                else:
                    logger.error(f"Segment missing locally: {segment_path}")
                    return None
            else:
                new_lines.append(line)

        # Write the new playlist
        with open(new_playlist_path, "w") as f:
            f.write("\n".join(new_lines))
        
        logger.info(f"Successfully processed playlist to cloud: {new_playlist_path}")
        return new_playlist_path

    def process_hls_playlist_parallel(self, m3u8_path: str, max_workers: int = 10) -> Optional[str]:
        """
        Reads a local .m3u8 playlist, uploads each .ts segment to Telegram IN PARALLEL,
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

        # Extract only the .ts segment paths
        segment_lines = [(i, line.strip()) for i, line in enumerate(lines) if line.strip() and not line.startswith("#")]
        
        uploaded_segments: Dict[int, str] = {}
        
        import concurrent.futures

        def _upload_task(index: int, line: str):
            segment_path = os.path.join(hls_dir, line)
            if not os.path.exists(segment_path):
                logger.error(f"Segment missing locally: {segment_path}")
                return index, None
            file_id = self.upload_file(segment_path)
            return index, file_id

        # Upload in parallel
        logger.info(f"Starting parallel upload of {len(segment_lines)} segments with {max_workers} workers...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_index = {executor.submit(_upload_task, idx, line): (idx, line) for idx, line in segment_lines}
            for future in concurrent.futures.as_completed(future_to_index):
                idx, line = future_to_index[future]
                try:
                    file_id = future.result()
                    if file_id[1]:
                        uploaded_segments[idx] = file_id[1]
                    else:
                        logger.error(f"Failed to upload segment at line {idx}")
                except Exception as exc:
                    logger.error(f"Segment {line} generated an exception: {exc}")

        # If any failed, we probably shouldn't generate an incomplete playlist (or we can just skip failed ones? No, better to have a full one)
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
                    new_lines.append(line) # Fallback to original
            else:
                new_lines.append(line)

        with open(new_playlist_path, "w") as f:
            f.write("\n".join(new_lines))
        
        logger.info(f"Successfully processed playlist to cloud: {new_playlist_path}")
        return new_playlist_path

if __name__ == "__main__":
    # Test execution
    # uploader = TelegramUploader()
    # uploader.process_hls_playlist("/tmp/anime_ingestion/hls/test_video/index.m3u8")
    pass
