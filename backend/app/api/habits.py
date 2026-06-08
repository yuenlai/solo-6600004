import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from pydantic import BaseModel
from ..core.database import get_db
from ..models.schedule import Habit, HabitRecord

router = APIRouter(prefix="/habits", tags=["habits"])

class HabitCreate(BaseModel):
    name: str; icon: str = "🎯"; color: str = "#4caf50"
    target: str = "1"; unit: str = "次"; reminder: str = ""

class RecordCreate(BaseModel):
    date: str; value: str = "1"

def parse_date(date_str: str) -> datetime:
    return datetime.strptime(date_str, "%Y-%m-%d")

def format_date(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")

async def recalculate_streak(habit_id: str, db: AsyncSession) -> int:
    result = await db.execute(
        select(HabitRecord)
        .where(and_(HabitRecord.habit_id == habit_id, HabitRecord.completed == True))
        .order_by(desc(HabitRecord.date))
    )
    records = result.scalars().all()
    
    if not records:
        return 0
    
    today = datetime.now().date()
    current_streak = 0
    check_date = today
    
    for record in records:
        record_date = parse_date(record.date).date()
        delta = (check_date - record_date).days
        
        if delta == 0 or delta == 1:
            current_streak += 1
            check_date = record_date
        elif delta > 1:
            break
    
    return current_streak

@router.get("")
async def list_habits(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Habit).order_by(Habit.created_at))
    habits = result.scalars().all()
    
    for habit in habits:
        streak = await recalculate_streak(habit.id, db)
        habit.current_streak = str(streak)
    
    await db.commit()
    return habits

@router.post("")
async def create_habit(data: HabitCreate, db: AsyncSession = Depends(get_db)):
    h = Habit(id=str(uuid.uuid4()), **data.model_dump())
    db.add(h); await db.commit(); await db.refresh(h)
    return h

@router.get("/{hid}/records")
async def get_habit_records(hid: str, start_date: str = None, end_date: str = None, db: AsyncSession = Depends(get_db)):
    h = await db.get(Habit, hid)
    if not h: raise HTTPException(404, "Not found")
    
    query = select(HabitRecord).where(HabitRecord.habit_id == hid)
    if start_date:
        query = query.where(HabitRecord.date >= start_date)
    if end_date:
        query = query.where(HabitRecord.date <= end_date)
    query = query.order_by(HabitRecord.date)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{hid}/record")
async def record_habit(hid: str, data: RecordCreate, db: AsyncSession = Depends(get_db)):
    h = await db.get(Habit, hid)
    if not h: raise HTTPException(404, "Not found")
    
    existing = await db.execute(
        select(HabitRecord).where(
            and_(HabitRecord.habit_id == hid, HabitRecord.date == data.date)
        )
    )
    existing_record = existing.scalar_one_or_none()
    
    if existing_record:
        existing_record.value = data.value
        existing_record.completed = int(data.value) >= int(h.target)
        r = existing_record
    else:
        r = HabitRecord(id=str(uuid.uuid4()), habit_id=hid, date=data.date, value=data.value,
                         completed=int(data.value) >= int(h.target))
        db.add(r)
    
    new_streak = await recalculate_streak(hid, db)
    h.current_streak = str(new_streak)
    
    await db.commit()
    return {"completed": r.completed, "streak": h.current_streak, "date": data.date}

@router.delete("/{hid}/record/{date}")
async def delete_habit_record(hid: str, date: str, db: AsyncSession = Depends(get_db)):
    h = await db.get(Habit, hid)
    if not h: raise HTTPException(404, "Not found")
    
    result = await db.execute(
        select(HabitRecord).where(
            and_(HabitRecord.habit_id == hid, HabitRecord.date == date)
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Record not found")
    
    await db.delete(record)
    
    new_streak = await recalculate_streak(hid, db)
    h.current_streak = str(new_streak)
    
    await db.commit()
    return {"message": "deleted", "streak": h.current_streak}

@router.get("/{hid}/stats")
async def get_habit_stats(hid: str, db: AsyncSession = Depends(get_db)):
    h = await db.get(Habit, hid)
    if not h: raise HTTPException(404, "Not found")
    
    result = await db.execute(
        select(HabitRecord).where(
            and_(HabitRecord.habit_id == hid, HabitRecord.completed == True)
        ).order_by(HabitRecord.date)
    )
    records = result.scalars().all()
    
    total_completed = len(records)
    
    longest_streak = 0
    current_streak = 0
    if records:
        sorted_dates = sorted([parse_date(r.date) for r in records])
        longest_streak = 1
        temp_streak = 1
        for i in range(1, len(sorted_dates)):
            delta = (sorted_dates[i] - sorted_dates[i-1]).days
            if delta == 1:
                temp_streak += 1
                longest_streak = max(longest_streak, temp_streak)
            elif delta > 1:
                temp_streak = 1
        
        current_streak = await recalculate_streak(hid, db)
    
    today = datetime.now().date()
    first_date = parse_date(records[0].date).date() if records else today
    total_days = (today - first_date).days + 1
    completion_rate = round((total_completed / total_days) * 100, 1) if total_days > 0 else 0
    
    this_month_start = format_date(datetime(today.year, today.month, 1))
    this_month_end = format_date(today)
    month_result = await db.execute(
        select(func.count(HabitRecord.id)).where(
            and_(
                HabitRecord.habit_id == hid,
                HabitRecord.completed == True,
                HabitRecord.date >= this_month_start,
                HabitRecord.date <= this_month_end
            )
        )
    )
    this_month_completed = month_result.scalar_one() or 0
    
    last_7_days = []
    for i in range(6, -1, -1):
        d = format_date(today - timedelta(days=i))
        completed = any(parse_date(r.date).strftime("%Y-%m-%d") == d for r in records)
        last_7_days.append({"date": d, "completed": completed})
    
    return {
        "habitId": hid,
        "totalCompleted": total_completed,
        "currentStreak": current_streak,
        "longestStreak": longest_streak,
        "completionRate": completion_rate,
        "thisMonthCompleted": this_month_completed,
        "last7Days": last_7_days,
        "firstRecordDate": records[0].date if records else None,
        "totalDaysTracked": total_days
    }

@router.delete("/{hid}")
async def delete_habit(hid: str, db: AsyncSession = Depends(get_db)):
    h = await db.get(Habit, hid)
    if not h: raise HTTPException(404, "Not found")
    
    await db.execute(
        HabitRecord.__table__.delete().where(HabitRecord.habit_id == hid)
    )
    
    await db.delete(h); await db.commit()
    return {"message": "deleted"}
