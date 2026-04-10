from db.connection import database

async def cleanup_expired_cache():
    """Hapus entri video_cache yang sudah expired."""
    result = await database.execute(
        'DELETE FROM video_cache WHERE "expiresAt" < NOW()'
    )
    print(f"[Cleanup] Deleted expired video_cache entries")
    return result

async def vacuum_old_episodes():
    """
    Hapus episode dari provider dengan prioritas rendah
    jika provider prioritas tinggi sudah ada untuk episode yang sama.
    Menghemat storage Neon DB.
    """
    deleted = await database.execute("""
        DELETE FROM episodes e1
        WHERE e1."providerId" IN ('doronime', 'oploverz')
        AND EXISTS (
            SELECT 1 FROM episodes e2
            WHERE e2."anilistId" = e1."anilistId"
            AND e2."episodeNumber" = e1."episodeNumber"
            AND e2."providerId" IN ('samehadaku', 'kuronime')
        )
    """)
    print(f"[Cleanup] Removed redundant low-priority episodes")
