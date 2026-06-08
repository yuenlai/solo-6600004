import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app.api.habits import recalculate_streak, parse_date, get_unique_completed_dates, calculate_current_streak, calculate_longest_streak
from app.models.schedule import HabitRecord
import unittest
from unittest.mock import AsyncMock, MagicMock, patch


def format_date(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def create_mock_records(dates, completed=True):
    records = []
    for i, date_str in enumerate(dates):
        r = HabitRecord()
        r.id = f"rec_{i}"
        r.habit_id = "test_habit"
        r.date = date_str
        r.value = "1"
        r.completed = completed
        records.append(r)
    return records


def mock_db_execute(records):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = records
    
    async def mock_execute(query):
        return mock_result
    
    return mock_execute


class TestRecalculateStreak(unittest.IsolatedAsyncioTestCase):
    
    async def test_no_records(self):
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute([])
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 0)
    
    async def test_today_only(self):
        today = format_date(datetime.now())
        records = create_mock_records([today])
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 1)
    
    async def test_yesterday_only(self):
        yesterday = format_date(datetime.now() - timedelta(days=1))
        records = create_mock_records([yesterday])
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 1)
    
    async def test_consecutive_days(self):
        today = datetime.now()
        dates = [format_date(today - timedelta(days=i)) for i in range(5)]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 5)
    
    async def test_consecutive_days_from_yesterday(self):
        today = datetime.now()
        dates = [format_date(today - timedelta(days=i)) for i in range(1, 6)]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 5)
    
    async def test_duplicate_dates(self):
        today = datetime.now()
        dates = []
        for i in range(3):
            date_str = format_date(today - timedelta(days=i))
            dates.extend([date_str, date_str])
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 3)
    
    async def test_gap_after_streak(self):
        today = datetime.now()
        dates = [
            format_date(today),
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=3)),
            format_date(today - timedelta(days=4)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 2)
    
    async def test_gap_from_yesterday(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=2)),
            format_date(today - timedelta(days=4)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 2)
    
    async def test_makeup_yesterday(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=2)),
            format_date(today - timedelta(days=3)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 3)
    
    async def test_makeup_after_gap(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=2)),
            format_date(today - timedelta(days=3)),
            format_date(today - timedelta(days=4)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 0)
    
    async def test_long_gap(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=10)),
            format_date(today - timedelta(days=11)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 0)
    
    async def test_single_old_record(self):
        today = datetime.now()
        dates = [format_date(today - timedelta(days=10))]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 0)
    
    async def test_non_completed_records_ignored(self):
        today = format_date(datetime.now())
        records = create_mock_records([today], completed=False)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute([])
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 0)
    
    async def test_mixed_completed(self):
        today = datetime.now()
        dates = [
            format_date(today),
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=2)),
        ]
        records = create_mock_records(dates)
        records[1].completed = False
        
        completed_records = [r for r in records if r.completed]
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(completed_records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 1)


class TestLongestStreak(unittest.TestCase):
    
    def calculate_longest_streak(self, date_strs):
        records = []
        for i, date_str in enumerate(date_strs):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test_habit"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        return calculate_longest_streak(unique_dates)
    
    def test_no_dates(self):
        self.assertEqual(self.calculate_longest_streak([]), 0)
    
    def test_single_date(self):
        self.assertEqual(self.calculate_longest_streak(["2026-06-01"]), 1)
    
    def test_consecutive_dates(self):
        dates = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"]
        self.assertEqual(self.calculate_longest_streak(dates), 5)
    
    def test_with_gap(self):
        dates = ["2026-06-01", "2026-06-02", "2026-06-04", "2026-06-05", "2026-06-06"]
        self.assertEqual(self.calculate_longest_streak(dates), 3)
    
    def test_multiple_streaks(self):
        dates = [
            "2026-06-01", "2026-06-02", "2026-06-03",
            "2026-06-05", "2026-06-06",
            "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11"
        ]
        self.assertEqual(self.calculate_longest_streak(dates), 4)
    
    def test_duplicate_dates(self):
        dates = ["2026-06-01", "2026-06-01", "2026-06-02", "2026-06-02", "2026-06-03"]
        self.assertEqual(self.calculate_longest_streak(dates), 3)
    
    def test_same_day_multiple(self):
        dates = ["2026-06-01", "2026-06-01", "2026-06-01"]
        self.assertEqual(self.calculate_longest_streak(dates), 1)
    
    def test_non_consecutive_with_longest_in_middle(self):
        dates = [
            "2026-06-01",
            "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06", "2026-06-07",
            "2026-06-09", "2026-06-10"
        ]
        self.assertEqual(self.calculate_longest_streak(dates), 5)
    
    def test_zero_day_gap(self):
        dates = ["2026-06-01", "2026-06-01", "2026-06-03"]
        self.assertEqual(self.calculate_longest_streak(dates), 1)


