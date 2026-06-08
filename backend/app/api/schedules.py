import uuid
import re
from datetime import datetime, timedelta, time
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from pydantic import BaseModel
from typing import Optional, List, Tuple
from ..core.database import get_db
from ..models.schedule import Schedule

router = APIRouter(prefix="/schedules", tags=["schedules"])

class ScheduleCreate(BaseModel):
    title: str; description: str = ""; start_time: str; end_time: str
    priority: str = "medium"; category: str = "工作"; recurring: Optional[str] = None

class BatchScheduleCreate(BaseModel):
    text: str
    date: Optional[str] = None
    save: bool = True

class ParsedSchedule(BaseModel):
    title: str; start_time: str; end_time: str
    priority: str = "medium"; category: str = "工作"; description: str = ""

class ScheduleUpdate(BaseModel):
    title: Optional[str] = None; completed: Optional[bool] = None
    start_time: Optional[str] = None; end_time: Optional[str] = None
    priority: Optional[str] = None; category: Optional[str] = None

class ConflictCheckRequest(BaseModel):
    start_time: str
    end_time: str
    exclude_id: Optional[str] = None
    title: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None

class ConflictDetail(BaseModel):
    schedule_id: str
    title: str
    start_time: str
    end_time: str
    priority: str
    overlap_minutes: int
    overlap_type: str

class TimeAdjustmentSuggestion(BaseModel):
    suggestion_id: str
    title: str
    start_time: str
    end_time: str
    duration_minutes: int
    adjustment_type: str
    reason: str
    score: int

class ConflictInfo(BaseModel):
    has_conflict: bool
    conflicting_schedules: List[dict]
    message: str
    conflict_details: Optional[List[ConflictDetail]] = None
    affected_time_range: Optional[dict] = None
    suggestions: Optional[List[TimeAdjustmentSuggestion]] = None
    severity: Optional[str] = None

class RescheduleOption(BaseModel):
    option_id: str
    title: str
    start_time: str
    end_time: str
    duration_minutes: int
    score: int
    reason: str
    original_schedule: Optional[dict] = None

class RescheduleRequest(BaseModel):
    schedule_id: Optional[str] = None
    title: str
    preferred_start_time: Optional[str] = None
    duration_minutes: int
    priority: str = "medium"
    category: str = "工作"
    date: Optional[str] = None
    max_options: int = 5

class RescheduleConfirmRequest(BaseModel):
    schedule_id: str
    new_start_time: str
    new_end_time: str
    option_id: Optional[str] = None

def _parse_time_expression(time_str: str, base_date: str) -> Optional[datetime]:
    time_str = time_str.strip()
    base_dt = datetime.strptime(base_date, "%Y-%m-%d")

    time_map = {
        "凌晨": 0, "早上": 6, "早晨": 7, "上午": 9, "中午": 12,
        "下午": 14, "傍晚": 17, "晚上": 19, "晚间": 20, "夜里": 22, "深夜": 23
    }

    hour = 9
    minute = 0

    period_match = re.match(r'(凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|晚间|夜里|深夜)', time_str)
    if period_match:
        period = period_match.group(1)
        base_hour = time_map.get(period)
        remaining = time_str[len(period):].strip()

        num_match = re.match(r'(\d{1,2})[点时]\s*(\d{1,2})?分?', remaining)
        if num_match:
            h = int(num_match.group(1))
            if num_match.group(2):
                minute = int(num_match.group(2))
            if period in ["下午", "傍晚", "晚上", "晚间", "夜里", "深夜"] and h < 12:
                h += 12
            hour = h
        else:
            hour = base_hour

        half_match = re.search(r'半', remaining)
        if half_match:
            minute = 30
    else:
        colon_match = re.match(r'(\d{1,2}):(\d{2})', time_str)
        if colon_match:
            hour = int(colon_match.group(1))
            minute = int(colon_match.group(2))
        else:
            num_match = re.match(r'(\d{1,2})点', time_str)
            if num_match:
                hour = int(num_match.group(1))
                half_match = re.search(r'半', time_str)
                if half_match:
                    minute = 30

    return base_dt.replace(hour=hour, minute=minute, second=0, microsecond=0)

