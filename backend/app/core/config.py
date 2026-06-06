import os
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://localhost:5432/schedule_planner")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
