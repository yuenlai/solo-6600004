import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from ..core.database import get_db
from ..models.schedule import Schedule

router = APIRouter(prefix="/schedules", tags=["schedules"])

class ScheduleCreate(BaseModel):
    title: str; description: str = ""; start_time: str; end_time: str
    priority: str = "medium"; category: str = "工作"; recurring: Optional[str] = None

class ScheduleUpdate(BaseModel):
    title: Optional[str] = None; completed: Optional[bool] = None

@router.get("")
async def list_schedules(date: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    q = select(Schedule).order_by(Schedule.start_time)
    if date: q = q.where(Schedule.start_time.contains(date))
    result = await db.execute(q)
    return result.scalars().all()

@router.post("")
async def create_schedule(data: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    s = Schedule(id=str(uuid.uuid4()), **data.model_dump())
    db.add(s); await db.commit(); await db.refresh(s)
    return s

@router.put("/{sid}")
async def update_schedule(sid: str, data: ScheduleUpdate, db: AsyncSession = Depends(get_db)):
    s = await db.get(Schedule, sid)
    if not s: raise HTTPException(404, "Not found")
    for k, v in data.model_dump(exclude_unset=True).items(): setattr(s, k, v)
    await db.commit(); await db.refresh(s)
    return s

@router.delete("/{sid}")
async def delete_schedule(sid: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(Schedule, sid)
    if not s: raise HTTPException(404, "Not found")
    await db.delete(s); await db.commit()
    return {"message": "deleted"}