def _parse_schedule_line(line: str, base_date: str) -> Optional[ParsedSchedule]:
    line = line.strip()
    if not line:
        return None

    time_range_patterns = [
        r'(\d{1,2}:\d{2})\s*[-~到至]\s*(\d{1,2}:\d{2})',
        r'((?:凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|晚间|夜里|深夜)?\s*\d{1,2}[点时](?:\d{1,2}分?|半)?)\s*[-~到至]\s*((?:凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|晚间|夜里|深夜)?\s*\d{1,2}[点时](?:\d{1,2}分?|半)?)',
    ]

    single_time_patterns = [
        r'((?:凌晨|早上|早晨|上午|中午|下午|傍晚|晚上|晚间|夜里|深夜)\s*\d{1,2}[点时](?:\d{1,2}分?|半)?)',
        r'(\d{1,2}:\d{2})',
    ]

    start_dt = None
    end_dt = None
    title = line
    matched_range = None

    for pattern in time_range_patterns:
        match = re.search(pattern, line)
        if match:
            matched_range = match.group(0)
            groups = match.groups()
            start_str, end_str = groups[0], groups[1]
            start_dt = _parse_time_expression(start_str, base_date)
            end_dt = _parse_time_expression(end_str, base_date)
            break

    if not start_dt:
        for pattern in single_time_patterns:
            match = re.search(pattern, line)
            if match:
                matched_range = match.group(0)
                start_str = match.group(1) if match.lastindex else match.group(0)
                start_dt = _parse_time_expression(start_str, base_date)
                end_dt = start_dt + timedelta(hours=1)
                break

    if not start_dt:
        return None

    if end_dt and end_dt < start_dt:
        if end_dt.hour < 12:
            end_dt = end_dt.replace(hour=end_dt.hour + 12)

    if matched_range:
        title = line.replace(matched_range, "").strip(" ,，:：-")

    priority = "medium"
    category = "工作"

    if re.search(r'紧急|重要|高优|高优先级', line):
        priority = "high"
    elif re.search(r'低优|低优先级|不重要', line):
        priority = "low"

    cat_map = {
        "工作": "工作", "上班": "工作", "会议": "工作", "开会": "工作", "项目": "工作",
        "学习": "学习", "读书": "学习", "复习": "学习", "课程": "学习", "网课": "学习", "作业": "学习",
        "生活": "生活", "吃饭": "生活", "休息": "生活", "运动": "生活", "睡觉": "生活",
        "健身": "生活", "娱乐": "生活", "家庭": "生活", "买菜": "生活", "做饭": "生活",
    }
    for kw, cat in cat_map.items():
        if kw in line:
            category = cat
            break

    title = re.sub(r'[，,。.!！]', '', title).strip()
    title = re.sub(r'(紧急|重要|高优|高优先级|低优|低优先级|不重要)', '', title).strip()

    return ParsedSchedule(
        title=title or "未命名日程",
        start_time=start_dt.isoformat(),
        end_time=end_dt.isoformat(),
        priority=priority,
        category=category
    )

def parse_natural_language(text: str, date: str) -> List[ParsedSchedule]:
    lines = re.split(r'[\n;；。.!！]', text)
    schedules = []
    for line in lines:
        parsed = _parse_schedule_line(line, date)
        if parsed:
            schedules.append(parsed)
    return schedules

