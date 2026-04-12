import logging
from db.connection import database

logger = logging.getLogger(__name__)

async def cleanup_expired_cache():
    """
    Deletes expired video caches from the `video_cache` table 
    to free up space in Neon Postgres.
    """
    logger.info("[Cleanup] Starting cleanup of expired video cache...")
    try:
        # Delete rows where expiresAt is older than current time
        query = 'DELETE FROM video_cache WHERE "expiresAt" < NOW()'
        await database.execute(query)
        logger.info("[Cleanup] Successfully cleaned up expired video cache.")
    except Exception as e:
        logger.error(f"[Cleanup] Error cleaning expired video cache: {e}")

async def vacuum_old_episodes():
    """
    Optional: Clean up orphaned episodes or do other DB maintenance.
    For Neon Postgres, standard VACUUM isn't easily done via async connections,
    but we can delete orphaned episodes here if needed.
    """
    logger.info("[Cleanup] Starting vacuum/cleanup of old orphaned data...")
    try:
        # Example: delete episodes that don't have a matching anime_metadata row
        query = '''
            DELETE FROM episodes 
            WHERE "anilistId" NOT IN (SELECT "anilistId" FROM anime_metadata)
        '''
        await database.execute(query)
        logger.info("[Cleanup] Successfully vacuumed orphaned episodes.")
    except Exception as e:
        logger.error(f"[Cleanup] Error vacuuming old episodes: {e}")
