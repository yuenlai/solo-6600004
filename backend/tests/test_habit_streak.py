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


if __name__ == "__main__":
    unittest.main()
