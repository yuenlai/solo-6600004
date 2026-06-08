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

def get_unique_completed_dates(records) -> list:
    seen_dates = set()
    unique_dates = []
    for record in records:
        if not record.completed:
            continue
        record_date = parse_date(record.date).date()
        date_str = record_date.strftime("%Y-%m-%d")
        if date_str not in seen_dates:
            seen_dates.add(date_str)
            unique_dates.append(record_date)
    return sorted(unique_dates, reverse=True)

def calculate_current_streak(unique_dates: list) -> int:
    if not unique_dates:
        return 0
    
    today = datetime.now().date()
    latest_date = unique_dates[0]
    days_since_latest = (today - latest_date).days
    
    if days_since_latest > 1:
        return 0
    
    current_streak = 1
    for i in range(1, len(unique_dates)):
        prev_date = unique_dates[i-1]
        curr_date = unique_dates[i]
        delta = (prev_date - curr_date).days
        
        if delta == 1:
            current_streak += 1
        elif delta > 1:
            break
    
    return current_streak

def calculate_longest_streak(unique_dates: list) -> int:
    if not unique_dates:
        return 0
    
    sorted_dates = sorted(unique_dates)
    longest_streak = 1
    temp_streak = 1
    
    for i in range(1, len(sorted_dates)):
        delta = (sorted_dates[i] - sorted_dates[i-1]).days
        if delta == 1:
            temp_streak += 1
            longest_streak = max(longest_streak, temp_streak)
        elif delta > 1:
            temp_streak = 1
    
    return longest_streak

async def deduplicate_habit_records(db: AsyncSession, habit_id: str = None) -> int:
    query = select(HabitRecord).order_by(HabitRecord.habit_id, HabitRecord.date)
    if habit_id:
        query = query.where(HabitRecord.habit_id == habit_id)
    
    result = await db.execute(query)
    records = result.scalars().all()
    
    seen = {}
    to_delete = []
    for record in records:
        key = (record.habit_id, record.date)
        if key in seen:
            existing = seen[key]
            if record.completed and not existing.completed:
                to_delete.append(existing)
                seen[key] = record
            else:
                to_delete.append(record)
        else:
            seen[key] = record
    
    for record in to_delete:
        await db.delete(record)
    
    if to_delete:
        await db.commit()
    
    return len(to_delete)

async def recalculate_streak(habit_id: str, db: AsyncSession) -> int:
    result = await db.execute(
        select(HabitRecord)
        .where(and_(HabitRecord.habit_id == habit_id, HabitRecord.completed == True))
        .order_by(desc(HabitRecord.date))
    )
    records = result.scalars().all()
    
    unique_dates = get_unique_completed_dates(records)
    return calculate_current_streak(unique_dates)

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
    existing = await db.execute(
        select(Habit).where(Habit.name == data.name)
    )
    existing_habit = existing.scalar_one_or_none()
    if existing_habit:
        raise HTTPException(status_code=400, detail=f"已存在同名习惯: {data.name}")
    
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
    
    await deduplicate_habit_records(db, hid)
    
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
    
    unique_dates = get_unique_completed_dates(records)
    
    total_completed = len(unique_dates)
    
    longest_streak = calculate_longest_streak(unique_dates)
    current_streak = calculate_current_streak(unique_dates)
    
    today = datetime.now().date()
    sorted_dates = sorted(unique_dates)
    first_date = sorted_dates[0] if unique_dates else today
    total_days = (today - first_date).days + 1
    completion_rate = round(min(100, (total_completed / total_days) * 100), 1) if total_days > 0 else 0
    
    this_month_start = datetime(today.year, today.month, 1).date()
    this_month_completed = sum(
        1 for d in unique_dates 
        if this_month_start <= d <= today
    )
    
    last_7_days = []
    unique_date_strs = {d.strftime("%Y-%m-%d") for d in unique_dates}
    for i in range(6, -1, -1):
        d = format_date(today - timedelta(days=i))
        last_7_days.append({"date": d, "completed": d in unique_date_strs})
    
    first_record_date = format_date(sorted_dates[0]) if unique_dates else None
    
    return {
        "habitId": hid,
        "totalCompleted": total_completed,
        "currentStreak": current_streak,
        "longestStreak": longest_streak,
        "completionRate": completion_rate,
        "thisMonthCompleted": this_month_completed,
        "last7Days": last_7_days,
        "firstRecordDate": first_record_date,
        "totalDaysTracked": total_days
    }

@router.post("/deduplicate")
async def deduplicate_all_records(db: AsyncSession = Depends(get_db)):
    removed_count = await deduplicate_habit_records(db)
    return {"message": "deduplication complete", "removed_count": removed_count}

@router.delete("/{hid}")
async def delete_habit(hid: str, db: AsyncSession = Depends(get_db)):
    h = await db.get(Habit, hid)
    if not h: raise HTTPException(404, "Not found")
    
    await db.execute(
        HabitRecord.__table__.delete().where(HabitRecord.habit_id == hid)
    )
    
    await db.delete(h); await db.commit()
    return {"message": "deleted"}
