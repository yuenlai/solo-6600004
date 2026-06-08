from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import init_db, async_session
from .api.schedules import router as schedules_router
from .api.habits import router as habits_router, deduplicate_habit_records
from .api.challenges import router as challenges_router
from .api.daily_plans import router as daily_plans_router
from .api.focus_sessions import router as focus_sessions_router
from .api.monthly_goals import router as monthly_goals_router
from .api.exception_days import router as exception_days_router
from .api.schedule_shares import router as schedule_shares_router
from .api.fragment_time import router as fragment_time_router
import logging

logger = logging.getLogger(__name__)

app = FastAPI(title="Smart Schedule Planner API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(schedules_router, prefix="/api")
app.include_router(habits_router, prefix="/api")
app.include_router(challenges_router, prefix="/api")
app.include_router(daily_plans_router, prefix="/api")
app.include_router(focus_sessions_router, prefix="/api")
app.include_router(monthly_goals_router, prefix="/api")
app.include_router(exception_days_router, prefix="/api")
app.include_router(schedule_shares_router, prefix="/api")
app.include_router(fragment_time_router, prefix="/api")

@app.on_event("startup")
async def startup(): 
    await init_db()
    try:
        async with async_session() as db:
            removed = await deduplicate_habit_records(db)
            if removed > 0:
                logger.info(f"Removed {removed} duplicate habit records on startup")
    except Exception as e:
        logger.warning(f"Deduplication skipped: {e}")

@app.get("/api/health")
async def health(): return {"status": "ok", "service": "Smart Schedule Planner"}
