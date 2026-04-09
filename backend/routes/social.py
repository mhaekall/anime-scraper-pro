import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from db.connection import database
from sqlalchemy import text

router = APIRouter()

# Models
class CommentCreate(BaseModel):
    user_id: str
    anilistId: int
    episodeNumber: float
    parent_id: Optional[int] = None
    text: str
    timestamp_sec: Optional[int] = None

class ReactionCreate(BaseModel):
    comment_id: int
    user_id: str
    emoji: str

class FollowCreate(BaseModel):
    follower_id: str
    following_id: str

class WatchEventCreate(BaseModel):
    user_id: str
    anilistId: int
    episodeNumber: float
    event_type: str
    timestamp_sec: Optional[int] = None

# --- Comments ---
@router.get("/comments")
async def get_comments(anilistId: int, episodeNumber: float):
    query = """
        SELECT c.*, u.username, u.avatar,
               (SELECT COUNT(*) FROM comment_reactions r WHERE r.comment_id = c.id) as reactions
        FROM comments c
        LEFT JOIN users u ON c.user_id = u.id
        WHERE c.anilistId = :anilistId AND c.episodeNumber = :episodeNumber
        ORDER BY c.created_at DESC
    """
    rows = await database.fetch_all(query=query, values={"anilistId": anilistId, "episodeNumber": episodeNumber})
    return [dict(row) for row in rows]

@router.post("/comments")
async def create_comment(comment: CommentCreate):
    # Ensure user exists before adding comment (upsert dummy user for MVP)
    await database.execute(
        "INSERT INTO users (id, username) VALUES (:id, :username) ON CONFLICT (id) DO NOTHING",
        {"id": comment.user_id, "username": f"user_{comment.user_id[:5]}"}
    )
    
    query = """
        INSERT INTO comments (user_id, "anilistId", "episodeNumber", parent_id, text, timestamp_sec)
        VALUES (:user_id, :anilistId, :episodeNumber, :parent_id, :text, :timestamp_sec)
        RETURNING id
    """
    record_id = await database.execute(query=query, values=comment.dict())
    return {"id": record_id, "success": True}

# --- Reactions ---
@router.post("/reactions")
async def create_reaction(reaction: ReactionCreate):
    query = """
        INSERT INTO comment_reactions (comment_id, user_id, emoji)
        VALUES (:comment_id, :user_id, :emoji)
        ON CONFLICT (comment_id, user_id, emoji) DO NOTHING
    """
    await database.execute(query=query, values=reaction.dict())
    return {"success": True}

# --- Follows ---
@router.post("/follows")
async def follow_user(follow: FollowCreate):
    query = """
        INSERT INTO follows (follower_id, following_id)
        VALUES (:follower_id, :following_id)
        ON CONFLICT (follower_id, following_id) DO NOTHING
    """
    await database.execute(query=query, values=follow.dict())
    return {"success": True}

# --- Watch Events ---
@router.post("/events")
async def track_event(event: WatchEventCreate):
    # Upsert user if needed
    await database.execute(
        "INSERT INTO users (id, username) VALUES (:id, :username) ON CONFLICT (id) DO NOTHING",
        {"id": event.user_id, "username": f"user_{event.user_id[:5]}"}
    )
    
    query = """
        INSERT INTO watch_events (user_id, "anilistId", "episodeNumber", event_type, timestamp_sec)
        VALUES (:user_id, :anilistId, :episodeNumber, :event_type, :timestamp_sec)
    """
    await database.execute(query=query, values=event.dict())
    return {"success": True}
