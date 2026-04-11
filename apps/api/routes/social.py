import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from db.connection import database
from db.models import comments, users, comment_reactions, follows, watch_events
from sqlalchemy import select, insert, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

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
    reactions_sub = select(func.count()).where(comment_reactions.c.comment_id == comments.c.id).scalar_subquery()
    query = select(
        comments,
        users.c.username,
        users.c.avatar,
        reactions_sub.label("reactions")
    ).select_from(
        comments.outerjoin(users, comments.c.user_id == users.c.id)
    ).where(
        (comments.c.anilistId == anilistId) & 
        (comments.c.episodeNumber == episodeNumber)
    ).order_by(comments.c.created_at.desc())
    
    rows = await database.fetch_all(query=query)
    return [dict(row) for row in rows]

@router.post("/comments")
async def create_comment(comment: CommentCreate):
    # Ensure user exists before adding comment (upsert dummy user for MVP)
    upsert_user = pg_insert(users).values(
        id=comment.user_id, 
        username=f"user_{comment.user_id[:5]}"
    ).on_conflict_do_nothing()
    await database.execute(upsert_user)
    
    insert_comment = insert(comments).values(**comment.dict()).returning(comments.c.id)
    record_id = await database.execute(insert_comment)
    return {"id": record_id, "success": True}

# --- Reactions ---
@router.post("/reactions")
async def create_reaction(reaction: ReactionCreate):
    insert_reaction = pg_insert(comment_reactions).values(**reaction.dict()).on_conflict_do_nothing()
    await database.execute(insert_reaction)
    return {"success": True}

# --- Follows ---
@router.post("/follows")
async def follow_user(follow: FollowCreate):
    insert_follow = pg_insert(follows).values(**follow.dict()).on_conflict_do_nothing()
    await database.execute(insert_follow)
    return {"success": True}

# --- Watch Events ---
@router.post("/events")
async def track_event(event: WatchEventCreate):
    # Upsert user if needed
    upsert_user = pg_insert(users).values(
        id=event.user_id, 
        username=f"user_{event.user_id[:5]}"
    ).on_conflict_do_nothing()
    await database.execute(upsert_user)
    
    insert_event = insert(watch_events).values(**event.dict())
    await database.execute(insert_event)
    return {"success": True}