@router.get("")
async def list_schedules(
    date: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    q = select(Schedule).order_by(Schedule.start_time)
    if date:
        q = q.where(Schedule.start_time.contains(date))
    elif start_date and end_date:
        q = q.where(
            Schedule.start_time >= start_date,
            Schedule.start_time <= end_date + 'T23:59:59'
        )
    result = await db.execute(q)
    return result.scalars().all()

@router.post("")
async def create_schedule(data: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    s = Schedule(
        id=str(uuid.uuid4()),
        title=data.title,
        description=data.description,
        start_time=datetime.fromisoformat(data.start_time) if isinstance(data.start_time, str) else data.start_time,
        end_time=datetime.fromisoformat(data.end_time) if isinstance(data.end_time, str) else data.end_time,
        priority=data.priority,
        category=data.category,
        recurring=data.recurring
    )
    db.add(s); await db.commit(); await db.refresh(s)
    return s

@router.post("/parse")
async def parse_schedules(data: BatchScheduleCreate, db: AsyncSession = Depends(get_db)):
    target_date = data.date or datetime.now().strftime("%Y-%m-%d")
    parsed = parse_natural_language(data.text, target_date)
    
    return {
        "parsed_count": len(parsed),
        "schedules": [
            {
                "id": f"temp-{i}",
                "title": ps.title,
                "description": ps.description,
                "start_time": ps.start_time,
                "end_time": ps.end_time,
                "priority": ps.priority,
                "category": ps.category,
                "completed": False
            }
            for i, ps in enumerate(parsed)
        ]
    }

@router.post("/batch-parse")
async def batch_parse_schedules(data: BatchScheduleCreate, db: AsyncSession = Depends(get_db)):
    target_date = data.date or datetime.now().strftime("%Y-%m-%d")
    parsed = parse_natural_language(data.text, target_date)
    
    if not data.save:
        return {
            "parsed_count": len(parsed),
            "created_count": 0,
            "schedules": [
                {
                    "id": f"temp-{i}",
                    "title": ps.title,
                    "description": ps.description,
                    "start_time": ps.start_time,
                    "end_time": ps.end_time,
                    "priority": ps.priority,
                    "category": ps.category,
                    "completed": False
                }
                for i, ps in enumerate(parsed)
            ]
        }
    
    created = []
    for ps in parsed:
        s = Schedule(
            id=str(uuid.uuid4()),
            title=ps.title,
            description=ps.description,
            start_time=datetime.fromisoformat(ps.start_time),
            end_time=datetime.fromisoformat(ps.end_time),
            priority=ps.priority,
            category=ps.category
        )
        db.add(s)
        created.append(s)
    
    if created:
        await db.commit()
        for s in created:
            await db.refresh(s)
    
    return {
        "parsed_count": len(parsed),
        "created_count": len(created),
        "schedules": created
    }

@router.post("/batch-create")
async def batch_create_schedules(data: List[ScheduleCreate], db: AsyncSession = Depends(get_db)):
    created = []
    for sc in data:
        s = Schedule(
            id=str(uuid.uuid4()),
            title=sc.title,
            description=sc.description,
            start_time=datetime.fromisoformat(sc.start_time) if isinstance(sc.start_time, str) else sc.start_time,
            end_time=datetime.fromisoformat(sc.end_time) if isinstance(sc.end_time, str) else sc.end_time,
            priority=sc.priority,
            category=sc.category,
            recurring=sc.recurring
        )
        db.add(s)
        created.append(s)
    
    if created:
        await db.commit()
        for s in created:
            await db.refresh(s)
    
    return {
        "created_count": len(created),
        "schedules": created
    }

@router.put("/{sid}")
async def update_schedule(sid: str, data: ScheduleUpdate, db: AsyncSession = Depends(get_db)):
    s = await db.get(Schedule, sid)
    if not s: raise HTTPException(404, "Not found")
    update_data = data.model_dump(exclude_unset=True)
    if "start_time" in update_data and isinstance(update_data["start_time"], str):
        update_data["start_time"] = datetime.fromisoformat(update_data["start_time"])
    if "end_time" in update_data and isinstance(update_data["end_time"], str):
        update_data["end_time"] = datetime.fromisoformat(update_data["end_time"])
    for k, v in update_data.items(): setattr(s, k, v)
    await db.commit(); await db.refresh(s)
    return s

@router.delete("/{sid}")
async def delete_schedule(sid: str, db: AsyncSession = Depends(get_db)):
    s = await db.get(Schedule, sid)
    if not s: raise HTTPException(404, "Not found")
    await db.delete(s); await db.commit()
    return {"message": "deleted"}

async def _check_conflicts(
    db: AsyncSession,
    start_time: datetime,
    end_time: datetime,
    exclude_id: Optional[str] = None
) -> List[Schedule]:
    q = select(Schedule).where(
        and_(
            Schedule.start_time < end_time,
            Schedule.end_time > start_time,
            Schedule.completed == False
        )
    )
    if exclude_id:
        q = q.where(Schedule.id != exclude_id)
    result = await db.execute(q)
    return list(result.scalars().all())

def _parse_datetime(dt_str: str) -> datetime:
    try:
        return datetime.fromisoformat(dt_str)
    except ValueError:
        dt_str = dt_str.replace('Z', '+00:00')
        return datetime.fromisoformat(dt_str)

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
        "recurring": s.recurring,
        "share_id": s.share_id,
        "shared_from": s.shared_from
    }

def _score_time_slot(
    slot_start: datetime,
    duration: int,
    preferred_start: Optional[datetime],
    priority: str,
    existing_schedules: List[Schedule]
) -> Tuple[int, str]:
    score = 100
    reasons = []

    if preferred_start:
        time_diff = abs((slot_start - preferred_start).total_seconds() / 60)
        if time_diff <= 30:
            score += 30
            reasons.append("接近原定时间")
        elif time_diff <= 60:
            score += 15
            reasons.append("距离原定时间较近")
        elif time_diff <= 120:
            score += 5
        else:
            score -= int(time_diff / 30) * 5

    hour = slot_start.hour
    if 9 <= hour < 12:
        score += 20
        reasons.append("上午高效时段")
    elif 14 <= hour < 17:
        score += 15
        reasons.append("下午工作时段")
    elif 12 <= hour < 14:
        score -= 10
        reasons.append("午休时段")
    elif hour >= 22 or hour < 7:
        score -= 30
        reasons.append("非工作时间")

    if priority == "high":
        score += 25
    elif priority == "medium":
        score += 10

    gap_before = None
    gap_after = None
    slot_end = slot_start + timedelta(minutes=duration)
    
    for s in existing_schedules:
        s_start = s.start_time if isinstance(s.start_time, datetime) else _parse_datetime(s.start_time)
        s_end = s.end_time if isinstance(s.end_time, datetime) else _parse_datetime(s.end_time)
        
        if s_end <= slot_start:
            gap = (slot_start - s_end).total_seconds() / 60
            if gap_before is None or gap < gap_before:
                gap_before = gap
        elif s_start >= slot_end:
            gap = (s_start - slot_end).total_seconds() / 60
            if gap_after is None or gap < gap_after:
                gap_after = gap

    if gap_before is not None and gap_before < 15:
        score -= 10
        reasons.append("前序日程衔接较紧")
    elif gap_before is not None and gap_before >= 30:
        score += 5
        reasons.append("前序有充足准备时间")

    if gap_after is not None and gap_after < 15:
        score -= 10
        reasons.append("后序日程衔接较紧")
    elif gap_after is not None and gap_after >= 30:
        score += 5
        reasons.append("后序有充足缓冲时间")

    reason_str = "、".join(reasons) if reasons else "可用时段"
    return max(0, score), reason_str

async def _generate_reschedule_options(
    db: AsyncSession,
    title: str,
    preferred_start: Optional[datetime],
    duration_minutes: int,
    priority: str,
    category: str,
    target_date: datetime,
    max_options: int = 5,
    exclude_id: Optional[str] = None
) -> List[RescheduleOption]:
    day_start = datetime.combine(target_date.date(), time(7, 0))
    day_end = datetime.combine(target_date.date(), time(23, 0))
    duration = timedelta(minutes=duration_minutes)
    
    all_schedules_q = select(Schedule).where(
        and_(
            Schedule.start_time >= day_start - timedelta(hours=2),
            Schedule.end_time <= day_end + timedelta(hours=2),
            Schedule.completed == False
        )
    )
    if exclude_id:
        all_schedules_q = all_schedules_q.where(Schedule.id != exclude_id)
    result = await db.execute(all_schedules_q)
    all_schedules = list(result.scalars().all())
    
    busy_intervals: List[Tuple[datetime, datetime]] = []
    for s in all_schedules:
        s_start = s.start_time if isinstance(s.start_time, datetime) else _parse_datetime(s.start_time)
        s_end = s.end_time if isinstance(s.end_time, datetime) else _parse_datetime(s.end_time)
        busy_intervals.append((s_start, s_end))
    
    busy_intervals.sort()
    
    candidate_slots: List[Tuple[datetime, int, str]] = []
    
    current = day_start
    idx = 0
    while current + duration <= day_end:
        slot_end = current + duration
        is_free = True
        
        for (busy_start, busy_end) in busy_intervals:
            if current < busy_end and slot_end > busy_start:
                is_free = False
                current = busy_end + timedelta(minutes=5)
                break
        
        if is_free:
            score, reason = _score_time_slot(current, duration_minutes, preferred_start, priority, all_schedules)
            candidate_slots.append((current, score, reason))
            current += timedelta(minutes=15)
        else:
            if idx < len(busy_intervals):
                current = max(current, busy_intervals[idx][1] + timedelta(minutes=5))
                idx += 1
            else:
                current += timedelta(minutes=15)
    
    candidate_slots.sort(key=lambda x: x[1], reverse=True)
    
    options: List[RescheduleOption] = []
    for i, (slot_start, score, reason) in enumerate(candidate_slots[:max_options]):
        slot_end = slot_start + duration
        options.append(RescheduleOption(
            option_id=f"option-{i+1}",
            title=title,
            start_time=slot_start.isoformat(),
            end_time=slot_end.isoformat(),
            duration_minutes=duration_minutes,
            score=score,
            reason=reason
        ))
    
    return options

def _calculate_overlap(
    new_start: datetime,
    new_end: datetime,
    existing_start: datetime,
    existing_end: datetime
) -> Tuple[int, str]:
    overlap_start = max(new_start, existing_start)
    overlap_end = min(new_end, existing_end)
    overlap_minutes = int((overlap_end - overlap_start).total_seconds() / 60)
    
    if new_start >= existing_start and new_end <= existing_end:
        overlap_type = "full"
    elif new_start < existing_start and new_end > existing_end:
        overlap_type = "contains"
    elif new_start < existing_start:
        overlap_type = "partial_start"
    else:
        overlap_type = "partial_end"
    
    return overlap_minutes, overlap_type

def _generate_local_suggestions(
    new_start: datetime,
    new_end: datetime,
    conflicts: List[Schedule],
    duration: int,
    priority: str,
    title: str
) -> List[TimeAdjustmentSuggestion]:
    suggestions = []
    sorted_conflicts = sorted(conflicts, key=lambda s: s.start_time)
    
    earliest = min([s.start_time if isinstance(s.start_time, datetime) else _parse_datetime(s.start_time) for s in sorted_conflicts])
    latest = max([s.end_time if isinstance(s.end_time, datetime) else _parse_datetime(s.end_time) for s in sorted_conflicts])
    
    move_earlier_start = earliest - timedelta(minutes=duration) - timedelta(minutes=5)
    if move_earlier_start.hour >= 7:
        suggestions.append(TimeAdjustmentSuggestion(
            suggestion_id="move_earlier",
            title=title,
            start_time=move_earlier_start.isoformat(),
            end_time=(move_earlier_start + timedelta(minutes=duration)).isoformat(),
            duration_minutes=duration,
            adjustment_type="move_earlier",
            reason=f"提前到 {move_earlier_start.strftime('%H:%M')}，避开冲突",
            score=85 if priority == "high" else 75
        ))
    
    move_later_start = latest + timedelta(minutes=5)
    if move_later_start.hour < 22:
        suggestions.append(TimeAdjustmentSuggestion(
            suggestion_id="move_later",
            title=title,
            start_time=move_later_start.isoformat(),
            end_time=(move_later_start + timedelta(minutes=duration)).isoformat(),
            duration_minutes=duration,
            adjustment_type="move_later",
            reason=f"延后到 {move_later_start.strftime('%H:%M')}，避开冲突",
            score=80 if priority == "high" else 70
        ))
    
    if duration > 30:
        shorter_duration = max(15, duration - 15)
        suggestions.append(TimeAdjustmentSuggestion(
            suggestion_id="shorten",
            title=title,
            start_time=new_start.isoformat(),
            end_time=(new_start + timedelta(minutes=shorter_duration)).isoformat(),
            duration_minutes=shorter_duration,
            adjustment_type="shorten",
            reason=f"缩短时长到 {shorter_duration} 分钟，保留原时段",
            score=65
        ))
    
    return suggestions

@router.post("/check-conflict", response_model=ConflictInfo)
async def check_conflict(
    data: ConflictCheckRequest,
    db: AsyncSession = Depends(get_db)
):
    start_dt = _parse_datetime(data.start_time)
    end_dt = _parse_datetime(data.end_time)
    duration = int((end_dt - start_dt).total_seconds() / 60)
    
    conflicts = await _check_conflicts(db, start_dt, end_dt, data.exclude_id)
    
    if not conflicts:
        return ConflictInfo(
            has_conflict=False,
            conflicting_schedules=[],
            message="该时间段无冲突，可以安排",
            conflict_details=[],
            severity="low"
        )
    
    conflict_details_list = []
    total_overlap = 0
    affected_start = start_dt
    affected_end = end_dt
    
    for s in conflicts:
        s_start = s.start_time if isinstance(s.start_time, datetime) else _parse_datetime(s.start_time)
        s_end = s.end_time if isinstance(s.end_time, datetime) else _parse_datetime(s.end_time)
        overlap_minutes, overlap_type = _calculate_overlap(start_dt, end_dt, s_start, s_end)
        total_overlap += overlap_minutes
        affected_start = min(affected_start, s_start)
        affected_end = max(affected_end, s_end)
        
        conflict_details_list.append(ConflictDetail(
            schedule_id=s.id,
            title=s.title,
            start_time=s_start.isoformat(),
            end_time=s_end.isoformat(),
            priority=s.priority,
            overlap_minutes=overlap_minutes,
            overlap_type=overlap_type
        ))
    
    conflict_dicts = [_schedule_to_dict(s) for s in conflicts]
    conflict_titles = "、".join([s['title'] for s in conflict_dicts])
    
    severity = "high" if total_overlap >= 60 or len(conflicts) >= 2 else "medium"
    
    suggestions = _generate_local_suggestions(
        start_dt, end_dt, conflicts, duration,
        data.__dict__.get('priority', 'medium') if hasattr(data, 'priority') else 'medium',
        data.__dict__.get('title', '日程') if hasattr(data, 'title') else '日程'
    )
    
    if duration >= 30:
        try:
            target_date = start_dt
            ai_suggestions = await _generate_reschedule_options(
                db=db,
                title=data.__dict__.get('title', '日程') if hasattr(data, 'title') else '日程',
                preferred_start=start_dt,
                duration_minutes=duration,
                priority=data.__dict__.get('priority', 'medium') if hasattr(data, 'priority') else 'medium',
                category=data.__dict__.get('category', '工作') if hasattr(data, 'category') else '工作',
                target_date=target_date,
                max_options=2,
                exclude_id=data.exclude_id
            )
            
            for i, opt in enumerate(ai_suggestions):
                suggestions.append(TimeAdjustmentSuggestion(
                    suggestion_id=f"ai_suggestion_{i}",
                    title=opt.title,
                    start_time=opt.start_time,
                    end_time=opt.end_time,
                    duration_minutes=opt.duration_minutes,
                    adjustment_type="move_earlier" if opt.start_time < start_dt.isoformat() else "move_later",
                    reason=opt.reason,
                    score=opt.score
                ))
        except Exception as e:
            print(f"Failed to generate AI suggestions: {e}")
    
    suggestions.sort(key=lambda x: x.score, reverse=True)
    
    return ConflictInfo(
        has_conflict=True,
        conflicting_schedules=conflict_dicts,
        message=f"该时间段与以下日程冲突：{conflict_titles}",
        conflict_details=conflict_details_list,
        affected_time_range={
            "start": affected_start.isoformat(),
            "end": affected_end.isoformat(),
            "total_overlap_minutes": total_overlap
        },
        suggestions=suggestions[:5],
        severity=severity
    )

@router.post("/reschedule-options")
async def get_reschedule_options(
    data: RescheduleRequest,
    db: AsyncSession = Depends(get_db)
):
    target_date_str = data.date or datetime.now().strftime("%Y-%m-%d")
    target_date = datetime.strptime(target_date_str, "%Y-%m-%d")
    
    preferred_start = None
    if data.preferred_start_time:
        preferred_start = _parse_datetime(data.preferred_start_time)
        target_date = preferred_start
    
    original_schedule = None
    exclude_id = None
    if data.schedule_id:
        s = await db.get(Schedule, data.schedule_id)
        if s:
            original_schedule = _schedule_to_dict(s)
            exclude_id = s.id
            if not preferred_start:
                s_start = s.start_time if isinstance(s.start_time, datetime) else _parse_datetime(s.start_time)
                preferred_start = s_start
    
    options = await _generate_reschedule_options(
        db=db,
        title=data.title,
        preferred_start=preferred_start,
        duration_minutes=data.duration_minutes,
        priority=data.priority,
        category=data.category,
        target_date=target_date,
        max_options=data.max_options,
        exclude_id=exclude_id
    )
    
    return {
        "original_schedule": original_schedule,
        "options_count": len(options),
        "options": [opt.model_dump() for opt in options]
    }

@router.post("/confirm-reschedule")
async def confirm_reschedule(
    data: RescheduleConfirmRequest,
    db: AsyncSession = Depends(get_db)
):
    s = await db.get(Schedule, data.schedule_id)
    if not s:
        raise HTTPException(404, "日程不存在")
    
    new_start = _parse_datetime(data.new_start_time)
    new_end = _parse_datetime(data.new_end_time)
    
    conflicts = await _check_conflicts(db, new_start, new_end, data.schedule_id)
    if conflicts:
        conflict_titles = "、".join([c.title for c in conflicts])
        raise HTTPException(400, f"新时间段仍有冲突：{conflict_titles}")
    
    s.start_time = new_start
    s.end_time = new_end
    await db.commit()
    await db.refresh(s)
    
    return {
        "message": "改期成功",
        "schedule": _schedule_to_dict(s),
        "option_id": data.option_id
    }
