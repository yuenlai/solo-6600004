import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from ..core.database import get_db
from ..models.schedule import HabitChallenge, HabitChallengeRecord, Habit

router = APIRouter(prefix="/challenges", tags=["challenges"])

class ChallengeCreate(BaseModel):
    habitId: str
    name: str
    targetDays: int
    startDate: str
    description: str = ""

class ChallengeRecordCreate(BaseModel):
    date: str
    habitValue: int = 1

@router.get("")
async def list_challenges(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(HabitChallenge).order_by(HabitChallenge.created_at.desc())
    )
    challenges = result.scalars().all()
    
    challenge_list = []
    for c in challenges:
        records_result = await db.execute(
            select(HabitChallengeRecord).where(
                HabitChallengeRecord.challenge_id == c.id
            ).order_by(HabitChallengeRecord.date)
        )
        records = records_result.scalars().all()
        
        challenge_list.append({
            "id": c.id,
            "habitId": c.habit_id,
            "name": c.name,
            "targetDays": int(c.target_days),
            "startDate": c.start_date,
            "endDate": c.end_date,
            "description": c.description,
            "status": c.status,
            "records": [
                {
                    "id": r.id,
                    "challengeId": r.challenge_id,
                    "date": r.date,
                    "completed": r.completed,
                    "habitValue": int(r.habit_value)
                }
                for r in records
            ]
        })
    
    return challenge_list

@router.post("")
async def create_challenge(data: ChallengeCreate, db: AsyncSession = Depends(get_db)):
    habit = await db.get(Habit, data.habitId)
    if not habit:
        raise HTTPException(404, "Habit not found")
    
    start_date = data.startDate
    end_date_obj = datetime.strptime(start_date, "%Y-%m-%d") + timedelta(days=data.targetDays - 1)
    end_date = end_date_obj.strftime("%Y-%m-%d")
    
    c = HabitChallenge(
        id=str(uuid.uuid4()),
        habit_id=data.habitId,
        name=data.name,
        target_days=str(data.targetDays),
        start_date=start_date,
        end_date=end_date,
        description=data.description,
        status="active"
    )
    db.add(c)
    await db.commit()
    await db.refresh(c)
    
    return {
        "id": c.id,
        "habitId": c.habit_id,
        "name": c.name,
        "targetDays": int(c.target_days),
        "startDate": c.start_date,
        "endDate": c.end_date,
        "description": c.description,
        "status": c.status,
        "records": []
    }

@router.post("/{cid}/record")
async def record_challenge(cid: str, data: ChallengeRecordCreate, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(HabitChallenge, cid)
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    
    today = datetime.now().strftime("%Y-%m-%d")
    
    if challenge.status != "active":
        raise HTTPException(400, f"Challenge is {challenge.status}, cannot record")
    
    if data.date != today:
        raise HTTPException(400, f"Can only record for today ({today}), not {data.date}")
    
    if today < challenge.start_date or today > challenge.end_date:
        raise HTTPException(400, f"Challenge period: {challenge.start_date} to {challenge.end_date}, today is {today}")
    
    existing_result = await db.execute(
        select(HabitChallengeRecord).where(
            HabitChallengeRecord.challenge_id == cid,
            HabitChallengeRecord.date == data.date
        )
    )
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        existing.habit_value = str(data.habitValue)
        existing.completed = True
        await db.commit()
        await db.refresh(existing)
        record = existing
    else:
        record = HabitChallengeRecord(
            id=str(uuid.uuid4()),
            challenge_id=cid,
            date=data.date,
            habit_value=str(data.habitValue),
            completed=True
        )
        db.add(record)
        await db.commit()
        await db.refresh(record)
    
    records_result = await db.execute(
        select(HabitChallengeRecord).where(
            HabitChallengeRecord.challenge_id == cid,
            HabitChallengeRecord.completed == True
        )
    )
    completed_days = len(records_result.scalars().all())
    target_days = int(challenge.target_days)
    
    if challenge.status == "active":
        if completed_days >= target_days:
            challenge.status = "completed"
            await db.commit()
        elif today > challenge.end_date:
            challenge.status = "failed"
            await db.commit()
    
    return {
        "id": record.id,
        "challengeId": record.challenge_id,
        "date": record.date,
        "completed": record.completed,
        "habitValue": int(record.habit_value),
        "challengeStatus": challenge.status,
        "completedDays": completed_days
    }

@router.put("/{cid}/status")
async def update_challenge_status(cid: str, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(HabitChallenge, cid)
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    
    records_result = await db.execute(
        select(HabitChallengeRecord).where(
            HabitChallengeRecord.challenge_id == cid,
            HabitChallengeRecord.completed == True
        )
    )
    completed_days = len(records_result.scalars().all())
    target_days = int(challenge.target_days)
    
    today = datetime.now().strftime("%Y-%m-%d")
    if completed_days >= target_days:
        challenge.status = "completed"
    elif today > challenge.end_date:
        challenge.status = "failed"
    
    await db.commit()
    
    return {"status": challenge.status, "completedDays": completed_days}

@router.delete("/{cid}")
async def delete_challenge(cid: str, db: AsyncSession = Depends(get_db)):
    challenge = await db.get(HabitChallenge, cid)
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    
    records_result = await db.execute(
        select(HabitChallengeRecord).where(HabitChallengeRecord.challenge_id == cid)
    )
    records = records_result.scalars().all()
    for r in records:
        await db.delete(r)
    
    await db.delete(challenge)
    await db.commit()
    
    return {"message": "deleted"}
