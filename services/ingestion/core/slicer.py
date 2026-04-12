import os
import subprocess
import logging
from typing import Optional, List

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoSlicer:
    def __init__(self, output_dir: str = "/tmp/anime_ingestion/hls"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    def slice(self, input_mp4: str, segment_time: int = 10) -> Optional[str]:
        """
        Segments an MP4 file into HLS format (.ts chunks and .m3u8 playlist).
        Returns the path to the master .m3u8 playlist on success.
        """
        if not os.path.exists(input_mp4):
            logger.error(f"Input file {input_mp4} does not exist.")
            return None

        # Extract filename without extension to create a subdirectory for HLS
        base_name = os.path.splitext(os.path.basename(input_mp4))[0]
        hls_dir = os.path.join(self.output_dir, base_name)
        os.makedirs(hls_dir, exist_ok=True)

        master_playlist = os.path.join(hls_dir, "index.m3u8")
        
        # If already sliced, skip
        if os.path.exists(master_playlist):
            logger.info(f"HLS playlist {master_playlist} already exists. Skipping slicing.")
            return master_playlist

        logger.info(f"Slicing video {input_mp4} to {master_playlist}...")

        try:
            # Fast passthrough to HLS segments without re-encoding
            # This requires the input mp4 to have h264 video and aac audio.
            command = [
                "ffmpeg",
                "-y",
                "-err_detect", "ignore_err",
                "-i", input_mp4,
                "-c", "copy",
                "-f", "hls",
                "-hls_time", str(segment_time),
                "-hls_list_size", "0", # Keep all segments in the playlist
                "-hls_segment_filename", os.path.join(hls_dir, "segment_%04d.ts"),
                master_playlist
            ]
            
            result = subprocess.run(command, capture_output=True, text=True)
            
            # Ffmpeg might exit with error at the end of slightly corrupted files,
            # but if the master playlist is there, we consider it a success.
            if not os.path.exists(master_playlist) or os.path.getsize(master_playlist) == 0:
                logger.error(f"FFmpeg slicing failed to produce playlist. Error: {result.stderr}")
                return None
                
            if result.returncode != 0:
                logger.warning(f"FFmpeg returned non-zero ({result.returncode}), but playlist exists. Proceeding.")
                
            logger.info(f"Successfully sliced video to {master_playlist}")
            return master_playlist
            
        except Exception as e:
            logger.error(f"Exception during slicing: {str(e)}")
            return None

if __name__ == "__main__":
    # Test execution
    # slicer = VideoSlicer()
    # slicer.slice("/tmp/anime_ingestion/test_video.mp4")
    pass
