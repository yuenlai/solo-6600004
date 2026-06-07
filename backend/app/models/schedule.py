from sqlalchemy import Column, String, Text, DateTime, Boolean, JSON, Enum as SAEnum
from sqlalchemy.sql import func
from ..core.database import Base
import enum

class Priority(str, enum.Enum):
    low = "low"; medium = "medium"; high = "high"

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
    interrupted = Column(Boolean, default=False)

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


class MonthlyGoal(Base):
    __tablename__ = "monthly_goals"
    id = Column(String, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    month = Column(String(7), nullable=False)
    category = Column(String(50), default="工作")
    priority = Column(String(10), default="medium")
    status = Column(String(20), default="active")
    progress = Column(String(10), default="0")
    created_at = Column(DateTime, server_default=func.now())


class WeeklyAction(Base):
    __tablename__ = "weekly_actions"
    id = Column(String, primary_key=True)
    monthly_goal_id = Column(String, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    week_number = Column(String(2), nullable=False)
    start_date = Column(String(10), nullable=False)
    end_date = Column(String(10), nullable=False)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class DailyAction(Base):
    __tablename__ = "daily_actions"
    id = Column(String, primary_key=True)
    weekly_action_id = Column(String, nullable=False)
    monthly_goal_id = Column(String, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    date = Column(String(10), nullable=False)
    schedule_id = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class ExceptionDay(Base):
    __tablename__ = "exception_days"
    id = Column(String, primary_key=True)
    date = Column(String(10), nullable=False, unique=True)
    type = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    rule = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())


class ShareStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class ScheduleShare(Base):
    __tablename__ = "schedule_shares"
    id = Column(String, primary_key=True)
    schedule_id = Column(String, nullable=False)
    owner_name = Column(String(100), nullable=False)
    shared_with = Column(String(100), nullable=False)
    share_token = Column(String(100), unique=True, nullable=False)
    status = Column(String(20), default="pending")
    message = Column(Text, default="")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


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
    share_id = Column(String, nullable=True)
    shared_from = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class MicroTask(Base):
    __tablename__ = "micro_tasks"
    id = Column(String, primary_key=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, default="")
    duration_minutes = Column(String(10), nullable=False)
    category = Column(String(50), default="学习")
    icon = Column(String(10), default="📌")
    priority = Column(String(10), default="medium")
    is_habit = Column(Boolean, default=False)
    habit_id = Column(String, nullable=True)
    color = Column(String(20), default="#4caf50")
    created_at = Column(DateTime, server_default=func.now())
