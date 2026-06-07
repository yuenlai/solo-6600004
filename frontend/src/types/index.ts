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
  interrupted: boolean;
}

export interface InterruptionStatistics {
  totalInterruptions: number;
  hourlyDistribution: Record<number, number>;
  sessions: FocusSession[];
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

export interface HabitChallenge {
  id: string;
  habitId: string;
  name: string;
  targetDays: number;
  startDate: string;
  endDate: string;
  description?: string;
  status: 'active' | 'completed' | 'failed';
  records: HabitChallengeRecord[];
}

export interface HabitChallengeRecord {
  id: string;
  challengeId: string;
  date: string;
  completed: boolean;
  habitValue: number;
}

export interface MorningPlan {
  id: string;
  date: string;
  focusItems: string[];
  priorities: string[];
  scheduleIds: string[];
  note: string;
  createdAt?: string;
}

export interface EveningReview {
  id: string;
  date: string;
  completedCount: number;
  totalCount: number;
  completionRate: number;
  highlights: string;
  improvements: string;
  summary: string;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  createdAt?: string;
}

export interface CompletionStats {
  date: string;
  totalCount: number;
  completedCount: number;
  completionRate: number;
  schedules: Schedule[];
}

export interface DailyPlan {
  date: string;
  morningPlan: MorningPlan | null;
  eveningReview: EveningReview | null;
  completionStats: {
    totalCount: number;
    completedCount: number;
    completionRate: number;
  };
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  isAvailable: boolean;
}

export interface DragState {
  isDragging: boolean;
  scheduleId: string | null;
  startY: number;
  originalStartTime: string;
  originalEndTime: string;
  currentStartTime: string | null;
  currentEndTime: string | null;
}

export interface ResizeState {
  isResizing: boolean;
  scheduleId: string | null;
  edge: 'top' | 'bottom' | null;
  startY: number;
  originalStartTime: string;
  originalEndTime: string;
  currentStartTime: string | null;
  currentEndTime: string | null;
}

export interface CreateDragState {
  isCreating: boolean;
  startY: number;
  startTime: string | null;
  endTime: string | null;
}