class TestEdgeScenarios(unittest.IsolatedAsyncioTestCase):
    
    async def test_exactly_two_days_ago(self):
        today = datetime.now()
        dates = [format_date(today - timedelta(days=2))]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 0)
    
    async def test_today_and_two_days_ago(self):
        today = datetime.now()
        dates = [
            format_date(today),
            format_date(today - timedelta(days=2)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 1)
    
    async def test_yesterday_and_two_days_ago(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=2)),
            format_date(today - timedelta(days=4)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 2)
    
    async def test_out_of_order_records(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=3)),
            format_date(today),
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=2)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 4)


class TestMakeupAndRecoveryScenarios(unittest.IsolatedAsyncioTestCase):
    
    async def test_makeup_yesterday_to_continue_streak(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=2)),
            format_date(today - timedelta(days=3)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 3)
    
    async def test_makeup_day_before_yesterday_without_today(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=2)),
            format_date(today - timedelta(days=3)),
            format_date(today - timedelta(days=4)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 0)
    
    async def test_makeup_yesterday_with_today(self):
        today = datetime.now()
        dates = [
            format_date(today),
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=2)),
            format_date(today - timedelta(days=3)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 4)
    
    async def test_recovery_after_long_gap(self):
        today = datetime.now()
        dates = [
            format_date(today),
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=10)),
            format_date(today - timedelta(days=11)),
            format_date(today - timedelta(days=12)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 2)
    
    async def test_recovery_with_yesterday_only(self):
        today = datetime.now()
        dates = [
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=10)),
            format_date(today - timedelta(days=11)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 1)
    
    async def test_duplicate_records_same_day(self):
        today = datetime.now()
        dates = [
            format_date(today),
            format_date(today),
            format_date(today),
            format_date(today - timedelta(days=1)),
            format_date(today - timedelta(days=1)),
        ]
        records = create_mock_records(dates)
        mock_db = AsyncMock()
        mock_db.execute = mock_db_execute(records)
        streak = await recalculate_streak("test_habit", mock_db)
        self.assertEqual(streak, 2)


