import uuid
import hashlib
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from pydantic import BaseModel
from typing import Optional, List
from ..core.database import get_db
from ..models.schedule import ScheduleShare, Schedule

router = APIRouter(prefix="/schedule-shares", tags=["schedule-shares"])


class CreateShareRequest(BaseModel):
    schedule_id: str
    owner_name: str
    shared_with: str
    message: Optional[str] = ""


class ShareActionRequest(BaseModel):
    token: str
    shared_with: str


class ShareResponse(BaseModel):
    id: str
    schedule_id: str
    owner_name: str
    shared_with: str
    share_token: str
    status: str
    message: str
    created_at: str
    updated_at: str
    schedule: Optional[dict] = None


def _generate_share_token(schedule_id: str, owner_name: str, shared_with: str) -> str:
    raw = f"{schedule_id}:{owner_name}:{shared_with}:{uuid.uuid4().hex}"
    return hashlib.sha256(raw.encode()).hexdigest()[:20]


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
        "shared_from": s.shared_from,
    }


def _share_to_dict(share: ScheduleShare, schedule: Optional[Schedule] = None) -> dict:
    result = {
        "id": share.id,
        "schedule_id": share.schedule_id,
        "owner_name": share.owner_name,
        "shared_with": share.shared_with,
        "share_token": share.share_token,
        "status": share.status,
        "message": share.message,
        "created_at": share.created_at.isoformat() if isinstance(share.created_at, datetime) else share.created_at,
        "updated_at": share.updated_at.isoformat() if isinstance(share.updated_at, datetime) else share.updated_at,
    }
    if schedule:
        result["schedule"] = _schedule_to_dict(schedule)
    return result


