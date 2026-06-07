import uuid
from datetime import datetime, timedelta, time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional, List
from ..core.database import get_db
from ..models.schedule import Schedule, MicroTask

router = APIRouter(prefix="/fragment-time", tags=["fragment-time"])


class MicroTaskCreate(BaseModel):
    title: str
    description: str = ""
    duration_minutes: int
    category: str = "学习"
    icon: str = "📌"
    priority: str = "medium"
    is_habit: bool = False
    habit_id: Optional[str] = None
    color: str = "#4caf50"


class MicroTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    category: Optional[str] = None
    icon: Optional[str] = None
    priority: Optional[str] = None
    is_habit: Optional[bool] = None
    habit_id: Optional[str] = None
    color: Optional[str] = None


class FragmentTimeSlot(BaseModel):
    date: str
    start_time: str
    end_time: str
    duration_minutes: int
    before_schedule: Optional[dict] = None
    after_schedule: Optional[dict] = None


class FragmentRecommendationRequest(BaseModel):
    date: Optional[str] = None
    max_duration: int = 60
    min_duration: int = 5
    max_recommendations: int = 5


class FragmentRecommendation(BaseModel):
    slot: FragmentTimeSlot
    suggestions: List[dict]
    reason: str


class ConfirmFragmentTask(BaseModel):
    micro_task_id: str
    start_time: str
    end_time: str
    date: str


def _schedule_to_dict(s: Schedule) -> dict:
    return {
        "id": s.id,
        "title": s.title,
        "description": s.description,
        "start_time": s.start_time.isoformat() if isinstance(s.start_time, datetime) else s.start_time,
        "end_time": s.end_time.isoformat() if isinstance(s.end_time, datetime) else s.end_time,
        "priority": s.priority,
        "category": s.category,
        "completed": s.completed,
    }


def _micro_task_to_dict(m: MicroTask) -> dict:
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "durationMinutes": int(m.duration_minutes),
        "category": m.category,
        "icon": m.icon,
        "priority": m.priority,
        "isHabit": m.is_habit,
        "habitId": m.habit_id,
        "color": m.color,
    }


async def _init_default_micro_tasks(db: AsyncSession):
    result = await db.execute(select(MicroTask))
    existing = result.scalars().all()
    if existing:
        return

    default_tasks = [
        MicroTask(
            id=str(uuid.uuid4()),
            title="快速阅读",
            description="阅读一篇文章或几页书",
            duration_minutes="15",
            category="学习",
            icon="📚",
            priority="medium",
            is_habit=False,
            color="#2196f3",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="伸展运动",
            description="简单的身体拉伸，缓解疲劳",
            duration_minutes="10",
            category="健康",
            icon="🧘",
            priority="high",
            is_habit=False,
            color="#4caf50",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="冥想放松",
            description="深呼吸，静心冥想",
            duration_minutes="5",
            category="健康",
            icon="🧘‍♂️",
            priority="medium",
            is_habit=False,
            color="#9c27b0",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="回复消息",
            description="处理待回复的消息和邮件",
            duration_minutes="10",
            category="工作",
            icon="💬",
            priority="high",
            is_habit=False,
            color="#ff9800",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="整理桌面",
            description="整理工作环境，保持整洁",
            duration_minutes="5",
            category="生活",
            icon="🗂️",
            priority="low",
            is_habit=False,
            color="#795548",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="喝一杯水",
            description="补充水分，保持健康",
            duration_minutes="2",
            category="健康",
            icon="💧",
            priority="high",
            is_habit=True,
            color="#03a9f4",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="眼保健操",
            description="放松眼睛，预防近视",
            duration_minutes="5",
            category="健康",
            icon="👀",
            priority="medium",
            is_habit=False,
            color="#8bc34a",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="记录灵感",
            description="把想法和灵感记录下来",
            duration_minutes="5",
            category="学习",
            icon="💡",
            priority="medium",
            is_habit=False,
            color="#ffeb3b",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="听一首轻音乐",
            description="放松心情，缓解压力",
            duration_minutes="5",
            category="娱乐",
            icon="🎵",
            priority="low",
            is_habit=False,
            color="#e91e63",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="站立活动",
            description="站起来走一走，活动筋骨",
            duration_minutes="5",
            category="健康",
            icon="🚶",
            priority="high",
            is_habit=True,
            color="#00bcd4",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="快速整理思绪",
            description="列一个待办清单，理清思路",
            duration_minutes="10",
            category="工作",
            icon="📝",
            priority="medium",
            is_habit=False,
            color="#ff5722",
        ),
        MicroTask(
            id=str(uuid.uuid4()),
            title="学习一个新单词",
            description="扩展词汇量",
            duration_minutes="3",
            category="学习",
            icon="📖",
            priority="low",
            is_habit=True,
            color="#673ab7",
        ),
    ]

    for task in default_tasks:
        db.add(task)
    await db.commit()


