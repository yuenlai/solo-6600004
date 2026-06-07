from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import init_db
from .api.schedules import router as schedules_router
from .api.habits import router as habits_router
from .api.challenges import router as challenges_router
from .api.daily_plans import router as daily_plans_router

app = FastAPI(title="Smart Schedule Planner API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(schedules_router, prefix="/api")
app.include_router(habits_router, prefix="/api")
app.include_router(challenges_router, prefix="/api")
app.include_router(daily_plans_router, prefix="/api")

@app.on_event("startup")
async def startup(): await init_db()

@app.get("/api/health")
async def health(): return {"status": "ok", "service": "Smart Schedule Planner"}
