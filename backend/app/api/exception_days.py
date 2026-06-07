import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional, List
from ..core.database import get_db
from ..models.schedule import ExceptionDay, Schedule, Habit


router = APIRouter(prefix="/exception-days", tags=["exception-days"])


class ExceptionDayRuleSchema(BaseModel):
    skipHabits: bool = False
    habitIdsToSkip: List[str] = []
    skipSchedules: bool = False
    scheduleCategoriesToSkip: List[str] = []
    rescheduleToNextWorkingDay: bool = False
    adjustWorkHours: bool = False
    workStartTime: Optional[str] = None
    workEndTime: Optional[str] = None
    note: Optional[str] = None


class ExceptionDayCreate(BaseModel):
    date: str
    type: str
    name: str
    description: Optional[str] = ""
    rule: ExceptionDayRuleSchema


class ExceptionDayUpdate(BaseModel):
    date: Optional[str] = None
    type: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    rule: Optional[ExceptionDayRuleSchema] = None


def _is_working_day(date_str: str, exception_dates: List[str]) -> bool:
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    if date_str in exception_dates:
        return False
    return dt.weekday() < 5


def _find_next_working_day(from_date: str, exception_dates: List[str], max_days: int = 30) -> Optional[str]:
    current = datetime.strptime(from_date, "%Y-%m-%d")
    for _ in range(max_days):
        current += timedelta(days=1)
        date_str = current.strftime("%Y-%m-%d")
        if _is_working_day(date_str, exception_dates):
            return date_str
    return None


