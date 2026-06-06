export interface Schedule {
  id: string; title: string; description: string;
  startTime: string; endTime: string; priority: 'low' | 'medium' | 'high';
  category: string; completed: boolean; recurring?: string;
}

export interface Habit {
  id: string; name: string; icon: string; color: string;
  target: number; unit: string; currentStreak: number;
  history: HabitRecord[]; reminder?: string;
}

export interface HabitRecord {
  date: string; completed: boolean; value: number;
}

export interface FocusSession {
  id: string; duration: number; startTime: string;
  endTime?: string; scheduleId?: string; completed: boolean;
}

export interface WeeklyReport {
  weekStart: string; completedSchedules: number;
  totalSchedules: number; habitCompletion: Record<string, number>;
  focusMinutes: number;
}
