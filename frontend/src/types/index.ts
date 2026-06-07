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

export interface RescheduleOption {
  optionId: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  score: number;
  reason: string;
  originalSchedule?: Schedule;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingSchedules: Schedule[];
  message: string;
}

export interface RescheduleOptionsResponse {
  originalSchedule?: Schedule;
  optionsCount: number;
  options: RescheduleOption[];
}

export interface RescheduleMode {
  type: 'new' | 'existing';
  schedule?: Schedule;
  title: string;
  durationMinutes: number;
  priority: 'low' | 'medium' | 'high';
  category: string;
  preferredStartTime?: string;
  date?: string;
}