@router.post("")
async def create_share(data: CreateShareRequest, db: AsyncSession = Depends(get_db)):
    schedule = await db.get(Schedule, data.schedule_id)
    if not schedule:
        raise HTTPException(404, "日程不存在")

    existing = await db.execute(
        select(ScheduleShare).where(
            and_(
                ScheduleShare.schedule_id == data.schedule_id,
                ScheduleShare.owner_name == data.owner_name,
                ScheduleShare.shared_with == data.shared_with,
                ScheduleShare.status == "pending"
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, "已向该用户发起过分享邀请，等待确认中")

    token = _generate_share_token(data.schedule_id, data.owner_name, data.shared_with)

    share = ScheduleShare(
        id=str(uuid.uuid4()),
        schedule_id=data.schedule_id,
        owner_name=data.owner_name,
        shared_with=data.shared_with,
        share_token=token,
        status="pending",
        message=data.message
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)

    return _share_to_dict(share, schedule)


@router.post("/accept")
async def accept_share(data: ShareActionRequest, db: AsyncSession = Depends(get_db)):
    share = await db.execute(
        select(ScheduleShare).where(ScheduleShare.share_token == data.token)
    )
    share = share.scalar_one_or_none()

    if not share:
        raise HTTPException(404, "分享链接无效或已过期")

    if share.status != "pending":
        raise HTTPException(400, f"该分享已被{share.status}")

    if share.shared_with != data.shared_with:
        raise HTTPException(400, "该分享不是发给你的")

    original_schedule = await db.get(Schedule, share.schedule_id)
    if not original_schedule:
        share.status = "rejected"
        await db.commit()
        raise HTTPException(404, "原日程已被删除，分享失效")

    new_schedule = Schedule(
        id=str(uuid.uuid4()),
        title=original_schedule.title,
        description=original_schedule.description,
        start_time=original_schedule.start_time,
        end_time=original_schedule.end_time,
        priority=original_schedule.priority,
        category=original_schedule.category,
        completed=original_schedule.completed,
        recurring=original_schedule.recurring,
        share_id=share.id,
        shared_from=share.owner_name
    )
    db.add(new_schedule)

    share.status = "accepted"
    share.updated_at = datetime.now()
    await db.commit()
    await db.refresh(share)
    await db.refresh(new_schedule)

    return {
        "message": "已接受分享，日程已同步到您的计划中",
        "share": _share_to_dict(share, new_schedule)
    }


@router.post("/reject")
async def reject_share(data: ShareActionRequest, db: AsyncSession = Depends(get_db)):
    share = await db.execute(
        select(ScheduleShare).where(ScheduleShare.share_token == data.token)
    )
    share = share.scalar_one_or_none()

    if not share:
        raise HTTPException(404, "分享链接无效或已过期")

    if share.status != "pending":
        raise HTTPException(400, f"该分享已被{share.status}")

    if share.shared_with != data.shared_with:
        raise HTTPException(400, "该分享不是发给你的")

    share.status = "rejected"
    share.updated_at = datetime.now()
    await db.commit()
    await db.refresh(share)

    return {
        "message": "已拒绝分享",
        "share": _share_to_dict(share)
    }


@router.get("/outgoing")
async def get_outgoing_shares(owner_name: str, db: AsyncSession = Depends(get_db)):
    q = select(ScheduleShare).where(ScheduleShare.owner_name == owner_name).order_by(ScheduleShare.created_at.desc())
    result = await db.execute(q)
    shares = result.scalars().all()

    shares_with_schedules = []
    for share in shares:
        schedule = await db.get(Schedule, share.schedule_id)
        shares_with_schedules.append(_share_to_dict(share, schedule))

    return {"count": len(shares_with_schedules), "shares": shares_with_schedules}


@router.get("/incoming")
async def get_incoming_shares(shared_with: str, db: AsyncSession = Depends(get_db)):
    q = select(ScheduleShare).where(
        and_(
            ScheduleShare.shared_with == shared_with,
            ScheduleShare.status == "pending"
        )
    ).order_by(ScheduleShare.created_at.desc())
    result = await db.execute(q)
    shares = result.scalars().all()

    shares_with_schedules = []
    for share in shares:
        schedule = await db.get(Schedule, share.schedule_id)
        shares_with_schedules.append(_share_to_dict(share, schedule))

    return {"count": len(shares_with_schedules), "shares": shares_with_schedules}


@router.get("/accepted")
async def get_accepted_shares(
    user_name: str,
    db: AsyncSession = Depends(get_db)
):
    q = select(ScheduleShare).where(
        and_(
            ScheduleShare.status == "accepted",
            or_(
                ScheduleShare.owner_name == user_name,
                ScheduleShare.shared_with == user_name
            )
        )
    ).order_by(ScheduleShare.updated_at.desc())
    result = await db.execute(q)
    shares = result.scalars().all()

    shares_with_schedules = []
    for share in shares:
        schedule = await db.get(Schedule, share.schedule_id)
        shares_with_schedules.append(_share_to_dict(share, schedule))

    return {"count": len(shares_with_schedules), "shares": shares_with_schedules}


@router.get("/sync")
async def sync_shared_schedules(user_name: str, db: AsyncSession = Depends(get_db)):
    accepted_shares_q = select(ScheduleShare).where(
        and_(
            ScheduleShare.status == "accepted",
            ScheduleShare.shared_with == user_name
        )
    )
    result = await db.execute(accepted_shares_q)
    accepted_shares = result.scalars().all()

    updated_count = 0
    for share in accepted_shares:
        original = await db.get(Schedule, share.schedule_id)
        if not original:
            continue

        copies_q = select(Schedule).where(
            and_(
                Schedule.share_id == share.id,
                Schedule.shared_from == share.owner_name
            )
        )
        copies_result = await db.execute(copies_q)
        copies = copies_result.scalars().all()

        for copy in copies:
            copy.title = original.title
            copy.description = original.description
            copy.start_time = original.start_time
            copy.end_time = original.end_time
            copy.priority = original.priority
            copy.category = original.category
            copy.recurring = original.recurring
            updated_count += 1

    if updated_count > 0:
        await db.commit()

    q = select(Schedule).where(
        and_(
            Schedule.shared_from.isnot(None),
            Schedule.shared_from != ""
        )
    )
    result = await db.execute(q)
    shared_schedules = result.scalars().all()

    return {
        "updated_count": updated_count,
        "shared_schedules": [_schedule_to_dict(s) for s in shared_schedules]
    }


@router.delete("/{share_id}")
async def cancel_share(share_id: str, owner_name: str, db: AsyncSession = Depends(get_db)):
    share = await db.get(ScheduleShare, share_id)
    if not share:
        raise HTTPException(404, "分享不存在")

    if share.owner_name != owner_name:
        raise HTTPException(403, "无权取消他人的分享")

    if share.status == "accepted":
        copies_q = select(Schedule).where(Schedule.share_id == share_id)
        copies_result = await db.execute(copies_q)
        copies = copies_result.scalars().all()
        for copy in copies:
            copy.shared_from = None
            copy.share_id = None
        await db.delete(share)
        await db.commit()
        return {"message": "已取消分享，对方的日程副本已解除关联"}

    await db.delete(share)
    await db.commit()
    return {"message": "已取消分享邀请"}


@router.get("/token/{token}")
async def get_share_by_token(token: str, db: AsyncSession = Depends(get_db)):
    share = await db.execute(
        select(ScheduleShare).where(ScheduleShare.share_token == token)
    )
    share = share.scalar_one_or_none()

    if not share:
        raise HTTPException(404, "分享链接无效或已过期")

    schedule = await db.get(Schedule, share.schedule_id)
    return _share_to_dict(share, schedule)
