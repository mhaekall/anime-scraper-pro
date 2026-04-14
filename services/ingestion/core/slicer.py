import os
import asyncio
import logging
from typing import Optional, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoSlicer:
    def __init__(self, output_dir: str = "/tmp/anime_ingestion/hls"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    async def slice(self, url: str, filename: str, provider_id: str = "", segment_time: int = 12) -> Optional[str]:
        """
        Segments a video stream directly from a URL into HLS format (.ts chunks and .m3u8 playlist).
        Returns the path to the master .m3u8 playlist on success.
        """
        base_name = os.path.splitext(filename)[0]
        hls_dir = os.path.join(self.output_dir, base_name)
        os.makedirs(hls_dir, exist_ok=True)

        master_playlist = os.path.join(hls_dir, "index.m3u8")
        
        # If already sliced, skip
        if os.path.exists(master_playlist) and os.path.getsize(master_playlist) > 0:
            logger.info(f"HLS playlist {master_playlist} already exists. Skipping slicing.")
            return master_playlist

        logger.info(f"Streaming and Slicing video from {url} to {master_playlist} with {segment_time}s segments...")

        try:
            # Set headers based on provider
            referer = f"https://{provider_id}.com" if provider_id else "https://v2.samehadaku.how/"
            if "wibufile" in url or "samehadaku" in provider_id:
                referer = "https://v2.samehadaku.how/"
            elif "mp4upload" in url:
                referer = "https://www.mp4upload.com/"
                
            headers = f"Referer: {referer}\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36\r\n"

            # Fast passthrough to HLS segments without intermediate mp4 download
            command = [
                "ffmpeg",
                "-y",
                "-headers", headers,
                "-err_detect", "ignore_err",
                "-i", url,
                "-c", "copy",
                "-bsf:a", "aac_adtstoasc",
                "-f", "hls",
                "-hls_segment_type", "mpegts",
                "-hls_time", str(segment_time),
                "-hls_list_size", "0", # Keep all segments in the playlist
                "-hls_segment_filename", os.path.join(hls_dir, "segment_%04d.ts"),
                master_playlist
            ]
            
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            # Ffmpeg might exit with error at the end of slightly corrupted files,
            # but if the master playlist is there, we consider it a success.
            if not os.path.exists(master_playlist) or os.path.getsize(master_playlist) == 0:
                logger.error(f"FFmpeg streaming slicing failed to produce playlist. Error: {stderr.decode()}")
                return None
                
            if process.returncode != 0:
                logger.warning(f"FFmpeg returned non-zero ({process.returncode}), but playlist exists. Proceeding.")

            # --- VALIDATION: Ensure no segment exceeds Telegram's 20MB getFile limit ---
            max_size_mb = 18.0 # Safety margin
            for f in os.listdir(hls_dir):
                if f.endswith('.ts'):
                    file_path = os.path.join(hls_dir, f)
                    size_mb = os.path.getsize(file_path) / (1024 * 1024)
                    if size_mb > max_size_mb:
                        logger.error(f"FATAL: Segment {f} is too large ({size_mb:.2f}MB). Exceeds Telegram 20MB limit.")
                        return None
                
            logger.info(f"Successfully streamed and sliced video to {master_playlist}")
            return master_playlist
            
        except Exception as e:
            logger.error(f"Exception during streaming slicing: {str(e)}")
            return None

if __name__ == "__main__":
    pass
