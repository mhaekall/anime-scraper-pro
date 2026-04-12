import os
import sys
import logging
import asyncio
from typing import Optional

# Add the root directory to Python path if running independently
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.fetcher import VideoFetcher
from core.slicer import VideoSlicer
from uploader.telegram import TelegramUploader
from apps.api.db.connection import database
from apps.api.db.models import episodes
from sqlalchemy import update

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IngestionEngine:
    def __init__(self):
        self.fetcher = VideoFetcher()
        self.slicer = VideoSlicer()
        self.uploader = TelegramUploader()

    async def process_episode(self, episode_id: int, anilist_id: int, provider_id: str, episode_number: float, direct_video_url: str):
        """
        Full pipeline to ingest a video from a provider, slice it, upload to Telegram, and update DB.
        """
        logger.info(f"Starting ingestion for Anime: {anilist_id} | Ep: {episode_number} | Provider: {provider_id}")
        
        # 1. Fetch (Synchronous)
        filename = f"{provider_id}_{anilist_id}_{episode_number}.mp4"
        mp4_path = self.fetcher.fetch(direct_video_url, filename)
        if not mp4_path:
            logger.error("Failed to fetch video.")
            return False

        # 2. Slice (Synchronous)
        m3u8_path = self.slicer.slice(mp4_path)
        if not m3u8_path:
            logger.error("Failed to slice video.")
            return False

        # 3. Upload to Telegram (Synchronous)
        cloud_m3u8_path = self.uploader.process_hls_playlist(m3u8_path)
        if not cloud_m3u8_path:
            logger.error("Failed to upload segments to Telegram.")
            return False
            
        # 4. Upload the master playlist itself to Telegram or use it directly
        playlist_file_id = self.uploader.upload_file(cloud_m3u8_path)
        if not playlist_file_id:
            logger.error("Failed to upload master playlist to Telegram.")
            return False
            
        # 5. Database Sync (Asynchronous)
        final_stream_url = f"{os.getenv('TG_PROXY_BASE_URL', 'https://tg-proxy.workers.dev')}/{playlist_file_id}"
        
        try:
            should_disconnect = False
            if not database.is_connected:
                await database.connect()
                should_disconnect = True
                
            stmt = (
                update(episodes)
                .where(episodes.c.id == episode_id)
                .values(episodeUrl=final_stream_url)
            )
            await database.execute(stmt)
            logger.info(f"Successfully updated DB for episode ID {episode_id} with new stream URL: {final_stream_url}")
            return True
        except Exception as e:
            logger.error(f"Database update failed: {e}")
            return False
        finally:
            if should_disconnect:
                await database.disconnect()

if __name__ == "__main__":
    # Test execution
    # engine = IngestionEngine()
    # asyncio.run(engine.process_episode(1, 11061, "otakudesu", 1.0, "https://example.com/direct_video.mp4"))
    pass
