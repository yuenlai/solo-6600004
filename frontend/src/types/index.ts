export interface Schedule {
  id: string; title: string; description: string;
  startTime: string; endTime: string; priority: 'low' | 'medium' | 'high';
  category: string; completed: boolean; recurring?: string;
  shareId?: string; sharedFrom?: string;
}

export type ShareStatus = 'pending' | 'accepted' | 'rejected';

export interface ScheduleShare {
  id: string;
  scheduleId: string;
  ownerName: string;
  sharedWith: string;
  shareToken: string;
  status: ShareStatus;
  message: string;
  createdAt: string;
  updatedAt: string;
  schedule?: Schedule;
}

export interface Habit {
  id: string; name: string; icon: string; color: string;
  target: number; unit: string; currentStreak: number;
  history: HabitRecord[]; reminder?: string;
}

export interface HabitRecord {
  date: string; completed: boolean; value: number;
}

export interface HabitStats {
  habitId: string;
  totalCompleted: number;
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  thisMonthCompleted: number;
  last7Days: { date: string; completed: boolean }[];
  firstRecordDate: string | null;
  totalDaysTracked: number;
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

export interface ConflictDetail {
  scheduleId: string;
  title: string;
  startTime: string;
  endTime: string;
  priority: 'low' | 'medium' | 'high';
  overlapMinutes: number;
  overlapType: 'full' | 'partial_start' | 'partial_end' | 'contains';
}

export interface TimeAdjustmentSuggestion {
  suggestionId: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  adjustmentType: 'move_earlier' | 'move_later' | 'shorten' | 'split' | 'swap';
  reason: string;
  score: number;
}

export interface ConflictInfo {
  hasConflict: boolean;
  conflictingSchedules: Schedule[];
  message: string;
  conflictDetails?: ConflictDetail[];
  affectedTimeRange?: {
    start: string;
    end: string;
    totalOverlapMinutes: number;
  };
  suggestions?: TimeAdjustmentSuggestion[];
  severity?: 'low' | 'medium' | 'high';
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

export interface MonthlyGoal {
  id: string;
  title: string;
  description: string;
  month: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'archived';
  progress: number;
  createdAt?: string;
}

export interface WeeklyAction {
  id: string;
  monthlyGoalId: string;
  title: string;
  description: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  completed: boolean;
  createdAt?: string;
}

export interface DailyAction {
  id: string;
  weeklyActionId: string;
  monthlyGoalId: string;
  title: string;
  description: string;
  date: string;
  scheduleId?: string;
  completed: boolean;
  createdAt?: string;
}

export interface MonthlyGoalWithDetails extends MonthlyGoal {
  weeklyActions: (WeeklyAction & { dailyActions: DailyAction[] })[];
}

export interface MonthlyGoalProgress {
  goalId: string;
  goalTitle: string;
  totalWeeklyActions: number;
  completedWeeklyActions: number;
  totalDailyActions: number;
  completedDailyActions: number;
  overallProgress: number;
  weeklyBreakdown: {
    weekNumber: number;
    total: number;
    completed: number;
    progress: number;
  }[];
}

export type ExceptionDayType = 'holiday' | 'business_trip' | 'rest_day' | 'custom';

export interface ExceptionDayRule {
  skipHabits: boolean;
  habitIdsToSkip: string[];
  skipSchedules: boolean;
  scheduleCategoriesToSkip: string[];
  rescheduleToNextWorkingDay: boolean;
  adjustWorkHours: boolean;
  workStartTime?: string;
  workEndTime?: string;
  note?: string;
}

export interface ExceptionDay {
  id: string;
  date: string;
  type: ExceptionDayType;
  name: string;
  description?: string;
  rule: ExceptionDayRule;
  createdAt?: string;
}

export interface ExceptionDayWithDetails extends ExceptionDay {
  affectedSchedules: Schedule[];
  affectedHabits: Habit[];
}

export interface CrossDaySchedule extends Schedule {
  startDate: string;
  endDate: string;
  totalDays: number;
  dayOffset: number;
  isFirstDay: boolean;
  isLastDay: boolean;
}

export interface FreeTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface DaySummary {
  date: string;
  totalSchedules: number;
  completedCount: number;
  highPriorityCount: number;
  totalDurationMinutes: number;
  freeTimeMinutes: number;
}

export type WarningLevel = 'critical' | 'warning' | 'info';
export type WarningType = 'schedule_timeout' | 'habit_streak' | 'long_pending';

export interface ScheduleWarning {
  type: 'schedule_timeout';
  schedule: Schedule;
  warningLevel: WarningLevel;
  minutesRemaining: number;
  deadline: string;
}

export interface HabitWarning {
  type: 'habit_streak';
  habit: Habit;
  warningLevel: WarningLevel;
  daysSinceLastCompletion: number;
  currentStreak: number;
}

export interface LongPendingWarning {
  type: 'long_pending';
  item: Schedule | DailyAction | WeeklyAction;
  itemType: 'schedule' | 'daily_action' | 'weekly_action';
  warningLevel: WarningLevel;
  daysPending: number;
  createdDate: string;
}

export type WarningItem = ScheduleWarning | HabitWarning | LongPendingWarning;

export interface WarningCenterData {
  scheduleWarnings: ScheduleWarning[];
  habitWarnings: HabitWarning[];
  longPendingWarnings: LongPendingWarning[];
  totalCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  lastUpdated: string;
}

export interface MultiDayViewData {
  startDate: string;
  endDate: string;
  dayCount: number;
  dates: string[];
  schedulesByDate: Map<string, Schedule[]>;
  crossDaySchedules: CrossDaySchedule[];
  freeTimeSlots: FreeTimeSlot[];
  conflicts: Map<string, ConflictInfo>;
  daySummaries: DaySummary[];
  allConflicts: { schedule: Schedule; conflictInfo: ConflictInfo }[];
}

export interface MicroTask {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  category: string;
  icon: string;
  priority: 'low' | 'medium' | 'high';
  isHabit: boolean;
  habitId?: string;
  color: string;
}

export interface FragmentTimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  beforeSchedule?: Schedule;
  afterSchedule?: Schedule;
}

export interface FragmentRecommendation {
  slot: FragmentTimeSlot;
  suggestions: MicroTask[];
  reason: string;
}

export type TimeRange = 'morning' | 'afternoon' | 'evening' | 'night' | 'all';

export type GroupBy = 'none' | 'category' | 'priority' | 'time' | 'completed';

export interface ScheduleFilter {
  categories: string[];
  priorities: ('low' | 'medium' | 'high')[];
  completed: 'all' | 'completed' | 'incomplete';
  timeRange: TimeRange;
}

export interface FilterState {
  filter: ScheduleFilter;
  groupBy: GroupBy;
  showFilters: boolean;
}
