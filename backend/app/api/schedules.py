import uuid
import re
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from ..core.database import get_db
from ..models.schedule import Schedule

router = APIRouter(prefix="/schedules", tags=["schedules"])

class ScheduleCreate(BaseModel):
    title: str; description: str = ""; start_time: str; end_time: str
    priority: str = "medium"; category: str = "工作"; recurring: Optional[str] = None

class BatchScheduleCreate(BaseModel):
    text: str
    date: Optional[str] = None

class ParsedSchedule(BaseModel):
    title: str; start_time: str; end_time: str
    priority: str = "medium"; category: str = "工作"; description: str = ""

class ScheduleUpdate(BaseModel):
    title: Optional[str] = None; completed: Optional[bool] = None

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

@router.post("/batch-parse")
async def batch_parse_schedules(data: BatchScheduleCreate, db: AsyncSession = Depends(get_db)):
    target_date = data.date or datetime.now().strftime("%Y-%m-%d")
    parsed = parse_natural_language(data.text, target_date)
    
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
