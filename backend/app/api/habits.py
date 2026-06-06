import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ..core.database import get_db
from ..models.schedule import Habit, HabitRecord

router = APIRouter(prefix="/habits", tags=["habits"])

class HabitCreate(BaseModel):
    name: str; icon: str = "🎯"; color: str = "#4caf50"
    target: str = "1"; unit: str = "次"; reminder: str = ""

class RecordCreate(BaseModel):
    date: str; value: str = "1"

@router.get("")
async def list_habits(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Habit).order_by(Habit.created_at))
    return result.scalars().all()

@router.post("")
async def create_habit(data: HabitCreate, db: AsyncSession = Depends(get_db)):
    h = Habit(id=str(uuid.uuid4()), **data.model_dump())
    db.add(h); await db.commit(); await db.refresh(h)
    return h

@router.post("/{hid}/record")
async def record_habit(hid: str, data: RecordCreate, db: AsyncSession = Depends(get_db)):
    h = await db.get(Habit, hid)
    if not h: raise HTTPException(404, "Not found")
    r = HabitRecord(id=str(uuid.uuid4()), habit_id=hid, date=data.date, value=data.value,
                     completed=int(data.value) >= int(h.target))
    db.add(r)
    if r.completed: h.current_streak = str(int(h.current_streak) + 1)
    await db.commit()
    return {"completed": r.completed, "streak": h.current_streak}

@router.delete("/{hid}")
async def delete_habit(hid: str, db: AsyncSession = Depends(get_db)):
    h = await db.get(Habit, hid)
    if not h: raise HTTPException(404, "Not found")
    await db.delete(h); await db.commit()
    return {"message": "deleted"}