@router.get("")
async def list_exception_days(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(ExceptionDay).order_by(ExceptionDay.date)
    if start_date and end_date:
        q = q.where(
            ExceptionDay.date >= start_date,
            ExceptionDay.date <= end_date
        )
    elif start_date:
        q = q.where(ExceptionDay.date >= start_date)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{date}")
async def get_exception_day(date: str, db: AsyncSession = Depends(get_db)):
    q = select(ExceptionDay).where(ExceptionDay.date == date)
    result = await db.execute(q)
    exception_day = result.scalar_one_or_none()
    if not exception_day:
        raise HTTPException(404, "Exception day not found")
    
    schedules_q = select(Schedule).where(Schedule.start_time.contains(date))
    schedules_result = await db.execute(schedules_q)
    schedules = schedules_result.scalars().all()
    
    habits_q = select(Habit).order_by(Habit.created_at)
    habits_result = await db.execute(habits_q)
    habits = habits_result.scalars().all()
    
    return {
        "id": exception_day.id,
        "date": exception_day.date,
        "type": exception_day.type,
        "name": exception_day.name,
        "description": exception_day.description,
        "rule": exception_day.rule,
        "created_at": exception_day.created_at,
        "affected_schedules": schedules,
        "affected_habits": habits
    }


@router.post("")
async def create_exception_day(data: ExceptionDayCreate, db: AsyncSession = Depends(get_db)):
    existing_q = select(ExceptionDay).where(ExceptionDay.date == data.date)
    existing_result = await db.execute(existing_q)
    existing = existing_result.scalar_one_or_none()
    if existing:
        raise HTTPException(400, f"Exception day already exists for date: {data.date}")
    
    ed = ExceptionDay(
        id=str(uuid.uuid4()),
        date=data.date,
        type=data.type,
        name=data.name,
        description=data.description or "",
        rule=data.rule.model_dump()
    )
    db.add(ed)
    await db.commit()
    await db.refresh(ed)
    return ed


@router.put("/{eid}")
async def update_exception_day(eid: str, data: ExceptionDayUpdate, db: AsyncSession = Depends(get_db)):
    ed = await db.get(ExceptionDay, eid)
    if not ed:
        raise HTTPException(404, "Exception day not found")
    
    update_data = data.model_dump(exclude_unset=True)
    if "rule" in update_data and update_data["rule"] is not None:
        update_data["rule"] = update_data["rule"].model_dump()
    
    for k, v in update_data.items():
        if v is not None:
            setattr(ed, k, v)
    
    await db.commit()
    await db.refresh(ed)
    return ed


@router.delete("/{eid}")
async def delete_exception_day(eid: str, db: AsyncSession = Depends(get_db)):
    ed = await db.get(ExceptionDay, eid)
    if not ed:
        raise HTTPException(404, "Exception day not found")
    await db.delete(ed)
    await db.commit()
    return {"message": "deleted"}


@router.post("/{eid}/apply")
async def apply_exception_day(eid: str, db: AsyncSession = Depends(get_db)):
    ed = await db.get(ExceptionDay, eid)
    if not ed:
        raise HTTPException(404, "Exception day not found")
    
    rule = ed.rule if isinstance(ed.rule, dict) else {}
    
    all_exceptions_q = select(ExceptionDay.date)
    all_exceptions_result = await db.execute(all_exceptions_q)
    all_exception_dates = [row[0] for row in all_exceptions_result.all()]
    
    schedules_q = select(Schedule).where(
        and_(
            Schedule.start_time.contains(ed.date),
            Schedule.completed == False
        )
    )
    schedules_result = await db.execute(schedules_q)
    schedules = schedules_result.scalars().all()
    
    skip_categories = rule.get("scheduleCategoriesToSkip", []) if rule.get("skipSchedules") else []
    reschedule = rule.get("rescheduleToNextWorkingDay", False)
    
    processed_schedules = []
    skipped_schedules = []
    rescheduled_schedules = []
    
    for s in schedules:
        should_skip = False
        if rule.get("skipSchedules"):
            if not skip_categories or s.category in skip_categories:
                should_skip = True
        
        if should_skip:
            skipped_schedules.append({
                "id": s.id,
                "title": s.title,
                "category": s.category,
                "action": "skipped"
            })
            continue
        
        if reschedule:
            next_working_day = _find_next_working_day(ed.date, all_exception_dates)
            if next_working_day:
                s_start = s.start_time if isinstance(s.start_time, datetime) else datetime.fromisoformat(s.start_time)
                s_end = s.end_time if isinstance(s.end_time, datetime) else datetime.fromisoformat(s.end_time)
                
                start_dt = datetime.strptime(next_working_day, "%Y-%m-%d").replace(
                    hour=s_start.hour, minute=s_start.minute
                )
                end_dt = datetime.strptime(next_working_day, "%Y-%m-%d").replace(
                    hour=s_end.hour, minute=s_end.minute
                )
                
                s.start_time = start_dt
                s.end_time = end_dt
                
                rescheduled_schedules.append({
                    "id": s.id,
                    "title": s.title,
                    "original_date": ed.date,
                    "new_date": next_working_day,
                    "action": "rescheduled"
                })
            else:
                processed_schedules.append({
                    "id": s.id,
                    "title": s.title,
                    "action": "kept (no next working day found)"
                })
        else:
            processed_schedules.append({
                "id": s.id,
                "title": s.title,
                "action": "kept"
            })
    
    if rescheduled_schedules:
        await db.commit()
    
    habits_q = select(Habit).order_by(Habit.created_at)
    habits_result = await db.execute(habits_q)
    habits = habits_result.scalars().all()
    
    skip_habit_ids = rule.get("habitIdsToSkip", []) if rule.get("skipHabits") else []
    
    skipped_habits = []
    kept_habits = []
    
    for h in habits:
        if rule.get("skipHabits"):
            if not skip_habit_ids or h.id in skip_habit_ids:
                skipped_habits.append({
                    "id": h.id,
                    "name": h.name,
                    "action": "skipped"
                })
                continue
        kept_habits.append({
            "id": h.id,
            "name": h.name,
            "action": "kept"
        })
    
    return {
        "message": "Exception day rules applied",
        "schedules": {
            "processed": processed_schedules,
            "skipped": skipped_schedules,
            "rescheduled": rescheduled_schedules
        },
        "habits": {
            "skipped": skipped_habits,
            "kept": kept_habits
        }
    }


@router.get("/check/{date}")
async def check_exception_day(date: str, db: AsyncSession = Depends(get_db)):
    q = select(ExceptionDay).where(ExceptionDay.date == date)
    result = await db.execute(q)
    exception_day = result.scalar_one_or_none()
    
    if not exception_day:
        return {
            "is_exception_day": False,
            "exception_day": None
        }
    
    return {
        "is_exception_day": True,
        "exception_day": {
            "id": exception_day.id,
            "date": exception_day.date,
            "type": exception_day.type,
            "name": exception_day.name,
            "description": exception_day.description,
            "rule": exception_day.rule
        }
    }
