import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from ..core.database import get_db
from ..models.schedule import FocusSession

router = APIRouter(prefix="/focus-sessions", tags=["focus-sessions"])

class FocusSessionCreate(BaseModel):
    duration: int
    start_time: str
    schedule_id: Optional[str] = None

class FocusSessionUpdate(BaseModel):
    end_time: Optional[str] = None
    completed: Optional[bool] = None
    interrupted: Optional[bool] = None
    is_paused: Optional[bool] = None
    paused_at: Optional[str] = None
    accumulated_seconds: Optional[int] = None

class FocusSessionPause(BaseModel):
    paused_at: str
    accumulated_seconds: int

class FocusSessionResume(BaseModel):
    pass

def _focus_session_to_dict(s: FocusSession) -> dict:
    return {
        "id": s.id,
        "duration": int(s.duration) if isinstance(s.duration, str) else s.duration,
        "start_time": s.start_time.isoformat() if isinstance(s.start_time, datetime) else s.start_time,
        "end_time": s.end_time.isoformat() if isinstance(s.end_time, datetime) else s.end_time,
        "schedule_id": s.schedule_id,
        "completed": s.completed,
        "interrupted": s.interrupted,
        "is_paused": s.is_paused,
        "paused_at": s.paused_at.isoformat() if isinstance(s.paused_at, datetime) else s.paused_at,
        "accumulated_seconds": int(s.accumulated_seconds) if isinstance(s.accumulated_seconds, str) else s.accumulated_seconds
    }

@router.get("")
async def list_focus_sessions(
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(FocusSession).order_by(FocusSession.start_time.desc())
    if date:
        q = q.where(FocusSession.start_time.contains(date))
    elif start_date and end_date:
        q = q.where(
            FocusSession.start_time >= start_date,
            FocusSession.start_time <= end_date + 'T23:59:59'
        )
    result = await db.execute(q)
    sessions = result.scalars().all()
    return [_focus_session_to_dict(s) for s in sessions]

@router.get("/{fsid}")
async def get_focus_session(fsid: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(FocusSession, fsid)
    if not s:
        raise HTTPException(404, "Not found")
    return _focus_session_to_dict(s)

@router.post("")
async def create_focus_session(data: FocusSessionCreate, db: AsyncSession = Depends(get_db)):
    s = FocusSession(
        id=str(uuid.uuid4()),
        duration=str(data.duration),
        start_time=datetime.fromisoformat(data.start_time) if isinstance(data.start_time, str) else data.start_time,
        schedule_id=data.schedule_id,
        completed=False,
        interrupted=False
    )
    db.add(s)
    await db.commit()
    await db.refresh(s)
    return _focus_session_to_dict(s)

@router.get("/active/current")
async def get_active_focus_session(db: AsyncSession = Depends(get_db)):
    q = select(FocusSession).where(
        FocusSession.completed == False,
        FocusSession.interrupted == False,
        FocusSession.end_time == None
    ).order_by(FocusSession.start_time.desc()).limit(1)
    result = await db.execute(q)
    s = result.scalar_one_or_none()
    if not s:
        return None
    
    if s.completed or s.interrupted or s.end_time is not None:
        return None
    
    start_dt = s.start_time if isinstance(s.start_time, datetime) else datetime.fromisoformat(s.start_time)
    max_allowed_duration = (s.duration if isinstance(s.duration, int) else int(s.duration)) * 60 + 86400
    if (datetime.now() - start_dt).total_seconds() > max_allowed_duration:
        return None
    
    return _focus_session_to_dict(s)

@router.post("/{fsid}/pause")
async def pause_focus_session(fsid: str, data: FocusSessionPause, db: AsyncSession = Depends(get_db)):
    s = await db.get(FocusSession, fsid)
    if not s:
        raise HTTPException(404, "Not found")
    if s.completed or s.interrupted:
        raise HTTPException(400, "Session already ended")
    s.is_paused = True
    s.paused_at = datetime.fromisoformat(data.paused_at) if isinstance(data.paused_at, str) else data.paused_at
    s.accumulated_seconds = str(data.accumulated_seconds)
    await db.commit()
    await db.refresh(s)
    return _focus_session_to_dict(s)

@router.post("/{fsid}/resume")
async def resume_focus_session(fsid: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(FocusSession, fsid)
    if not s:
        raise HTTPException(404, "Not found")
    if not s.is_paused:
        raise HTTPException(400, "Session is not paused")
    s.is_paused = False
    s.paused_at = None
    await db.commit()
    await db.refresh(s)
    return _focus_session_to_dict(s)

@router.put("/{fsid}")
async def update_focus_session(fsid: str, data: FocusSessionUpdate, db: AsyncSession = Depends(get_db)):
    s = await db.get(FocusSession, fsid)
    if not s:
        raise HTTPException(404, "Not found")
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        if k in ("end_time", "paused_at") and v is not None:
            setattr(s, k, datetime.fromisoformat(v) if isinstance(v, str) else v)
        elif k == "accumulated_seconds" and v is not None:
            setattr(s, k, str(v))
        else:
            setattr(s, k, v)
    await db.commit()
    await db.refresh(s)
    return _focus_session_to_dict(s)

@router.delete("/{fsid}")
async def delete_focus_session(fsid: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(FocusSession, fsid)
    if not s:
        raise HTTPException(404, "Not found")
    await db.delete(s)
    await db.commit()
    return {"message": "deleted"}

@router.get("/statistics/interruptions")
async def get_interruption_statistics(
    start_date: str,
    end_date: str,
    db: AsyncSession = Depends(get_db)
):
    q = select(FocusSession).where(
        FocusSession.start_time >= start_date,
        FocusSession.start_time <= end_date + 'T23:59:59',
        FocusSession.interrupted == True
    )
    result = await db.execute(q)
    sessions = result.scalars().all()
    
    hourly_counts = {}
    for s in sessions:
        start_dt = s.start_time if isinstance(s.start_time, datetime) else datetime.fromisoformat(s.start_time)
        hour = start_dt.hour
        hourly_counts[hour] = hourly_counts.get(hour, 0) + 1
    
    return {
        "total_interruptions": len(sessions),
        "hourly_distribution": hourly_counts,
        "sessions": [_focus_session_to_dict(s) for s in sessions]
    }
