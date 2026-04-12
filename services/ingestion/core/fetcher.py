import os
import subprocess
import logging
from typing import Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoFetcher:
    def __init__(self, output_dir: str = "/tmp/anime_ingestion"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def fetch(self, url: str, output_filename: str, provider_id: str = "") -> Optional[str]:
        """
        Fetches a video from a direct URL (m3u8 or mp4) and saves it locally as an MP4.
        Uses ffmpeg for robust handling of streams.
        """
        output_path = os.path.join(self.output_dir, output_filename)
        logger.info(f"Fetching video from {url} to {output_path}...")

        # If the file already exists, we skip to save bandwidth and time
        if os.path.exists(output_path):
            logger.info(f"File {output_path} already exists. Skipping fetch.")
            return output_path

        try:
            # We use ffmpeg to download.
            referer = f"https://{provider_id}.com" if provider_id else "https://v2.samehadaku.how/"
            if "wibufile" in url or "samehadaku" in provider_id:
                referer = "https://v2.samehadaku.how/"
            elif "mp4upload" in url:
                referer = "https://www.mp4upload.com/"
                
            headers = f"Referer: {referer}\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n"
            
            command = [
                "ffmpeg",
                "-y", # Overwrite output files without asking
                "-headers", headers,
                "-i", url,
                "-c", "copy", # Copy codec without re-encoding
                "-bsf:a", "aac_adtstoasc", # Fix AAC bitstream for mpegts to mp4 if needed
                output_path
            ]
            
            result = subprocess.run(command, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.error(f"FFmpeg failed with error: {result.stderr}")
                return None
                
            logger.info(f"Successfully fetched video to {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"Exception during fetching: {str(e)}")
            return None

if __name__ == "__main__":
    # Test execution
    # fetcher = VideoFetcher()
    # fetcher.fetch("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", "test_video.mp4")
    pass
