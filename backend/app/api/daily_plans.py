import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from ..core.database import get_db
from ..models.schedule import MorningPlan, EveningReview, Schedule

router = APIRouter(prefix="/daily-plans", tags=["daily-plans"])


class MorningPlanCreate(BaseModel):
    date: str
    focus_items: List[str] = []
    priorities: List[str] = []
    schedule_ids: List[str] = []
    note: str = ""


class MorningPlanUpdate(BaseModel):
    focus_items: Optional[List[str]] = None
    priorities: Optional[List[str]] = None
    schedule_ids: Optional[List[str]] = None
    note: Optional[str] = None


class EveningReviewCreate(BaseModel):
    date: str
    highlights: str = ""
    improvements: str = ""
    summary: str = ""
    mood: str = "neutral"


class EveningReviewUpdate(BaseModel):
    highlights: Optional[str] = None
    improvements: Optional[str] = None
    summary: Optional[str] = None
    mood: Optional[str] = None


@router.get("/morning/{date}")
async def get_morning_plan(date: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MorningPlan).where(MorningPlan.date == date))
    plan = result.scalar_one_or_none()
    return plan


@router.post("/morning")
async def create_morning_plan(data: MorningPlanCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(MorningPlan).where(MorningPlan.date == data.date))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "该日期的晨间规划已存在")
    
    plan = MorningPlan(
        id=str(uuid.uuid4()),
        date=data.date,
        focus_items=data.focus_items,
        priorities=data.priorities,
        schedule_ids=data.schedule_ids,
        note=data.note
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.put("/morning/{date}")
async def update_morning_plan(date: str, data: MorningPlanUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MorningPlan).where(MorningPlan.date == date))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(404, "晨间规划不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(plan, k, v)
    await db.commit()
    await db.refresh(plan)
    return plan


@router.get("/morning/generate-suggestion")
async def generate_morning_suggestion(date: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Schedule)
        .where(Schedule.start_time.contains(date))
        .order_by(Schedule.start_time)
    )
    schedules = list(result.scalars().all())
    
    high_priority = [s for s in schedules if s.priority == "high"]
    medium_priority = [s for s in schedules if s.priority == "medium"]
    
    suggestions = {
        "focus_items": [s.title for s in high_priority[:3]],
        "priorities": [s.title for s in (high_priority + medium_priority)[:5]],
        "schedule_ids": [s.id for s in schedules],
        "note": f"今日共有 {len(schedules)} 个日程，其中 {len(high_priority)} 个高优先级，请重点关注。"
    }
    return suggestions


@router.get("/completion-stats/{date}")
async def get_completion_stats(date: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Schedule).where(Schedule.start_time.contains(date))
    )
    schedules = list(result.scalars().all())
    
    total = len(schedules)
    completed = sum(1 for s in schedules if s.completed)
    rate = round((completed / total * 100), 1) if total > 0 else 0
    
    return {
        "date": date,
        "total_count": total,
        "completed_count": completed,
        "completion_rate": rate,
        "schedules": [
            {
                "id": s.id,
                "title": s.title,
                "completed": s.completed,
                "priority": s.priority,
                "category": s.category,
                "start_time": s.start_time.isoformat() if isinstance(s.start_time, datetime) else s.start_time,
                "end_time": s.end_time.isoformat() if isinstance(s.end_time, datetime) else s.end_time
            }
            for s in schedules
        ]
    }


@router.get("/evening/{date}")
async def get_evening_review(date: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EveningReview).where(EveningReview.date == date))
    review = result.scalar_one_or_none()
    return review


@router.post("/evening")
async def create_evening_review(data: EveningReviewCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(EveningReview).where(EveningReview.date == data.date))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "该日期的晚间复盘已存在")
    
    stats_result = await db.execute(
        select(Schedule).where(Schedule.start_time.contains(data.date))
    )
    schedules = list(stats_result.scalars().all())
    total = len(schedules)
    completed = sum(1 for s in schedules if s.completed)
    rate = round((completed / total * 100), 1) if total > 0 else 0
    
    review = EveningReview(
        id=str(uuid.uuid4()),
        date=data.date,
        completed_count=str(completed),
        total_count=str(total),
        completion_rate=str(rate),
        highlights=data.highlights,
        improvements=data.improvements,
        summary=data.summary,
        mood=data.mood
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


@router.put("/evening/{date}")
async def update_evening_review(date: str, data: EveningReviewUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EveningReview).where(EveningReview.date == date))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(404, "晚间复盘不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(review, k, v)
    await db.commit()
    await db.refresh(review)
    return review


@router.get("/{date}")
async def get_daily_plan(date: str, db: AsyncSession = Depends(get_db)):
    morning_result = await db.execute(select(MorningPlan).where(MorningPlan.date == date))
    morning_plan = morning_result.scalar_one_or_none()
    
    evening_result = await db.execute(select(EveningReview).where(EveningReview.date == date))
    evening_review = evening_result.scalar_one_or_none()
    
    stats_result = await db.execute(
        select(Schedule).where(Schedule.start_time.contains(date))
    )
    schedules = list(stats_result.scalars().all())
    total = len(schedules)
    completed = sum(1 for s in schedules if s.completed)
    rate = round((completed / total * 100), 1) if total > 0 else 0
    
    return {
        "date": date,
        "morning_plan": morning_plan,
        "evening_review": evening_review,
        "completion_stats": {
            "total_count": total,
            "completed_count": completed,
            "completion_rate": rate
        }
    }