async def _find_fragment_slots(
    db: AsyncSession,
    date: str,
    min_duration: int,
    max_duration: int,
) -> List[FragmentTimeSlot]:
    target_date = datetime.strptime(date, "%Y-%m-%d")
    day_start = datetime.combine(target_date.date(), time(7, 0))
    day_end = datetime.combine(target_date.date(), time(23, 0))

    q = select(Schedule).where(
        and_(
            Schedule.start_time >= day_start,
            Schedule.end_time <= day_end,
            Schedule.completed == False,
        )
    ).order_by(Schedule.start_time)

    result = await db.execute(q)
    schedules = list(result.scalars().all())

    slots: List[FragmentTimeSlot] = []

    if not schedules:
        return slots

    for i in range(len(schedules) + 1):
        if i == 0:
            slot_start = day_start
            slot_end = schedules[i].start_time
            before_sched = None
            after_sched = schedules[i]
        elif i == len(schedules):
            slot_start = schedules[i - 1].end_time
            slot_end = day_end
            before_sched = schedules[i - 1]
            after_sched = None
        else:
            slot_start = schedules[i - 1].end_time
            slot_end = schedules[i].start_time
            before_sched = schedules[i - 1]
            after_sched = schedules[i]

        duration = (slot_end - slot_start).total_seconds() / 60

        if min_duration <= duration <= max_duration:
            slots.append(
                FragmentTimeSlot(
                    date=date,
                    start_time=slot_start.isoformat(),
                    end_time=slot_end.isoformat(),
                    duration_minutes=int(duration),
                    before_schedule=_schedule_to_dict(before_sched) if before_sched else None,
                    after_schedule=_schedule_to_dict(after_sched) if after_sched else None,
                )
            )

    return slots


def _match_suggestions(
    slot: FragmentTimeSlot,
    micro_tasks: List[MicroTask],
    before_schedule: Optional[Schedule],
    after_schedule: Optional[Schedule],
) -> tuple[List[dict], str]:
    slot_duration = slot.duration_minutes

    suitable_tasks = [
        m for m in micro_tasks
        if int(m.duration_minutes) <= slot_duration
    ]

    if not suitable_tasks:
        return [], "没有找到合适的微任务"

    reason_parts = []
    scored_tasks = []

    for task in suitable_tasks:
        score = 0
        task_duration = int(task.duration_minutes)

        if task_duration <= slot_duration * 0.8:
            score += 30
            reason_parts.append("时长匹配度高")
        elif task_duration <= slot_duration * 0.9:
            score += 20
        else:
            score += 10

        if task.priority == "high":
            score += 30
        elif task.priority == "medium":
            score += 20
        else:
            score += 10

        if task.is_habit:
            score += 25
            reason_parts.append("培养好习惯")

        if after_schedule and after_schedule.category == "工作" and task.category == "健康":
            score += 20
            reason_parts.append("工作间隙需要放松")

        if before_schedule and before_schedule.category == "学习" and task.category == "健康":
            score += 20
            reason_parts.append("学习后需要休息")

        if after_schedule and after_schedule.priority == "high" and task.category == "健康":
            score += 25
            reason_parts.append("高压力任务前放松一下")

        scored_tasks.append((task, score))

    scored_tasks.sort(key=lambda x: x[1], reverse=True)

    suggestions = [
        _micro_task_to_dict(task)
        for task, _ in scored_tasks[:3]
    ]

    if not reason_parts:
        reason = "根据碎片时间智能推荐"
    else:
        reason = "、".join(list(set(reason_parts))[:3])

    return suggestions, reason


@router.get("/micro-tasks")
async def list_micro_tasks(db: AsyncSession = Depends(get_db)):
    await _init_default_micro_tasks(db)
    result = await db.execute(select(MicroTask).order_by(MicroTask.priority.desc()))
    tasks = result.scalars().all()
    return {
        "count": len(tasks),
        "tasks": [_micro_task_to_dict(t) for t in tasks],
    }


