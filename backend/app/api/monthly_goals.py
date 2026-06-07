import uuid
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from ..core.database import get_db
from ..models.schedule import MonthlyGoal, WeeklyAction, DailyAction, Schedule

router = APIRouter(prefix="/monthly-goals", tags=["monthly-goals"])


class MonthlyGoalCreate(BaseModel):
    title: str
    description: str = ""
    month: str
    category: str = "工作"
    priority: str = "medium"


class MonthlyGoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class WeeklyActionCreate(BaseModel):
    monthly_goal_id: str
    title: str
    description: str = ""
    week_number: int
    start_date: str
    end_date: str


class DailyActionCreate(BaseModel):
    weekly_action_id: str
    monthly_goal_id: str
    title: str
    description: str = ""
    date: str


class BreakdownRequest(BaseModel):
    monthly_goal_id: str
    weekly_actions: List[WeeklyActionCreate]
    daily_actions: Optional[List[DailyActionCreate]] = None


def get_weeks_of_month(month_str: str) -> List[dict]:
    year, month = map(int, month_str.split("-"))
    first_day = date(year, month, 1)
    last_day = date(year, month + 1, 1) - timedelta(days=1) if month < 12 else date(year + 1, 1, 1) - timedelta(days=1)
    
    weeks = []
    current = first_day
    week_num = 1
    
    while current <= last_day:
        start_of_week = current - timedelta(days=current.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        if start_of_week < first_day:
            start_of_week = first_day
        if end_of_week > last_day:
            end_of_week = last_day
        
        weeks.append({
            "week_number": week_num,
            "start_date": start_of_week.isoformat(),
            "end_date": end_of_week.isoformat()
        })
        
        current = end_of_week + timedelta(days=1)
        week_num += 1
    
    return weeks


@router.get("/weeks/{month}")
async def get_month_weeks(month: str):
    return {"weeks": get_weeks_of_month(month)}


@router.get("")
async def list_monthly_goals(month: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    query = select(MonthlyGoal)
    if month:
        query = query.where(MonthlyGoal.month == month)
    query = query.order_by(MonthlyGoal.created_at.desc())
    result = await db.execute(query)
    goals = list(result.scalars().all())
    return goals


@router.get("/{goal_id}")
async def get_monthly_goal(goal_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MonthlyGoal).where(MonthlyGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "月度目标不存在")
    
    weekly_result = await db.execute(
        select(WeeklyAction).where(WeeklyAction.monthly_goal_id == goal_id)
        .order_by(WeeklyAction.week_number)
    )
    weekly_actions = list(weekly_result.scalars().all())
    
    weekly_with_details = []
    for wa in weekly_actions:
        daily_result = await db.execute(
            select(DailyAction).where(DailyAction.weekly_action_id == wa.id)
            .order_by(DailyAction.date)
        )
        daily_actions = list(daily_result.scalars().all())
        weekly_with_details.append({
            **wa.__dict__,
            "daily_actions": daily_actions
        })
    
    return {
        **goal.__dict__,
        "weekly_actions": weekly_with_details
    }


@router.post("")
async def create_monthly_goal(data: MonthlyGoalCreate, db: AsyncSession = Depends(get_db)):
    goal = MonthlyGoal(
        id=str(uuid.uuid4()),
        title=data.title,
        description=data.description,
        month=data.month,
        category=data.category,
        priority=data.priority,
        status="active",
        progress="0"
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.put("/{goal_id}")
async def update_monthly_goal(goal_id: str, data: MonthlyGoalUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MonthlyGoal).where(MonthlyGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "月度目标不存在")
    
    update_data = data.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(goal, k, v)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}")
async def delete_monthly_goal(goal_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MonthlyGoal).where(MonthlyGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "月度目标不存在")
    
    await db.execute(select(DailyAction).where(DailyAction.monthly_goal_id == goal_id))
    daily_actions = list((await db.execute(select(DailyAction).where(DailyAction.monthly_goal_id == goal_id))).scalars().all())
    for da in daily_actions:
        await db.delete(da)
    
    weekly_actions = list((await db.execute(select(WeeklyAction).where(WeeklyAction.monthly_goal_id == goal_id))).scalars().all())
    for wa in weekly_actions:
        await db.delete(wa)
    
    await db.delete(goal)
    await db.commit()
    return {"status": "success"}


@router.post("/breakdown")
async def create_breakdown(data: BreakdownRequest, db: AsyncSession = Depends(get_db)):
    goal_result = await db.execute(select(MonthlyGoal).where(MonthlyGoal.id == data.monthly_goal_id))
    goal = goal_result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "月度目标不存在")
    
    created_weekly = []
    created_daily = []
    
    for wa_data in data.weekly_actions:
        weekly = WeeklyAction(
            id=str(uuid.uuid4()),
            monthly_goal_id=wa_data.monthly_goal_id,
            title=wa_data.title,
            description=wa_data.description,
            week_number=str(wa_data.week_number),
            start_date=wa_data.start_date,
            end_date=wa_data.end_date,
            completed=False
        )
        db.add(weekly)
        created_weekly.append(weekly)
    
    if data.daily_actions:
        for da_data in data.daily_actions:
            daily = DailyAction(
                id=str(uuid.uuid4()),
                weekly_action_id=da_data.weekly_action_id,
                monthly_goal_id=da_data.monthly_goal_id,
                title=da_data.title,
                description=da_data.description,
                date=da_data.date,
                completed=False
            )
            db.add(daily)
            created_daily.append(daily)
    
    await db.commit()
    for wa in created_weekly:
        await db.refresh(wa)
    for da in created_daily:
        await db.refresh(da)
    
    return {
        "weekly_actions": created_weekly,
        "daily_actions": created_daily
    }


@router.post("/weekly-actions")
async def create_weekly_action(data: WeeklyActionCreate, db: AsyncSession = Depends(get_db)):
    weekly = WeeklyAction(
        id=str(uuid.uuid4()),
        monthly_goal_id=data.monthly_goal_id,
        title=data.title,
        description=data.description,
        week_number=str(data.week_number),
        start_date=data.start_date,
        end_date=data.end_date,
        completed=False
    )
    db.add(weekly)
    await db.commit()
    await db.refresh(weekly)
    return weekly


@router.put("/weekly-actions/{action_id}")
async def update_weekly_action(action_id: str, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WeeklyAction).where(WeeklyAction.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(404, "周执行项不存在")
    
    if "title" in data:
        action.title = data["title"]
    if "description" in data:
        action.description = data["description"]
    if "completed" in data:
        action.completed = data["completed"]
    
    await db.commit()
    await db.refresh(action)
    return action


@router.delete("/weekly-actions/{action_id}")
async def delete_weekly_action(action_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(WeeklyAction).where(WeeklyAction.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(404, "周执行项不存在")
    
    daily_actions = list((await db.execute(select(DailyAction).where(DailyAction.weekly_action_id == action_id))).scalars().all())
    for da in daily_actions:
        await db.delete(da)
    
    await db.delete(action)
    await db.commit()
    return {"status": "success"}


@router.post("/daily-actions")
async def create_daily_action(data: DailyActionCreate, db: AsyncSession = Depends(get_db)):
    daily = DailyAction(
        id=str(uuid.uuid4()),
        weekly_action_id=data.weekly_action_id,
        monthly_goal_id=data.monthly_goal_id,
        title=data.title,
        description=data.description,
        date=data.date,
        completed=False
    )
    db.add(daily)
    await db.commit()
    await db.refresh(daily)
    return daily


@router.put("/daily-actions/{action_id}")
async def update_daily_action(action_id: str, data: dict, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DailyAction).where(DailyAction.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(404, "日执行项不存在")
    
    if "title" in data:
        action.title = data["title"]
    if "description" in data:
        action.description = data["description"]
    if "completed" in data:
        action.completed = data["completed"]
    if "schedule_id" in data:
        action.schedule_id = data["schedule_id"]
    
    await db.commit()
    await db.refresh(action)
    return action


@router.delete("/daily-actions/{action_id}")
async def delete_daily_action(action_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DailyAction).where(DailyAction.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(404, "日执行项不存在")
    
    await db.delete(action)
    await db.commit()
    return {"status": "success"}


@router.get("/progress/{goal_id}")
async def get_goal_progress(goal_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MonthlyGoal).where(MonthlyGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(404, "月度目标不存在")
    
    weekly_result = await db.execute(
        select(WeeklyAction).where(WeeklyAction.monthly_goal_id == goal_id)
        .order_by(WeeklyAction.week_number)
    )
    weekly_actions = list(weekly_result.scalars().all())
    
    total_weekly = len(weekly_actions)
    completed_weekly = sum(1 for wa in weekly_actions if wa.completed)
    
    weekly_breakdown = []
    total_daily = 0
    completed_daily = 0
    
    for wa in weekly_actions:
        daily_result = await db.execute(
            select(DailyAction).where(DailyAction.weekly_action_id == wa.id)
        )
        daily_actions = list(daily_result.scalars().all())
        
        wa_total = len(daily_actions)
        wa_completed = sum(1 for da in daily_actions if da.completed)
        wa_progress = round((wa_completed / wa_total * 100), 1) if wa_total > 0 else (100 if wa.completed else 0)
        
        weekly_breakdown.append({
            "week_number": int(wa.week_number),
            "total": wa_total,
            "completed": wa_completed,
            "progress": wa_progress
        })
        
        total_daily += wa_total
        completed_daily += wa_completed
    
    overall_progress = 0
    if total_weekly > 0:
        weekly_progress = (completed_weekly / total_weekly) * 100
        daily_progress = (completed_daily / total_daily) * 100 if total_daily > 0 else weekly_progress
        overall_progress = round((weekly_progress + daily_progress) / 2, 1)
    
    goal.progress = str(overall_progress)
    await db.commit()
    
    return {
        "goal_id": goal_id,
        "goal_title": goal.title,
        "total_weekly_actions": total_weekly,
        "completed_weekly_actions": completed_weekly,
        "total_daily_actions": total_daily,
        "completed_daily_actions": completed_daily,
        "overall_progress": overall_progress,
        "weekly_breakdown": weekly_breakdown
    }


@router.get("/progress/month/{month}")
async def get_month_progress(month: str, db: AsyncSession = Depends(get_db)):
    goals_result = await db.execute(
        select(MonthlyGoal).where(MonthlyGoal.month == month)
    )
    goals = list(goals_result.scalars().all())
    
    progress_list = []
    for goal in goals:
        progress = await get_goal_progress(goal.id, db)
        progress_list.append(progress)
    
    total_goals = len(progress_list)
    avg_progress = round(
        sum(p["overall_progress"] for p in progress_list) / total_goals, 1
    ) if total_goals > 0 else 0
    
    return {
        "month": month,
        "total_goals": total_goals,
        "average_progress": avg_progress,
        "goals": progress_list
    }


@router.get("/daily/{date}")
async def get_daily_actions(date: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DailyAction).where(DailyAction.date == date)
        .order_by(DailyAction.created_at)
    )
    actions = list(result.scalars().all())
    
    actions_with_goals = []
    for action in actions:
        goal_result = await db.execute(
            select(MonthlyGoal).where(MonthlyGoal.id == action.monthly_goal_id)
        )
        goal = goal_result.scalar_one_or_none()
        
        weekly_result = await db.execute(
            select(WeeklyAction).where(WeeklyAction.id == action.weekly_action_id)
        )
        weekly = weekly_result.scalar_one_or_none()
        
        actions_with_goals.append({
            **action.__dict__,
            "goal_title": goal.title if goal else "",
            "goal_category": goal.category if goal else "",
            "weekly_title": weekly.title if weekly else ""
        })
    
    return actions_with_goals
