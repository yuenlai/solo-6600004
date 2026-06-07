from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, Enum as SAEnum
from sqlalchemy.sql import func
from ..core.database import Base
import enum

class Priority(str, enum.Enum):
    low = "low"; medium = "medium"; high = "high"

class Schedule(Base):
    __tablename__ = "schedules"
    id = Column(String, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    priority = Column(String(10), default="medium")
    category = Column(String(100), default="工作")
    completed = Column(Boolean, default=False)
    recurring = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class Habit(Base):
    __tablename__ = "habits"
    id = Column(String, primary_key=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(10), default="🎯")
    color = Column(String(20), default="#4caf50")
    target = Column(String(10), default="1")
    unit = Column(String(20), default="次")
    current_streak = Column(String(10), default="0")
    reminder = Column(String(50), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

class HabitRecord(Base):
    __tablename__ = "habit_records"
    id = Column(String, primary_key=True)
    habit_id = Column(String, nullable=False)
    date = Column(String(10), nullable=False)
    value = Column(String(10), default="1")
    completed = Column(Boolean, default=False)

class FocusSession(Base):
    __tablename__ = "focus_sessions"
    id = Column(String, primary_key=True)
    duration = Column(String(10), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    schedule_id = Column(String, nullable=True)
    completed = Column(Boolean, default=False)

class HabitChallenge(Base):
    __tablename__ = "habit_challenges"
    id = Column(String, primary_key=True)
    habit_id = Column(String, nullable=False)
    name = Column(String(255), nullable=False)
    target_days = Column(String(10), nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    description = Column(Text, default="")
    status = Column(String(20), default="active")
    created_at = Column(DateTime, server_default=func.now())

class HabitChallengeRecord(Base):
    __tablename__ = "habit_challenge_records"
    id = Column(String, primary_key=True)
    challenge_id = Column(String, nullable=False)
    date = Column(String(10), nullable=False)
    completed = Column(Boolean, default=False)
    habit_value = Column(String(10), default="0")

class MorningPlan(Base):
    __tablename__ = "morning_plans"
    id = Column(String, primary_key=True)
    date = Column(String(10), nullable=False, unique=True)
    focus_items = Column(JSON, default=list)
    priorities = Column(JSON, default=list)
    schedule_ids = Column(JSON, default=list)
    note = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())

class EveningReview(Base):
    __tablename__ = "evening_reviews"
    id = Column(String, primary_key=True)
    date = Column(String(10), nullable=False, unique=True)
    completed_count = Column(String(10), default="0")
    total_count = Column(String(10), default="0")
    completion_rate = Column(String(10), default="0")
    highlights = Column(Text, default="")
    improvements = Column(Text, default="")
    summary = Column(Text, default="")
    mood = Column(String(20), default="neutral")
    created_at = Column(DateTime, server_default=func.now())