@router.post("/micro-tasks")
async def create_micro_task(data: MicroTaskCreate, db: AsyncSession = Depends(get_db)):
    task = MicroTask(
        id=str(uuid.uuid4()),
        title=data.title,
        description=data.description,
        duration_minutes=str(data.duration_minutes),
        category=data.category,
        icon=data.icon,
        priority=data.priority,
        is_habit=data.is_habit,
        habit_id=data.habit_id,
        color=data.color,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return _micro_task_to_dict(task)


@router.put("/micro-tasks/{task_id}")
async def update_micro_task(task_id: str, data: MicroTaskUpdate, db: AsyncSession = Depends(get_db)):
    task = await db.get(MicroTask, task_id)
    if not task:
        raise HTTPException(404, "微任务不存在")

    update_data = data.model_dump(exclude_unset=True)
    if "duration_minutes" in update_data:
        update_data["duration_minutes"] = str(update_data["duration_minutes"])

    for k, v in update_data.items():
        setattr(task, k, v)

    await db.commit()
    await db.refresh(task)
    return _micro_task_to_dict(task)


@router.delete("/micro-tasks/{task_id}")
async def delete_micro_task(task_id: str, db: AsyncSession = Depends(get_db)):
    task = await db.get(MicroTask, task_id)
    if not task:
        raise HTTPException(404, "微任务不存在")
    await db.delete(task)
    await db.commit()
    return {"message": "deleted"}


@router.post("/recommendations")
async def get_fragment_recommendations(
    data: FragmentRecommendationRequest,
    db: AsyncSession = Depends(get_db),
):
    await _init_default_micro_tasks(db)

    target_date = data.date or datetime.now().strftime("%Y-%m-%d")

    slots = await _find_fragment_slots(
        db=db,
        date=target_date,
        min_duration=data.min_duration,
        max_duration=data.max_duration,
    )

    if not slots:
        return {
            "date": target_date,
            "slots_found": 0,
            "recommendations": [],
            "message": "未发现碎片时间",
        }

    result = await db.execute(select(MicroTask))
    micro_tasks = list(result.scalars().all())

    recommendations: List[FragmentRecommendation] = []

    for slot in slots[: data.max_recommendations]:
        before_sched = None
        after_sched = None

        if slot.before_schedule:
            before_sched = Schedule(
                id=slot.before_schedule["id"],
                title=slot.before_schedule["title"],
                start_time=datetime.fromisoformat(slot.before_schedule["start_time"]),
                end_time=datetime.fromisoformat(slot.before_schedule["end_time"]),
                category=slot.before_schedule["category"],
                priority=slot.before_schedule["priority"],
            )

        if slot.after_schedule:
            after_sched = Schedule(
                id=slot.after_schedule["id"],
                title=slot.after_schedule["title"],
                start_time=datetime.fromisoformat(slot.after_schedule["start_time"]),
                end_time=datetime.fromisoformat(slot.after_schedule["end_time"]),
                category=slot.after_schedule["category"],
                priority=slot.after_schedule["priority"],
            )

        suggestions, reason = _match_suggestions(
            slot=slot,
            micro_tasks=micro_tasks,
            before_schedule=before_sched,
            after_schedule=after_sched,
        )

        if suggestions:
            recommendations.append(
                FragmentRecommendation(
                    slot=slot,
                    suggestions=suggestions,
                    reason=reason,
                )
            )

    return {
        "date": target_date,
        "slots_found": len(slots),
        "recommendations_count": len(recommendations),
        "recommendations": [r.model_dump() for r in recommendations],
    }


@router.post("/confirm")
async def confirm_fragment_task(
    data: ConfirmFragmentTask,
    db: AsyncSession = Depends(get_db),
):
    micro_task = await db.get(MicroTask, data.micro_task_id)
    if not micro_task:
        raise HTTPException(404, "微任务不存在")

    start_dt = datetime.fromisoformat(data.start_time)
    end_dt = datetime.fromisoformat(data.end_time)

    q = select(Schedule).where(
        and_(
            Schedule.start_time < end_dt,
            Schedule.end_time > start_dt,
            Schedule.completed == False,
        )
    )
    result = await db.execute(q)
    conflicts = list(result.scalars().all())

    if conflicts:
        conflict_titles = "、".join([c.title for c in conflicts])
        raise HTTPException(400, f"该时间段已有安排：{conflict_titles}")

    schedule = Schedule(
        id=str(uuid.uuid4()),
        title=micro_task.title,
        description=micro_task.description,
        start_time=start_dt,
        end_time=end_dt,
        priority=micro_task.priority,
        category=micro_task.category,
        completed=False,
    )
    db.add(schedule)
    await db.commit()
    await db.refresh(schedule)

    return {
        "message": "已添加到日程",
        "schedule": {
            "id": schedule.id,
            "title": schedule.title,
            "description": schedule.description,
            "start_time": schedule.start_time.isoformat(),
            "end_time": schedule.end_time.isoformat(),
            "priority": schedule.priority,
            "category": schedule.category,
            "completed": schedule.completed,
        },
        "micro_task": _micro_task_to_dict(micro_task),
    }