class TestCalculateStreakFunctions(unittest.TestCase):
    
    def test_get_unique_completed_dates_basic(self):
        records = []
        dates = ["2026-06-01", "2026-06-02", "2026-06-03"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        result = get_unique_completed_dates(records)
        self.assertEqual(len(result), 3)
        self.assertEqual(result[0].strftime("%Y-%m-%d"), "2026-06-03")
        self.assertEqual(result[-1].strftime("%Y-%m-%d"), "2026-06-01")
    
    def test_get_unique_completed_dates_with_duplicates(self):
        records = []
        dates = ["2026-06-01", "2026-06-01", "2026-06-02", "2026-06-02", "2026-06-02"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        result = get_unique_completed_dates(records)
        self.assertEqual(len(result), 2)
    
    def test_get_unique_completed_dates_with_non_completed(self):
        records = []
        dates = ["2026-06-01", "2026-06-02", "2026-06-03"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = i != 1
            records.append(r)
        
        result = get_unique_completed_dates(records)
        self.assertEqual(len(result), 2)
        dates_in_result = [d.strftime("%Y-%m-%d") for d in result]
        self.assertIn("2026-06-01", dates_in_result)
        self.assertIn("2026-06-03", dates_in_result)
        self.assertNotIn("2026-06-02", dates_in_result)
    
    def test_calculate_longest_streak_multiple_streaks(self):
        records = []
        dates = [
            "2026-06-01", "2026-06-02", "2026-06-03",
            "2026-06-05", "2026-06-06",
            "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11"
        ]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        longest = calculate_longest_streak(unique_dates)
        self.assertEqual(longest, 4)
    
    def test_calculate_longest_streak_empty(self):
        self.assertEqual(calculate_longest_streak([]), 0)
    
    def test_calculate_longest_streak_single(self):
        from datetime import date
        self.assertEqual(calculate_longest_streak([date(2026, 6, 1)]), 1)


class TestCrossDayScenarios(unittest.TestCase):
    
    def test_midnight_punch_card_date_normalization(self):
        records = []
        dates = ["2026-06-07", "2026-06-08"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        self.assertEqual(len(unique_dates), 2)
        
        mock_today = datetime(2026, 6, 8, 23, 0, 0)
        with patch('app.api.habits.datetime') as mock_dt:
            mock_dt.now.return_value = mock_today
            mock_dt.strptime = datetime.strptime
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            current = calculate_current_streak(unique_dates)
            self.assertEqual(current, 2)
    
    def test_cross_day_punch_counted_correctly(self):
        records = []
        dates = ["2026-06-06", "2026-06-07", "2026-06-08"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        
        mock_today = datetime(2026, 6, 10, 1, 0, 0)
        with patch('app.api.habits.datetime') as mock_dt:
            mock_dt.now.return_value = mock_today
            mock_dt.strptime = datetime.strptime
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            current = calculate_current_streak(unique_dates)
            self.assertEqual(current, 0)
    
    def test_early_morning_yesterday_streak_continues(self):
        records = []
        dates = ["2026-06-07", "2026-06-08"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        
        mock_today = datetime(2026, 6, 9, 1, 0, 0)
        with patch('app.api.habits.datetime') as mock_dt:
            mock_dt.now.return_value = mock_today
            mock_dt.strptime = datetime.strptime
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            current = calculate_current_streak(unique_dates)
            self.assertEqual(current, 2)


class TestCompletionRateAndTrackingDays(unittest.TestCase):
    
    def test_completion_rate_never_exceeds_100_percent(self):
        records = []
        dates = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        sorted_dates = sorted(unique_dates)
        
        mock_today = datetime(2026, 6, 5, 23, 0, 0)
        with patch('app.api.habits.datetime') as mock_dt:
            mock_dt.now.return_value = mock_today
            mock_dt.strptime = datetime.strptime
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            first_date = sorted_dates[0] if unique_dates else mock_today.date()
            total_days = (mock_today.date() - first_date).days + 1
            total_completed = len(unique_dates)
            completion_rate = round(min(100, (total_completed / total_days) * 100), 1) if total_days > 0 else 0
            
            self.assertEqual(total_days, 5)
            self.assertEqual(total_completed, 5)
            self.assertEqual(completion_rate, 100.0)
    
    def test_first_date_calculation_is_correct(self):
        records = []
        dates = ["2026-06-10", "2026-06-01", "2026-06-05", "2026-06-15"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        sorted_dates = sorted(unique_dates)
        
        self.assertEqual(sorted_dates[0].strftime("%Y-%m-%d"), "2026-06-01")
        self.assertEqual(sorted_dates[-1].strftime("%Y-%m-%d"), "2026-06-15")
    
    def test_total_days_tracked_calculation(self):
        records = []
        dates = ["2026-06-01", "2026-06-03", "2026-06-05"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        sorted_dates = sorted(unique_dates)
        
        mock_today = datetime(2026, 6, 10, 12, 0, 0)
        with patch('app.api.habits.datetime') as mock_dt:
            mock_dt.now.return_value = mock_today
            mock_dt.strptime = datetime.strptime
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            first_date = sorted_dates[0] if unique_dates else mock_today.date()
            total_days = (mock_today.date() - first_date).days + 1
            total_completed = len(unique_dates)
            completion_rate = round(min(100, (total_completed / total_days) * 100), 1) if total_days > 0 else 0
            
            self.assertEqual(first_date.strftime("%Y-%m-%d"), "2026-06-01")
            self.assertEqual(total_days, 10)
            self.assertEqual(total_completed, 3)
            self.assertEqual(completion_rate, 30.0)
    
    def test_completion_rate_with_gaps(self):
        records = []
        dates = ["2026-06-01", "2026-06-02", "2026-06-05", "2026-06-06", "2026-06-07"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        sorted_dates = sorted(unique_dates)
        
        mock_today = datetime(2026, 6, 7, 23, 0, 0)
        with patch('app.api.habits.datetime') as mock_dt:
            mock_dt.now.return_value = mock_today
            mock_dt.strptime = datetime.strptime
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            first_date = sorted_dates[0] if unique_dates else mock_today.date()
            total_days = (mock_today.date() - first_date).days + 1
            total_completed = len(unique_dates)
            completion_rate = round(min(100, (total_completed / total_days) * 100), 1) if total_days > 0 else 0
            
            self.assertEqual(total_days, 7)
            self.assertEqual(total_completed, 5)
            self.assertAlmostEqual(completion_rate, 71.4, places=1)
    
    def test_empty_records_stats(self):
        unique_dates = get_unique_completed_dates([])
        mock_today = datetime(2026, 6, 10, 12, 0, 0)
        
        with patch('app.api.habits.datetime') as mock_dt:
            mock_dt.now.return_value = mock_today
            mock_dt.strptime = datetime.strptime
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            first_date = sorted(unique_dates)[0] if unique_dates else mock_today.date()
            total_days = (mock_today.date() - first_date).days + 1
            total_completed = len(unique_dates)
            completion_rate = round(min(100, (total_completed / total_days) * 100), 1) if total_days > 0 else 0
            
            self.assertEqual(total_days, 1)
            self.assertEqual(total_completed, 0)
            self.assertEqual(completion_rate, 0)
    
    def test_first_record_date_matches_first_date(self):
        records = []
        dates = ["2026-06-05", "2026-06-06", "2026-06-01", "2026-06-10"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = True
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        sorted_dates = sorted(unique_dates)
        
        first_date = sorted_dates[0] if unique_dates else None
        first_record_date = sorted_dates[0].strftime("%Y-%m-%d") if unique_dates else None
        
        self.assertEqual(first_record_date, "2026-06-01")
        self.assertEqual(first_date.strftime("%Y-%m-%d"), "2026-06-01")


class TestDuplicateHabitName(unittest.IsolatedAsyncioTestCase):
    
    async def test_create_duplicate_habit_name_raises_error(self):
        from app.api.habits import create_habit, HabitCreate
        from app.models.schedule import Habit
        from sqlalchemy.ext.asyncio import AsyncSession
        from unittest.mock import AsyncMock, MagicMock
        
        mock_existing_habit = Habit()
        mock_existing_habit.id = "existing-id"
        mock_existing_habit.name = "每日阅读"
        mock_existing_habit.icon = "📚"
        mock_existing_habit.color = "#4caf50"
        mock_existing_habit.target = "30"
        mock_existing_habit.unit = "分钟"
        mock_existing_habit.reminder = ""
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_existing_habit
        mock_db.execute.return_value = mock_result
        
        habit_data = HabitCreate(
            name="每日阅读",
            icon="📚",
            color="#4caf50",
            target="30",
            unit="分钟"
        )
        
        from fastapi import HTTPException
        with self.assertRaises(HTTPException) as context:
            await create_habit(habit_data, mock_db)
        
        self.assertEqual(context.exception.status_code, 400)
        self.assertIn("已存在同名习惯", context.exception.detail)
    
    async def test_create_new_habit_succeeds(self):
        from app.api.habits import create_habit, HabitCreate
        from app.models.schedule import Habit
        from sqlalchemy.ext.asyncio import AsyncSession
        from unittest.mock import AsyncMock, MagicMock
        
        mock_db = AsyncMock(spec=AsyncSession)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        async def mock_commit():
            pass
        
        async def mock_refresh(obj):
            obj.id = "new-habit-id"
            return obj
        
        mock_db.commit = mock_commit
        mock_db.refresh = mock_refresh
        
        habit_data = HabitCreate(
            name="新习惯",
            icon="🎯",
            color="#2196f3",
            target="1",
            unit="次"
        )
        
        result = await create_habit(habit_data, mock_db)
        
        self.assertEqual(result.name, "新习惯")
        self.assertEqual(result.id, "new-habit-id")


class TestStatsConsistency(unittest.TestCase):
    
    def test_all_stats_use_same_unique_dates(self):
        records = []
        dates = ["2026-06-01", "2026-06-02", "2026-06-02", "2026-06-03", "2026-06-03", "2026-06-05"]
        for i, date_str in enumerate(dates):
            r = HabitRecord()
            r.id = f"rec_{i}"
            r.habit_id = "test"
            r.date = date_str
            r.value = "1"
            r.completed = i != 3
            records.append(r)
        
        unique_dates = get_unique_completed_dates(records)
        sorted_dates = sorted(unique_dates)
        
        mock_today = datetime(2026, 6, 8, 12, 0, 0)
        with patch('app.api.habits.datetime') as mock_dt:
            mock_dt.now.return_value = mock_today
            mock_dt.strptime = datetime.strptime
            mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            
            total_completed = len(unique_dates)
            current_streak = calculate_current_streak(unique_dates)
            longest_streak = calculate_longest_streak(unique_dates)
            
            first_date = sorted_dates[0] if unique_dates else mock_today.date()
            total_days = (mock_today.date() - first_date).days + 1
            completion_rate = round(min(100, (total_completed / total_days) * 100), 1) if total_days > 0 else 0
            
            self.assertEqual(total_completed, 4)
            self.assertEqual(total_days, 8)
            self.assertAlmostEqual(completion_rate, 50.0, places=1)
            self.assertEqual(current_streak, 0)
            self.assertEqual(longest_streak, 3)
            self.assertEqual(sorted_dates[0].strftime("%Y-%m-%d"), "2026-06-01")


if __name__ == "__main__":
    unittest.main()
