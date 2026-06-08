import { create } from 'zustand';
import { Schedule, Habit, FocusSession, HabitChallenge, MorningPlan, EveningReview, CompletionStats, InterruptionStatistics, ConflictInfo, MonthlyGoal, MonthlyGoalWithDetails, MonthlyGoalProgress, WeeklyAction, DailyAction, ExceptionDay, ExceptionDayWithDetails, ExceptionDayRule, MultiDayViewData, CrossDaySchedule, FreeTimeSlot, DaySummary, ScheduleShare, WarningCenterData, ScheduleWarning, HabitWarning, LongPendingWarning, WarningLevel, MicroTask, FragmentRecommendation, ScheduleFilter, GroupBy } from '../types';
import { scheduleApi, challengeApi, habitApi, dailyPlanApi, focusSessionApi, monthlyGoalApi, exceptionDayApi, shareApi, fragmentTimeApi } from '../services/api';
import { getWeekStartDate, addDays, formatDate } from '../data/weekTemplates';

interface ScheduleState {
  schedules: Schedule[];
  habits: Habit[];
  challenges: HabitChallenge[];
  focusSession: FocusSession | null;
  focusSessions: FocusSession[];
  interruptionStatistics: InterruptionStatistics | null;
  selectedDate: string;
  viewMode: 'day' | 'week' | 'multiDay';
  scheduleViewMode: 'list' | 'timeline';
  multiDayCount: number;
  multiDayViewData: MultiDayViewData | null;
  loading: boolean;
  morningPlan: MorningPlan | null;
  eveningReview: EveningReview | null;
  completionStats: CompletionStats | null;
  conflicts: Map<string, ConflictInfo>;
  monthlyGoals: MonthlyGoal[];
  currentGoalDetails: MonthlyGoalWithDetails | null;
  monthProgress: MonthlyGoalProgress[] | null;
  dailyActions: (DailyAction & { goalTitle: string; goalCategory: string; weeklyTitle: string })[];
  exceptionDays: ExceptionDay[];
  currentExceptionDay: ExceptionDayWithDetails | null;
  checkedExceptionDay: ExceptionDay | null;
  microTasks: MicroTask[];
  fragmentRecommendations: FragmentRecommendation[];
  fragmentRecommendationsLoading: boolean;
  loadMonthlyGoals: (month?: string) => Promise<void>;
  loadGoalDetails: (goalId: string) => Promise<void>;
  createMonthlyGoal: (data: { title: string; description?: string; month: string; category?: string; priority?: string }) => Promise<MonthlyGoal>;
  updateMonthlyGoal: (id: string, data: Partial<MonthlyGoal>) => Promise<void>;
  deleteMonthlyGoal: (id: string) => Promise<void>;
  getMonthWeeks: (month: string) => Promise<Array<{ week_number: number; start_date: string; end_date: string }>>;
  createWeeklyAction: (data: { monthly_goal_id: string; title: string; description?: string; week_number: number; start_date: string; end_date: string }) => Promise<WeeklyAction>;
  updateWeeklyAction: (id: string, data: { title?: string; description?: string; completed?: boolean }) => Promise<void>;
  deleteWeeklyAction: (id: string) => Promise<void>;
  createDailyAction: (data: { weekly_action_id: string; monthly_goal_id: string; title: string; description?: string; date: string }) => Promise<DailyAction>;
  updateDailyAction: (id: string, data: { title?: string; description?: string; completed?: boolean; schedule_id?: string }) => Promise<void>;
  deleteDailyAction: (id: string) => Promise<void>;
  loadGoalProgress: (goalId: string) => Promise<MonthlyGoalProgress | null>;
  loadMonthProgress: (month: string) => Promise<void>;
  loadDailyActions: (date: string) => Promise<void>;
  setCurrentGoalDetails: (goal: MonthlyGoalWithDetails | null) => void;
  loadExceptionDays: (startDate?: string, endDate?: string) => Promise<void>;
  loadExceptionDay: (date: string) => Promise<void>;
  checkExceptionDay: (date: string) => Promise<ExceptionDay | null>;
  createExceptionDay: (data: {
    date: string;
    type: string;
    name: string;
    description?: string;
    rule: ExceptionDayRule;
  }) => Promise<ExceptionDay>;
  updateExceptionDay: (id: string, data: Partial<ExceptionDay>) => Promise<void>;
  deleteExceptionDay: (id: string) => Promise<void>;
  applyExceptionDay: (id: string) => Promise<{
    schedules: { processed: any[]; skipped: any[]; rescheduled: any[] };
    habits: { skipped: any[]; kept: any[] };
  } | null>;
  setCurrentExceptionDay: (day: ExceptionDayWithDetails | null) => void;
  warningCenterData: WarningCenterData | null;
  loadWarningCenter: () => void;
  calculateScheduleWarnings: (schedules: Schedule[], now: Date) => ScheduleWarning[];
  calculateHabitWarnings: (habits: Habit[], now: Date, selectedDate: string) => HabitWarning[];
  calculateLongPendingWarnings: (schedules: Schedule[], dailyActions: DailyAction[], weeklyActions: WeeklyAction[], now: Date) => LongPendingWarning[];
  currentUser: string;
  outgoingShares: ScheduleShare[];
  incomingShares: ScheduleShare[];
  acceptedShares: ScheduleShare[];
  setCurrentUser: (name: string) => void;
  shareSchedule: (scheduleId: string, sharedWith: string, message?: string) => Promise<ScheduleShare | null>;
  acceptShare: (token: string) => Promise<boolean>;
  rejectShare: (token: string) => Promise<boolean>;
  cancelShare: (shareId: string) => Promise<boolean>;
  loadOutgoingShares: () => Promise<void>;
  loadIncomingShares: () => Promise<void>;
  loadAcceptedShares: () => Promise<void>;
  syncSharedSchedules: () => Promise<number>;
  addSchedule: (s: Schedule) => void;
  addSchedules: (s: Schedule[]) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  toggleComplete: (id: string) => void;
  refreshCompletionStats: () => void;
  updateScheduleTime: (id: string, startTime: string, endTime: string) => Promise<boolean>;
  checkScheduleConflict: (startTime: string, endTime: string, excludeId?: string, extra?: { title?: string; priority?: string; category?: string }) => Promise<ConflictInfo | null>;
  setScheduleViewMode: (mode: 'list' | 'timeline') => void;
  clearConflicts: () => void;
  setConflict: (scheduleId: string, info: ConflictInfo) => void;
  addHabit: (h: Habit) => void;
  recordHabit: (habitId: string, date: string, value: number) => void;
  startFocus: (duration: number, scheduleId?: string) => Promise<void>;
  completeFocus: () => Promise<void>;
  interruptFocus: () => Promise<void>;
  endFocus: () => void;
  loadFocusSessions: (date?: string) => Promise<void>;
  loadFocusSessionsByRange: (startDate: string, endDate: string) => Promise<void>;
  loadInterruptionStatistics: (startDate: string, endDate: string) => Promise<void>;
  setSelectedDate: (date: string) => void;
  setViewMode: (mode: 'day' | 'week' | 'multiDay') => void;
  setMultiDayCount: (count: number) => void;
  setSchedules: (schedules: Schedule[]) => void;
  loadSchedules: (date?: string) => Promise<void>;
  loadWeekSchedules: (weekStartDate?: string) => Promise<void>;
  loadMultiDaySchedules: (startDate?: string, dayCount?: number) => Promise<void>;
  generateMultiDayViewData: (startDate: string, dayCount: number, schedules: Schedule[]) => MultiDayViewData;
  loadHabits: () => Promise<void>;
  loadChallenges: () => Promise<void>;
  addChallenge: (c: HabitChallenge) => void;
  recordChallenge: (challengeId: string, date: string, habitValue: number) => Promise<void>;
  deleteChallenge: (challengeId: string) => Promise<void>;
  loadMorningPlan: (date?: string) => Promise<void>;
  loadEveningReview: (date?: string) => Promise<void>;
  loadCompletionStats: (date?: string) => Promise<void>;
  loadDailyPlan: (date?: string) => Promise<void>;
  createMorningPlan: (data: {
    focusItems: string[];
    priorities: string[];
    scheduleIds: string[];
    note: string;
  }) => Promise<void>;
  updateMorningPlan: (date: string, data: {
    focusItems?: string[];
    priorities?: string[];
    scheduleIds?: string[];
    note?: string;
  }) => Promise<void>;
  generateMorningSuggestion: (date: string) => Promise<{
    focus_items: string[];
    priorities: string[];
    schedule_ids: string[];
    note: string;
  } | null>;
  createEveningReview: (data: {
    highlights: string;
    improvements: string;
    summary: string;
    mood: string;
  }) => Promise<void>;
  updateEveningReview: (date: string, data: {
    highlights?: string;
    improvements?: string;
    summary?: string;
    mood?: string;
  }) => Promise<void>;
  setMorningPlan: (plan: MorningPlan | null) => void;
  setEveningReview: (review: EveningReview | null) => void;
  loadMicroTasks: () => Promise<void>;
  createMicroTask: (data: Partial<MicroTask>) => Promise<MicroTask | null>;
  updateMicroTask: (id: string, data: Partial<MicroTask>) => Promise<void>;
  deleteMicroTask: (id: string) => Promise<void>;
  loadFragmentRecommendations: (date?: string, maxDuration?: number, minDuration?: number) => Promise<void>;
  confirmFragmentTask: (microTaskId: string, startTime: string, endTime: string, date: string) => Promise<Schedule | null>;
  clearFragmentRecommendations: () => void;
  filter: ScheduleFilter;
  groupBy: GroupBy;
  showFilters: boolean;
  setFilter: (filter: Partial<ScheduleFilter>) => void;
  setGroupBy: (groupBy: GroupBy) => void;
  toggleShowFilters: () => void;
  resetFilters: () => void;
  getFilteredSchedules: (schedules: Schedule[], date?: string) => Schedule[];
  getGroupedSchedules: (schedules: Schedule[]) => Map<string, Schedule[]>;
  getUniqueCategories: () => string[];
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [], habits: [], challenges: [], focusSession: null,
  focusSessions: [],
  interruptionStatistics: null,
  selectedDate: new Date().toISOString().split('T')[0],
  viewMode: 'day',
  scheduleViewMode: 'list',
  multiDayCount: 7,
  multiDayViewData: null,
  loading: false,
  morningPlan: null,
  eveningReview: null,
  completionStats: null,
  conflicts: new Map(),
  exceptionDays: [],
  currentExceptionDay: null,
  checkedExceptionDay: null,
  warningCenterData: null,
  currentUser: localStorage.getItem('currentUser') || '我',
  outgoingShares: [],
  incomingShares: [],
  acceptedShares: [],
  microTasks: [],
  fragmentRecommendations: [],
  fragmentRecommendationsLoading: false,
  filter: {
    categories: [],
    priorities: [],
    completed: 'all',
    timeRange: 'all'
  },
  groupBy: 'none',
  showFilters: false,
  setFilter: (newFilter) => set((state) => ({
    filter: { ...state.filter, ...newFilter }
  })),
  setGroupBy: (groupBy) => set({ groupBy }),
  toggleShowFilters: () => set((state) => ({ showFilters: !state.showFilters })),
  resetFilters: () => set({
    filter: {
      categories: [],
      priorities: [],
      completed: 'all',
      timeRange: 'all'
    },
    groupBy: 'none'
  }),
  getUniqueCategories: () => {
    const categories = new Set(get().schedules.map(s => s.category));
    return Array.from(categories).sort();
  },
  getFilteredSchedules: (schedules, date) => {
    const { filter } = get();
    let filtered = [...schedules];

    if (date) {
      filtered = filtered.filter(s => s.startTime.startsWith(date));
    }

    if (filter.categories.length > 0) {
      filtered = filtered.filter(s => filter.categories.includes(s.category));
    }

    if (filter.priorities.length > 0) {
      filtered = filtered.filter(s => filter.priorities.includes(s.priority));
    }

    if (filter.completed !== 'all') {
      filtered = filtered.filter(s => 
        filter.completed === 'completed' ? s.completed : !s.completed
      );
    }

    if (filter.timeRange !== 'all') {
      filtered = filtered.filter(s => {
        const hour = parseInt(s.startTime.split('T')[1]?.substring(0, 2) || '0');
        switch (filter.timeRange) {
          case 'morning': return hour >= 6 && hour < 12;
          case 'afternoon': return hour >= 12 && hour < 18;
          case 'evening': return hour >= 18 && hour < 22;
          case 'night': return hour >= 22 || hour < 6;
          default: return true;
        }
      });
    }

    return filtered.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  },
  getGroupedSchedules: (schedules) => {
    const { groupBy } = get();
    const groups = new Map<string, Schedule[]>();

    if (groupBy === 'none') {
      groups.set('全部', schedules);
      return groups;
    }

    schedules.forEach(schedule => {
      let key: string;
      switch (groupBy) {
        case 'category':
          key = schedule.category || '未分类';
          break;
        case 'priority':
          key = schedule.priority === 'high' ? '🔴 高优先级' : 
                schedule.priority === 'medium' ? '🟡 中优先级' : '🟢 低优先级';
          break;
        case 'time': {
          const hour = parseInt(schedule.startTime.split('T')[1]?.substring(0, 2) || '0');
          if (hour >= 6 && hour < 12) key = '🌅 上午 (06:00-12:00)';
          else if (hour >= 12 && hour < 18) key = '☀️ 下午 (12:00-18:00)';
          else if (hour >= 18 && hour < 22) key = '🌆 傍晚 (18:00-22:00)';
          else key = '🌙 夜间 (22:00-06:00)';
          break;
        }
        case 'completed':
          key = schedule.completed ? '✅ 已完成' : '⏳ 待完成';
          break;
        default:
          key = '全部';
      }
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(schedule);
    });

    const sortedKeys = Array.from(groups.keys()).sort();
    const sortedGroups = new Map<string, Schedule[]>();
    sortedKeys.forEach(key => sortedGroups.set(key, groups.get(key)!));
    return sortedGroups;
  },
  setCurrentUser: (name) => {
    localStorage.setItem('currentUser', name);
    set({ currentUser: name });
  },
  shareSchedule: async (scheduleId, sharedWith, message = '') => {
    try {
      const currentUser = get().currentUser;
      const res = await shareApi.create({
        schedule_id: scheduleId,
        owner_name: currentUser,
        shared_with: sharedWith,
        message
      });
      const share: ScheduleShare = {
        id: res.data.id,
        scheduleId: res.data.schedule_id,
        ownerName: res.data.owner_name,
        sharedWith: res.data.shared_with,
        shareToken: res.data.share_token,
        status: res.data.status,
        message: res.data.message,
        createdAt: res.data.created_at,
        updatedAt: res.data.updated_at
      };
      await get().loadOutgoingShares();
      return share;
    } catch (e) {
      console.error('Failed to share schedule:', e);
      return null;
    }
  },
  acceptShare: async (token) => {
    try {
      const currentUser = get().currentUser;
      await shareApi.accept(token, currentUser);
      await get().loadIncomingShares();
      await get().loadSchedules();
      await get().loadAcceptedShares();
      return true;
    } catch (e) {
      console.error('Failed to accept share:', e);
      return false;
    }
  },
  rejectShare: async (token) => {
    try {
      const currentUser = get().currentUser;
      await shareApi.reject(token, currentUser);
      await get().loadIncomingShares();
      return true;
    } catch (e) {
      console.error('Failed to reject share:', e);
      return false;
    }
  },
  cancelShare: async (shareId) => {
    try {
      const currentUser = get().currentUser;
      await shareApi.cancel(shareId, currentUser);
      await get().loadOutgoingShares();
      await get().loadAcceptedShares();
      return true;
    } catch (e) {
      console.error('Failed to cancel share:', e);
      return false;
    }
  },
  loadOutgoingShares: async () => {
    try {
      const currentUser = get().currentUser;
      const res = await shareApi.getOutgoing(currentUser);
      const shares: ScheduleShare[] = res.data.shares.map((s: any) => ({
        id: s.id,
        scheduleId: s.schedule_id,
        ownerName: s.owner_name,
        sharedWith: s.shared_with,
        shareToken: s.share_token,
        status: s.status,
        message: s.message,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        schedule: s.schedule ? {
          id: s.schedule.id,
          title: s.schedule.title,
          description: s.schedule.description,
          startTime: s.schedule.start_time,
          endTime: s.schedule.end_time,
          priority: s.schedule.priority,
          category: s.schedule.category,
          completed: s.schedule.completed,
          recurring: s.schedule.recurring,
          shareId: s.schedule.share_id,
          sharedFrom: s.schedule.shared_from
        } : undefined
      }));
      set({ outgoingShares: shares });
    } catch (e) {
      console.error('Failed to load outgoing shares:', e);
    }
  },
  loadIncomingShares: async () => {
    try {
      const currentUser = get().currentUser;
      const res = await shareApi.getIncoming(currentUser);
      const shares: ScheduleShare[] = res.data.shares.map((s: any) => ({
        id: s.id,
        scheduleId: s.schedule_id,
        ownerName: s.owner_name,
        sharedWith: s.shared_with,
        shareToken: s.share_token,
        status: s.status,
        message: s.message,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        schedule: s.schedule ? {
          id: s.schedule.id,
          title: s.schedule.title,
          description: s.schedule.description,
          startTime: s.schedule.start_time,
          endTime: s.schedule.end_time,
          priority: s.schedule.priority,
          category: s.schedule.category,
          completed: s.schedule.completed,
          recurring: s.schedule.recurring,
          shareId: s.schedule.share_id,
          sharedFrom: s.schedule.shared_from
        } : undefined
      }));
      set({ incomingShares: shares });
    } catch (e) {
      console.error('Failed to load incoming shares:', e);
    }
  },
  loadAcceptedShares: async () => {
    try {
      const currentUser = get().currentUser;
      const res = await shareApi.getAccepted(currentUser);
      const shares: ScheduleShare[] = res.data.shares.map((s: any) => ({
        id: s.id,
        scheduleId: s.schedule_id,
        ownerName: s.owner_name,
        sharedWith: s.shared_with,
        shareToken: s.share_token,
        status: s.status,
        message: s.message,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        schedule: s.schedule ? {
          id: s.schedule.id,
          title: s.schedule.title,
          description: s.schedule.description,
          startTime: s.schedule.start_time,
          endTime: s.schedule.end_time,
          priority: s.schedule.priority,
          category: s.schedule.category,
          completed: s.schedule.completed,
          recurring: s.schedule.recurring,
          shareId: s.schedule.share_id,
          sharedFrom: s.schedule.shared_from
        } : undefined
      }));
      set({ acceptedShares: shares });
    } catch (e) {
      console.error('Failed to load accepted shares:', e);
    }
  },
  syncSharedSchedules: async () => {
    try {
      const currentUser = get().currentUser;
      const res = await shareApi.sync(currentUser);
      await get().loadSchedules();
      return res.data.updated_count || 0;
    } catch (e) {
      console.error('Failed to sync shared schedules:', e);
      return 0;
    }
  },
  addSchedule: (s) => set({ schedules: [...get().schedules, s] }),
  addSchedules: (newSchedules) => set({ schedules: [...get().schedules, ...newSchedules] }),
  setSchedules: (schedules) => set({ schedules }),
  setScheduleViewMode: (mode) => set({ scheduleViewMode: mode }),
  clearConflicts: () => set({ conflicts: new Map() }),
  setConflict: (scheduleId, info) => {
    const newConflicts = new Map(get().conflicts);
    newConflicts.set(scheduleId, info);
    set({ conflicts: newConflicts });
  },
  checkScheduleConflict: async (startTime, endTime, excludeId, extra) => {
    try {
      const res = await scheduleApi.checkConflict(startTime, endTime, excludeId, extra);
      const conflictingSchedules = res.data.conflicting_schedules.map((cs: any) => ({
        id: cs.id,
        title: cs.title,
        description: cs.description,
        startTime: cs.start_time,
        endTime: cs.end_time,
        priority: cs.priority,
        category: cs.category,
        completed: cs.completed,
        recurring: cs.recurring
      }));
      
      const conflictDetails = res.data.conflict_details?.map((cd: any) => ({
        scheduleId: cd.schedule_id,
        title: cd.title,
        startTime: cd.start_time,
        endTime: cd.end_time,
        priority: cd.priority,
        overlapMinutes: cd.overlap_minutes,
        overlapType: cd.overlap_type
      }));
      
      const suggestions = res.data.suggestions?.map((s: any) => ({
        suggestionId: s.suggestion_id,
        title: s.title,
        startTime: s.start_time,
        endTime: s.end_time,
        durationMinutes: s.duration_minutes,
        adjustmentType: s.adjustment_type,
        reason: s.reason,
        score: s.score
      }));
      
      return {
        hasConflict: res.data.has_conflict,
        conflictingSchedules,
        message: res.data.message,
        conflictDetails,
        affectedTimeRange: res.data.affected_time_range ? {
          start: res.data.affected_time_range.start,
          end: res.data.affected_time_range.end,
          totalOverlapMinutes: res.data.affected_time_range.total_overlap_minutes
        } : undefined,
        suggestions,
        severity: res.data.severity
      };
    } catch (e) {
      console.error('Conflict check failed:', e);
      return null;
    }
  },
  updateScheduleTime: async (id, startTime, endTime) => {
    try {
      const conflictInfo = await get().checkScheduleConflict(startTime, endTime, id);
      if (conflictInfo && conflictInfo.hasConflict) {
        get().setConflict(id, conflictInfo);
        return false;
      }
      await scheduleApi.update(id, { start_time: startTime, end_time: endTime });
      set({
        schedules: get().schedules.map(s => s.id === id ? { ...s, startTime, endTime } : s)
      });
      const newConflicts = new Map(get().conflicts);
      newConflicts.delete(id);
      set({ conflicts: newConflicts });
      return true;
    } catch (e) {
      console.error('Failed to update schedule time:', e);
      return false;
    }
  },
  loadSchedules: async (date) => {
    set({ loading: true });
    try {
      const targetDate = date || get().selectedDate;
      const res = await scheduleApi.list(targetDate);
      const schedules = res.data.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.start_time,
        endTime: s.end_time,
        priority: s.priority,
        category: s.category,
        completed: s.completed,
        recurring: s.recurring,
        shareId: s.share_id,
        sharedFrom: s.shared_from
      }));
      set({ schedules });
    } catch (e) {
      console.error('Failed to load schedules:', e);
    } finally {
      set({ loading: false });
    }
  },
  loadWeekSchedules: async (weekStartDate) => {
    set({ loading: true });
    try {
      const targetDate = weekStartDate || get().selectedDate;
      const weekStart = getWeekStartDate(new Date(targetDate));
      const weekEnd = addDays(weekStart, 6);
      const res = await scheduleApi.listByRange(formatDate(weekStart), formatDate(weekEnd));
      const schedules = res.data.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.start_time,
        endTime: s.end_time,
        priority: s.priority,
        category: s.category,
        completed: s.completed,
        recurring: s.recurring,
        shareId: s.share_id,
        sharedFrom: s.shared_from
      }));
      set({ schedules });
    } catch (e) {
      console.error('Failed to load week schedules:', e);
    } finally {
      set({ loading: false });
    }
  },
  updateSchedule: async (id, updates) => {
    try {
      await scheduleApi.update(id, updates);
      set({
        schedules: get().schedules.map(s => s.id === id ? { ...s, ...updates } : s)
      });
    } catch (e) {
      console.error('Failed to update schedule:', e);
    }
  },
  deleteSchedule: async (id) => {
    try {
      await scheduleApi.delete(id);
      set({ schedules: get().schedules.filter(s => s.id !== id) });
    } catch (e) {
      console.error('Failed to delete schedule:', e);
    }
  },
  toggleComplete: async (id) => {
    const schedule = get().schedules.find(s => s.id === id);
    if (schedule) {
      try {
        await scheduleApi.update(id, { completed: !schedule.completed });
        const newSchedules = get().schedules.map(s => s.id === id ? { ...s, completed: !s.completed } : s);
        set({ schedules: newSchedules });
        get().refreshCompletionStats();
      } catch (e) {
        console.error('Failed to toggle schedule:', e);
      }
    }
  },
  refreshCompletionStats: () => {
    const { schedules, selectedDate, multiDayViewData, eveningReview } = get();

    const daySchedules = schedules.filter(s => s.startTime.startsWith(selectedDate));
    const totalCount = daySchedules.length;
    const completedCount = daySchedules.filter(s => s.completed).length;
    const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const newCompletionStats: CompletionStats = {
      date: selectedDate,
      totalCount,
      completedCount,
      completionRate,
      schedules: daySchedules,
    };
    set({ completionStats: newCompletionStats });

    if (eveningReview) {
      set({
        eveningReview: {
          ...eveningReview,
          completedCount,
          totalCount,
          completionRate,
        },
      });
    }

    if (multiDayViewData) {
      const { startDate, dayCount } = multiDayViewData;
      const newViewData = get().generateMultiDayViewData(startDate, dayCount, schedules);
      set({ multiDayViewData: newViewData });
    }
  },
  addHabit: (h) => set({ habits: [...get().habits, h] }),
  recordHabit: (habitId, date, value) => set({
    habits: get().habits.map(h => h.id === habitId ? {
      ...h, history: [...h.history, { date, completed: value >= h.target, value }],
      currentStreak: h.currentStreak + 1
    } : h)
  }),
  startFocus: async (duration, scheduleId) => {
    try {
      const startTime = new Date().toISOString();
      const res = await focusSessionApi.create({
        duration,
        start_time: startTime,
        schedule_id: scheduleId
      });
      const session: FocusSession = {
        id: res.data.id,
        duration: res.data.duration,
        startTime: res.data.start_time,
        endTime: res.data.end_time,
        scheduleId: res.data.schedule_id,
        completed: res.data.completed,
        interrupted: res.data.interrupted
      };
      set({ focusSession: session });
    } catch (e) {
      console.error('Failed to start focus session:', e);
    }
  },
  completeFocus: async () => {
    const { focusSession } = get();
    if (!focusSession) return;
    try {
      const endTime = new Date().toISOString();
      await focusSessionApi.update(focusSession.id, {
        end_time: endTime,
        completed: true,
        interrupted: false
      });
      set({ focusSession: null });
      await get().loadFocusSessions();
    } catch (e) {
      console.error('Failed to complete focus session:', e);
    }
  },
  interruptFocus: async () => {
    const { focusSession } = get();
    if (!focusSession) return;
    try {
      const endTime = new Date().toISOString();
      await focusSessionApi.update(focusSession.id, {
        end_time: endTime,
        completed: false,
        interrupted: true
      });
      set({ focusSession: null });
      await get().loadFocusSessions();
    } catch (e) {
      console.error('Failed to interrupt focus session:', e);
    }
  },
  endFocus: () => set({ focusSession: null }),
  loadFocusSessions: async (date) => {
    try {
      const targetDate = date || get().selectedDate;
      const res = await focusSessionApi.list(targetDate);
      const sessions: FocusSession[] = res.data.map((s: any) => ({
        id: s.id,
        duration: s.duration,
        startTime: s.start_time,
        endTime: s.end_time,
        scheduleId: s.schedule_id,
        completed: s.completed,
        interrupted: s.interrupted
      }));
      set({ focusSessions: sessions });
    } catch (e) {
      console.error('Failed to load focus sessions:', e);
    }
  },
  loadFocusSessionsByRange: async (startDate, endDate) => {
    try {
      const res = await focusSessionApi.listByRange(startDate, endDate);
      const sessions: FocusSession[] = res.data.map((s: any) => ({
        id: s.id,
        duration: s.duration,
        startTime: s.start_time,
        endTime: s.end_time,
        scheduleId: s.schedule_id,
        completed: s.completed,
        interrupted: s.interrupted
      }));
      set({ focusSessions: sessions });
    } catch (e) {
      console.error('Failed to load focus sessions by range:', e);
    }
  },
  loadInterruptionStatistics: async (startDate, endDate) => {
    try {
      const res = await focusSessionApi.getInterruptionStatistics(startDate, endDate);
      const stats: InterruptionStatistics = {
        totalInterruptions: res.data.total_interruptions,
        hourlyDistribution: res.data.hourly_distribution,
        sessions: res.data.sessions.map((s: any) => ({
          id: s.id,
          duration: s.duration,
          startTime: s.start_time,
          endTime: s.end_time,
          scheduleId: s.schedule_id,
          completed: s.completed,
          interrupted: s.interrupted
        }))
      };
      set({ interruptionStatistics: stats });
    } catch (e) {
      console.error('Failed to load interruption statistics:', e);
    }
  },
  setSelectedDate: (date) => set({ selectedDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setMultiDayCount: (count) => set({ multiDayCount: count }),
  generateMultiDayViewData: (startDate, dayCount, schedules) => {
    const dates: string[] = [];
    const start = new Date(startDate);
    for (let i = 0; i < dayCount; i++) {
      dates.push(formatDate(addDays(start, i)));
    }
    const endDate = dates[dates.length - 1];

    const schedulesByDate = new Map<string, Schedule[]>();
    dates.forEach(date => schedulesByDate.set(date, []));

    const crossDaySchedules: CrossDaySchedule[] = [];
    const allConflicts: { schedule: Schedule; conflictInfo: ConflictInfo }[] = [];
    const conflicts = new Map<string, ConflictInfo>();

    schedules.forEach(schedule => {
      const sDate = schedule.startTime.split('T')[0];
      const eDate = schedule.endTime.split('T')[0];
      const isCrossDay = sDate !== eDate;

      if (schedulesByDate.has(sDate)) {
        schedulesByDate.get(sDate)!.push(schedule);
      }

      if (isCrossDay) {
        const s = new Date(schedule.startTime);
        const e = new Date(schedule.endTime);
        const totalDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        
        for (let i = 0; i < totalDays; i++) {
          const currentDate = formatDate(addDays(s, i));
          if (dates.includes(currentDate)) {
            crossDaySchedules.push({
              ...schedule,
              startDate: sDate,
              endDate: eDate,
              totalDays,
              dayOffset: i,
              isFirstDay: i === 0,
              isLastDay: i === totalDays - 1,
            });
          }
        }
      }

      const existingConflicts = get().conflicts;
      if (existingConflicts.has(schedule.id)) {
        const conflictInfo = existingConflicts.get(schedule.id)!;
        allConflicts.push({ schedule, conflictInfo });
        conflicts.set(schedule.id, conflictInfo);
      }
    });

    const freeTimeSlots: FreeTimeSlot[] = [];
    dates.forEach(date => {
      const daySchedules = schedulesByDate.get(date) || [];
      const sorted = [...daySchedules].sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59`);
      let currentTime = dayStart;

      sorted.forEach(schedule => {
        const sStart = new Date(schedule.startTime);
        if (sStart.getTime() > currentTime.getTime()) {
          const duration = Math.round((sStart.getTime() - currentTime.getTime()) / 60000);
          if (duration >= 30) {
            freeTimeSlots.push({
              date,
              startTime: currentTime.toISOString(),
              endTime: schedule.startTime,
              durationMinutes: duration,
            });
          }
        }
        const sEnd = new Date(schedule.endTime);
        if (sEnd.getTime() > currentTime.getTime()) {
          currentTime = sEnd;
        }
      });

      if (currentTime.getTime() < dayEnd.getTime()) {
        const duration = Math.round((dayEnd.getTime() - currentTime.getTime()) / 60000);
        if (duration >= 30) {
          freeTimeSlots.push({
            date,
            startTime: currentTime.toISOString(),
            endTime: dayEnd.toISOString(),
            durationMinutes: duration,
          });
        }
      }
    });

    const daySummaries: DaySummary[] = dates.map(date => {
      const daySchedules = schedulesByDate.get(date) || [];
      const dayFreeSlots = freeTimeSlots.filter(slot => slot.date === date);
      let totalDuration = 0;
      let completedCount = 0;
      let highPriorityCount = 0;
      
      daySchedules.forEach(s => {
        const dur = Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000);
        totalDuration += dur;
        if (s.completed) completedCount++;
        if (s.priority === 'high') highPriorityCount++;
      });

      const totalFreeTime = dayFreeSlots.reduce((sum, slot) => sum + slot.durationMinutes, 0);

      return {
        date,
        totalSchedules: daySchedules.length,
        completedCount,
        highPriorityCount,
        totalDurationMinutes: totalDuration,
        freeTimeMinutes: totalFreeTime,
      };
    });

    return {
      startDate,
      endDate,
      dayCount,
      dates,
      schedulesByDate,
      crossDaySchedules,
      freeTimeSlots,
      conflicts,
      daySummaries,
      allConflicts,
    };
  },
  loadMultiDaySchedules: async (startDate, dayCount) => {
    set({ loading: true });
    try {
      const targetStart = startDate || get().selectedDate;
      const targetCount = dayCount || get().multiDayCount;
      const start = new Date(targetStart);
      const end = addDays(start, targetCount - 1);
      
      const res = await scheduleApi.listByRange(formatDate(start), formatDate(end));
      const schedules = res.data.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.start_time,
        endTime: s.end_time,
        priority: s.priority,
        category: s.category,
        completed: s.completed,
        recurring: s.recurring,
        shareId: s.share_id,
        sharedFrom: s.shared_from
      }));
      
      set({ schedules });
      const viewData = get().generateMultiDayViewData(formatDate(start), targetCount, schedules);
      set({ multiDayViewData: viewData });
    } catch (e) {
      console.error('Failed to load multi-day schedules:', e);
    } finally {
      set({ loading: false });
    }
  },
  loadHabits: async () => {
    set({ loading: true });
    try {
      const res = await habitApi.list();
      const habits = res.data.map((h: any) => ({
        id: h.id,
        name: h.name,
        icon: h.icon,
        color: h.color,
        target: parseInt(h.target),
        unit: h.unit,
        currentStreak: parseInt(h.current_streak),
        history: [],
        reminder: h.reminder
      }));
      set({ habits });
    } catch (e) {
      console.error('Failed to load habits:', e);
    } finally {
      set({ loading: false });
    }
  },
  loadChallenges: async () => {
    set({ loading: true });
    try {
      const res = await challengeApi.list();
      set({ challenges: res.data });
    } catch (e) {
      console.error('Failed to load challenges:', e);
    } finally {
      set({ loading: false });
    }
  },
  addChallenge: (c) => set({ challenges: [...get().challenges, c] }),
  recordChallenge: async (challengeId, date, habitValue) => {
    try {
      const res = await challengeApi.record(challengeId, { date, habitValue });
      const record = res.data;
      set({
        challenges: get().challenges.map(c => {
          if (c.id !== challengeId) return c;
          const existingRecord = c.records.find(r => r.date === date);
          let newRecords;
          if (existingRecord) {
            newRecords = c.records.map(r => r.date === date ? { ...r, completed: true, habitValue } : r);
          } else {
            newRecords = [...c.records, { id: record.id, challengeId, date, completed: true, habitValue }];
          }
          return {
            ...c,
            records: newRecords,
            status: record.challengeStatus || c.status
          };
        })
      });
    } catch (e) {
      console.error('Failed to record challenge:', e);
      throw e;
    }
  },
  deleteChallenge: async (challengeId) => {
    try {
      await challengeApi.delete(challengeId);
      set({
        challenges: get().challenges.filter(c => c.id !== challengeId)
      });
    } catch (e) {
      console.error('Failed to delete challenge:', e);
      throw e;
    }
  },
  loadMorningPlan: async (date) => {
    try {
      const targetDate = date || get().selectedDate;
      const res = await dailyPlanApi.getMorningPlan(targetDate);
      if (res.data && res.data.id) {
        set({
          morningPlan: {
            id: res.data.id,
            date: res.data.date,
            focusItems: res.data.focus_items || [],
            priorities: res.data.priorities || [],
            scheduleIds: res.data.schedule_ids || [],
            note: res.data.note || '',
            createdAt: res.data.created_at
          }
        });
      } else {
        set({ morningPlan: null });
      }
    } catch (e) {
      console.error('Failed to load morning plan:', e);
      set({ morningPlan: null });
    }
  },
  loadEveningReview: async (date) => {
    try {
      const targetDate = date || get().selectedDate;
      const res = await dailyPlanApi.getEveningReview(targetDate);
      if (res.data && res.data.id) {
        set({
          eveningReview: {
            id: res.data.id,
            date: res.data.date,
            completedCount: parseInt(res.data.completed_count) || 0,
            totalCount: parseInt(res.data.total_count) || 0,
            completionRate: parseFloat(res.data.completion_rate) || 0,
            highlights: res.data.highlights || '',
            improvements: res.data.improvements || '',
            summary: res.data.summary || '',
            mood: res.data.mood || 'neutral',
            createdAt: res.data.created_at
          }
        });
      } else {
        set({ eveningReview: null });
      }
    } catch (e) {
      console.error('Failed to load evening review:', e);
      set({ eveningReview: null });
    }
  },
  loadCompletionStats: async (date) => {
    try {
      const targetDate = date || get().selectedDate;
      const res = await dailyPlanApi.getCompletionStats(targetDate);
      if (res.data) {
        set({
          completionStats: {
            date: res.data.date,
            totalCount: res.data.total_count || 0,
            completedCount: res.data.completed_count || 0,
            completionRate: res.data.completion_rate || 0,
            schedules: (res.data.schedules || []).map((s: any) => ({
              id: s.id,
              title: s.title,
              description: '',
              startTime: s.start_time,
              endTime: s.end_time,
              priority: s.priority,
              category: s.category,
              completed: s.completed
            }))
          }
        });
      }
    } catch (e) {
      console.error('Failed to load completion stats:', e);
    }
  },
  loadDailyPlan: async (date) => {
    try {
      const targetDate = date || get().selectedDate;
      set({ morningPlan: null, eveningReview: null, completionStats: null });
      
      const res = await dailyPlanApi.getDailyPlan(targetDate);
      const data = res.data;
      
      let morningPlanData: MorningPlan | null = null;
      let eveningReviewData: EveningReview | null = null;
      
      if (data.morning_plan) {
        morningPlanData = {
          id: data.morning_plan.id,
          date: data.morning_plan.date,
          focusItems: data.morning_plan.focus_items,
          priorities: data.morning_plan.priorities,
          scheduleIds: data.morning_plan.schedule_ids,
          note: data.morning_plan.note,
          createdAt: data.morning_plan.created_at
        };
      }
      
      if (data.evening_review) {
        eveningReviewData = {
          id: data.evening_review.id,
          date: data.evening_review.date,
          completedCount: parseInt(data.evening_review.completed_count),
          totalCount: parseInt(data.evening_review.total_count),
          completionRate: parseFloat(data.evening_review.completion_rate),
          highlights: data.evening_review.highlights,
          improvements: data.evening_review.improvements,
          summary: data.evening_review.summary,
          mood: data.evening_review.mood,
          createdAt: data.evening_review.created_at
        };
      }
      
      const completionStatsData: CompletionStats = {
        date: data.date,
        totalCount: data.completion_stats.total_count,
        completedCount: data.completion_stats.completed_count,
        completionRate: data.completion_stats.completion_rate,
        schedules: get().schedules
      };
      
      set({
        morningPlan: morningPlanData,
        eveningReview: eveningReviewData,
        completionStats: completionStatsData
      });
    } catch (e) {
      console.error('Failed to load daily plan:', e);
      set({ morningPlan: null, eveningReview: null, completionStats: null });
    }
  },
  createMorningPlan: async (data) => {
    try {
      const targetDate = get().selectedDate;
      await dailyPlanApi.createMorningPlan({
        date: targetDate,
        focus_items: data.focusItems,
        priorities: data.priorities,
        schedule_ids: data.scheduleIds,
        note: data.note
      });
      await get().loadDailyPlan(targetDate);
    } catch (e) {
      console.error('Failed to create morning plan:', e);
      throw e;
    }
  },
  updateMorningPlan: async (date, data) => {
    try {
      const updateData: any = {};
      if (data.focusItems !== undefined) updateData.focus_items = data.focusItems;
      if (data.priorities !== undefined) updateData.priorities = data.priorities;
      if (data.scheduleIds !== undefined) updateData.schedule_ids = data.scheduleIds;
      if (data.note !== undefined) updateData.note = data.note;
      
      await dailyPlanApi.updateMorningPlan(date, updateData);
      await get().loadDailyPlan(date);
    } catch (e) {
      console.error('Failed to update morning plan:', e);
      throw e;
    }
  },
  generateMorningSuggestion: async (date) => {
    try {
      const res = await dailyPlanApi.generateMorningSuggestion(date);
      return res.data;
    } catch (e) {
      console.error('Failed to generate morning suggestion:', e);
      return null;
    }
  },
  createEveningReview: async (data) => {
    try {
      const targetDate = get().selectedDate;
      await dailyPlanApi.createEveningReview({
        date: targetDate,
        highlights: data.highlights,
        improvements: data.improvements,
        summary: data.summary,
        mood: data.mood
      });
      await get().loadDailyPlan(targetDate);
    } catch (e) {
      console.error('Failed to create evening review:', e);
      throw e;
    }
  },
  updateEveningReview: async (date, data) => {
    try {
      await dailyPlanApi.updateEveningReview(date, data);
      await get().loadDailyPlan(date);
    } catch (e) {
      console.error('Failed to update evening review:', e);
      throw e;
    }
  },
  setMorningPlan: (plan) => set({ morningPlan: plan }),
  setEveningReview: (review) => set({ eveningReview: review }),
  monthlyGoals: [],
  currentGoalDetails: null,
  monthProgress: null,
  dailyActions: [],
  loadMonthlyGoals: async (month) => {
    set({ loading: true });
    try {
      const res = await monthlyGoalApi.list(month);
      const goals: MonthlyGoal[] = res.data.map((g: any) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        month: g.month,
        category: g.category,
        priority: g.priority,
        status: g.status,
        progress: parseFloat(g.progress) || 0,
        createdAt: g.created_at
      }));
      set({ monthlyGoals: goals });
    } catch (e) {
      console.error('Failed to load monthly goals:', e);
    } finally {
      set({ loading: false });
    }
  },
  loadGoalDetails: async (goalId) => {
    set({ loading: true });
    try {
      const res = await monthlyGoalApi.get(goalId);
      const data = res.data;
      const goal: MonthlyGoalWithDetails = {
        id: data.id,
        title: data.title,
        description: data.description,
        month: data.month,
        category: data.category,
        priority: data.priority,
        status: data.status,
        progress: parseFloat(data.progress) || 0,
        createdAt: data.created_at,
        weeklyActions: (data.weekly_actions || []).map((wa: any) => ({
          id: wa.id,
          monthlyGoalId: wa.monthly_goal_id,
          title: wa.title,
          description: wa.description,
          weekNumber: parseInt(wa.week_number),
          startDate: wa.start_date,
          endDate: wa.end_date,
          completed: wa.completed,
          createdAt: wa.created_at,
          dailyActions: (wa.daily_actions || []).map((da: any) => ({
            id: da.id,
            weeklyActionId: da.weekly_action_id,
            monthlyGoalId: da.monthly_goal_id,
            title: da.title,
            description: da.description,
            date: da.date,
            scheduleId: da.schedule_id,
            completed: da.completed,
            createdAt: da.created_at
          }))
        }))
      };
      set({ currentGoalDetails: goal });
    } catch (e) {
      console.error('Failed to load goal details:', e);
    } finally {
      set({ loading: false });
    }
  },
  createMonthlyGoal: async (data) => {
    try {
      const res = await monthlyGoalApi.create(data);
      const goal: MonthlyGoal = {
        id: res.data.id,
        title: res.data.title,
        description: res.data.description,
        month: res.data.month,
        category: res.data.category,
        priority: res.data.priority,
        status: res.data.status,
        progress: parseFloat(res.data.progress) || 0,
        createdAt: res.data.created_at
      };
      set({ monthlyGoals: [goal, ...get().monthlyGoals] });
      return goal;
    } catch (e) {
      console.error('Failed to create monthly goal:', e);
      throw e;
    }
  },
  updateMonthlyGoal: async (id, data) => {
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.status !== undefined) updateData.status = data.status;
      await monthlyGoalApi.update(id, updateData);
      set({
        monthlyGoals: get().monthlyGoals.map(g => g.id === id ? { ...g, ...data } : g)
      });
    } catch (e) {
      console.error('Failed to update monthly goal:', e);
      throw e;
    }
  },
  deleteMonthlyGoal: async (id) => {
    try {
      await monthlyGoalApi.delete(id);
      set({
        monthlyGoals: get().monthlyGoals.filter(g => g.id !== id)
      });
    } catch (e) {
      console.error('Failed to delete monthly goal:', e);
      throw e;
    }
  },
  getMonthWeeks: async (month) => {
    try {
      const res = await monthlyGoalApi.getMonthWeeks(month);
      return res.data.weeks;
    } catch (e) {
      console.error('Failed to get month weeks:', e);
      return [];
    }
  },
  createWeeklyAction: async (data) => {
    try {
      const res = await monthlyGoalApi.createWeeklyAction(data);
      const action: WeeklyAction = {
        id: res.data.id,
        monthlyGoalId: res.data.monthly_goal_id,
        title: res.data.title,
        description: res.data.description,
        weekNumber: parseInt(res.data.week_number),
        startDate: res.data.start_date,
        endDate: res.data.end_date,
        completed: res.data.completed,
        createdAt: res.data.created_at
      };
      return action;
    } catch (e) {
      console.error('Failed to create weekly action:', e);
      throw e;
    }
  },
  updateWeeklyAction: async (id, data) => {
    try {
      await monthlyGoalApi.updateWeeklyAction(id, data);
    } catch (e) {
      console.error('Failed to update weekly action:', e);
      throw e;
    }
  },
  deleteWeeklyAction: async (id) => {
    try {
      await monthlyGoalApi.deleteWeeklyAction(id);
    } catch (e) {
      console.error('Failed to delete weekly action:', e);
      throw e;
    }
  },
  createDailyAction: async (data) => {
    try {
      const res = await monthlyGoalApi.createDailyAction(data);
      const action: DailyAction = {
        id: res.data.id,
        weeklyActionId: res.data.weekly_action_id,
        monthlyGoalId: res.data.monthly_goal_id,
        title: res.data.title,
        description: res.data.description,
        date: res.data.date,
        scheduleId: res.data.schedule_id,
        completed: res.data.completed,
        createdAt: res.data.created_at
      };
      return action;
    } catch (e) {
      console.error('Failed to create daily action:', e);
      throw e;
    }
  },
  updateDailyAction: async (id, data) => {
    try {
      await monthlyGoalApi.updateDailyAction(id, data);
    } catch (e) {
      console.error('Failed to update daily action:', e);
      throw e;
    }
  },
  deleteDailyAction: async (id) => {
    try {
      await monthlyGoalApi.deleteDailyAction(id);
    } catch (e) {
      console.error('Failed to delete daily action:', e);
      throw e;
    }
  },
  loadGoalProgress: async (goalId) => {
    try {
      const res = await monthlyGoalApi.getGoalProgress(goalId);
      const progress: MonthlyGoalProgress = {
        goalId: res.data.goal_id,
        goalTitle: res.data.goal_title,
        totalWeeklyActions: res.data.total_weekly_actions,
        completedWeeklyActions: res.data.completed_weekly_actions,
        totalDailyActions: res.data.total_daily_actions,
        completedDailyActions: res.data.completed_daily_actions,
        overallProgress: res.data.overall_progress,
        weeklyBreakdown: res.data.weekly_breakdown.map((wb: any) => ({
          weekNumber: wb.week_number,
          total: wb.total,
          completed: wb.completed,
          progress: wb.progress
        }))
      };
      return progress;
    } catch (e) {
      console.error('Failed to load goal progress:', e);
      return null;
    }
  },
  loadMonthProgress: async (month) => {
    set({ loading: true });
    try {
      const res = await monthlyGoalApi.getMonthProgress(month);
      const progressList: MonthlyGoalProgress[] = res.data.goals.map((g: any) => ({
        goalId: g.goal_id,
        goalTitle: g.goal_title,
        totalWeeklyActions: g.total_weekly_actions,
        completedWeeklyActions: g.completed_weekly_actions,
        totalDailyActions: g.total_daily_actions,
        completedDailyActions: g.completed_daily_actions,
        overallProgress: g.overall_progress,
        weeklyBreakdown: g.weekly_breakdown.map((wb: any) => ({
          weekNumber: wb.week_number,
          total: wb.total,
          completed: wb.completed,
          progress: wb.progress
        }))
      }));
      set({ monthProgress: progressList });
    } catch (e) {
      console.error('Failed to load month progress:', e);
    } finally {
      set({ loading: false });
    }
  },
  loadDailyActions: async (date) => {
    try {
      const res = await monthlyGoalApi.getDailyActions(date);
      const actions = res.data.map((a: any) => ({
        id: a.id,
        weeklyActionId: a.weekly_action_id,
        monthlyGoalId: a.monthly_goal_id,
        title: a.title,
        description: a.description,
        date: a.date,
        scheduleId: a.schedule_id,
        completed: a.completed,
        createdAt: a.created_at,
        goalTitle: a.goal_title,
        goalCategory: a.goal_category,
        weeklyTitle: a.weekly_title
      }));
      set({ dailyActions: actions });
    } catch (e) {
      console.error('Failed to load daily actions:', e);
    }
  },
  setCurrentGoalDetails: (goal) => set({ currentGoalDetails: goal }),
  loadExceptionDays: async (startDate, endDate) => {
    set({ loading: true });
    try {
      const res = await exceptionDayApi.list(startDate, endDate);
      const days: ExceptionDay[] = res.data.map((d: any) => ({
        id: d.id,
        date: d.date,
        type: d.type,
        name: d.name,
        description: d.description,
        rule: d.rule,
        createdAt: d.created_at
      }));
      set({ exceptionDays: days });
    } catch (e) {
      console.error('Failed to load exception days:', e);
    } finally {
      set({ loading: false });
    }
  },
  loadExceptionDay: async (date) => {
    try {
      const res = await exceptionDayApi.get(date);
      const data = res.data;
      const day: ExceptionDayWithDetails = {
        id: data.id,
        date: data.date,
        type: data.type,
        name: data.name,
        description: data.description,
        rule: data.rule,
        createdAt: data.created_at,
        affectedSchedules: data.affected_schedules.map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          startTime: s.start_time,
          endTime: s.end_time,
          priority: s.priority,
          category: s.category,
          completed: s.completed,
          recurring: s.recurring
        })),
        affectedHabits: data.affected_habits.map((h: any) => ({
          id: h.id,
          name: h.name,
          icon: h.icon,
          color: h.color,
          target: parseInt(h.target),
          unit: h.unit,
          currentStreak: parseInt(h.current_streak),
          history: [],
          reminder: h.reminder
        }))
      };
      set({ currentExceptionDay: day });
    } catch (e) {
      console.error('Failed to load exception day:', e);
      set({ currentExceptionDay: null });
    }
  },
  checkExceptionDay: async (date) => {
    try {
      const res = await exceptionDayApi.check(date);
      if (res.data.is_exception_day) {
        const day: ExceptionDay = {
          id: res.data.exception_day.id,
          date: res.data.exception_day.date,
          type: res.data.exception_day.type,
          name: res.data.exception_day.name,
          description: res.data.exception_day.description,
          rule: res.data.exception_day.rule
        };
        set({ checkedExceptionDay: day });
        return day;
      }
      set({ checkedExceptionDay: null });
      return null;
    } catch (e) {
      console.error('Failed to check exception day:', e);
      return null;
    }
  },
  createExceptionDay: async (data) => {
    try {
      const res = await exceptionDayApi.create(data);
      const day: ExceptionDay = {
        id: res.data.id,
        date: res.data.date,
        type: res.data.type,
        name: res.data.name,
        description: res.data.description,
        rule: res.data.rule,
        createdAt: res.data.created_at
      };
      set({ exceptionDays: [...get().exceptionDays, day] });
      return day;
    } catch (e) {
      console.error('Failed to create exception day:', e);
      throw e;
    }
  },
  updateExceptionDay: async (id, data) => {
    try {
      const updateData: any = {};
      if (data.date !== undefined) updateData.date = data.date;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.rule !== undefined) updateData.rule = data.rule;
      
      await exceptionDayApi.update(id, updateData);
      set({
        exceptionDays: get().exceptionDays.map(d => d.id === id ? { ...d, ...data } : d)
      });
    } catch (e) {
      console.error('Failed to update exception day:', e);
      throw e;
    }
  },
  deleteExceptionDay: async (id) => {
    try {
      await exceptionDayApi.delete(id);
      set({
        exceptionDays: get().exceptionDays.filter(d => d.id !== id)
      });
    } catch (e) {
      console.error('Failed to delete exception day:', e);
      throw e;
    }
  },
  applyExceptionDay: async (id) => {
    try {
      const res = await exceptionDayApi.apply(id);
      return res.data;
    } catch (e) {
      console.error('Failed to apply exception day:', e);
      return null;
    }
  },
  setCurrentExceptionDay: (day) => set({ currentExceptionDay: day }),
  calculateScheduleWarnings: (schedules, now) => {
    const warnings: ScheduleWarning[] = [];
    const nowTime = now.getTime();

    schedules.forEach(schedule => {
      if (schedule.completed) return;

      const endTime = new Date(schedule.endTime).getTime();
      const minutesRemaining = Math.round((endTime - nowTime) / (1000 * 60));

      if (minutesRemaining <= 0) {
        warnings.push({
          type: 'schedule_timeout',
          schedule,
          warningLevel: 'critical',
          minutesRemaining,
          deadline: schedule.endTime
        });
      } else if (minutesRemaining <= 30) {
        warnings.push({
          type: 'schedule_timeout',
          schedule,
          warningLevel: 'critical',
          minutesRemaining,
          deadline: schedule.endTime
        });
      } else if (minutesRemaining <= 60) {
        warnings.push({
          type: 'schedule_timeout',
          schedule,
          warningLevel: 'warning',
          minutesRemaining,
          deadline: schedule.endTime
        });
      } else if (minutesRemaining <= 120) {
        warnings.push({
          type: 'schedule_timeout',
          schedule,
          warningLevel: 'info',
          minutesRemaining,
          deadline: schedule.endTime
        });
      }
    });

    return warnings.sort((a, b) => a.minutesRemaining - b.minutesRemaining);
  },
  calculateHabitWarnings: (habits, now, selectedDate) => {
    const warnings: HabitWarning[] = [];
    const todayStr = selectedDate;

    habits.forEach(habit => {
      const todayRecord = habit.history.find(r => r.date === todayStr);
      if (todayRecord?.completed) return;

      const sortedHistory = [...habit.history].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      let daysSinceLastCompletion = 0;
      const checkDate = new Date(todayStr);

      for (let i = 0; i < 30; i++) {
        const dateStr = formatDate(checkDate);
        const record = sortedHistory.find(r => r.date === dateStr);
        if (record?.completed) break;
        daysSinceLastCompletion++;
        checkDate.setDate(checkDate.getDate() - 1);
      }

      const currentHour = now.getHours();
      let warningLevel: WarningLevel = 'info';

      if (daysSinceLastCompletion >= 1) {
        if (currentHour >= 22 || daysSinceLastCompletion >= 2) {
          warningLevel = 'critical';
        } else if (currentHour >= 18 || daysSinceLastCompletion >= 1) {
          warningLevel = 'warning';
        } else {
          warningLevel = 'info';
        }

        warnings.push({
          type: 'habit_streak',
          habit,
          warningLevel,
          daysSinceLastCompletion,
          currentStreak: habit.currentStreak
        });
      }
    });

    return warnings.sort((a, b) => {
      const levelOrder = { critical: 0, warning: 1, info: 2 };
      return levelOrder[a.warningLevel] - levelOrder[b.warningLevel] ||
             b.daysSinceLastCompletion - a.daysSinceLastCompletion;
    });
  },
  calculateLongPendingWarnings: (schedules, dailyActions, weeklyActions, now) => {
    const warnings: LongPendingWarning[] = [];
    const nowTime = now.getTime();

    schedules.forEach(schedule => {
      if (schedule.completed) return;

      const startTime = new Date(schedule.startTime).getTime();
      const daysPending = Math.floor((nowTime - startTime) / (1000 * 60 * 60 * 24));

      if (daysPending >= 3) {
        let warningLevel: WarningLevel = 'info';
        if (daysPending >= 7 || schedule.priority === 'high') {
          warningLevel = 'critical';
        } else if (daysPending >= 5 || schedule.priority === 'medium') {
          warningLevel = 'warning';
        }

        warnings.push({
          type: 'long_pending',
          item: schedule,
          itemType: 'schedule',
          warningLevel,
          daysPending,
          createdDate: schedule.startTime.split('T')[0]
        });
      }
    });

    dailyActions.forEach(action => {
      if (action.completed) return;

      const actionDate = new Date(action.date).getTime();
      const daysPending = Math.floor((nowTime - actionDate) / (1000 * 60 * 60 * 24));

      if (daysPending >= 2) {
        let warningLevel: WarningLevel = 'info';
        if (daysPending >= 5) {
          warningLevel = 'critical';
        } else if (daysPending >= 3) {
          warningLevel = 'warning';
        }

        warnings.push({
          type: 'long_pending',
          item: action,
          itemType: 'daily_action',
          warningLevel,
          daysPending,
          createdDate: action.date
        });
      }
    });

    weeklyActions.forEach(action => {
      if (action.completed) return;

      const endDate = new Date(action.endDate).getTime();
      const daysPending = Math.floor((nowTime - endDate) / (1000 * 60 * 60 * 24));

      if (daysPending >= 1) {
        let warningLevel: WarningLevel = 'info';
        if (daysPending >= 3) {
          warningLevel = 'critical';
        } else if (daysPending >= 2) {
          warningLevel = 'warning';
        }

        warnings.push({
          type: 'long_pending',
          item: action,
          itemType: 'weekly_action',
          warningLevel,
          daysPending,
          createdDate: action.startDate
        });
      }
    });

    return warnings.sort((a, b) => {
      const levelOrder = { critical: 0, warning: 1, info: 2 };
      return levelOrder[a.warningLevel] - levelOrder[b.warningLevel] ||
             b.daysPending - a.daysPending;
    });
  },
  loadWarningCenter: () => {
    const { schedules, habits, dailyActions, selectedDate } = get();
    const now = new Date();

    const scheduleWarnings = get().calculateScheduleWarnings(schedules, now);
    const habitWarnings = get().calculateHabitWarnings(habits, now, selectedDate);

    const allWeeklyActions: WeeklyAction[] = [];
    const { currentGoalDetails } = get();
    if (currentGoalDetails) {
      currentGoalDetails.weeklyActions.forEach(wa => {
        allWeeklyActions.push(wa);
      });
    }

    const longPendingWarnings = get().calculateLongPendingWarnings(
      schedules,
      dailyActions,
      allWeeklyActions,
      now
    );

    const data: WarningCenterData = {
      scheduleWarnings,
      habitWarnings,
      longPendingWarnings,
      totalCount: scheduleWarnings.length + habitWarnings.length + longPendingWarnings.length,
      criticalCount: [...scheduleWarnings, ...habitWarnings, ...longPendingWarnings].filter(w => w.warningLevel === 'critical').length,
      warningCount: [...scheduleWarnings, ...habitWarnings, ...longPendingWarnings].filter(w => w.warningLevel === 'warning').length,
      infoCount: [...scheduleWarnings, ...habitWarnings, ...longPendingWarnings].filter(w => w.warningLevel === 'info').length,
      lastUpdated: now.toISOString()
    };

    set({ warningCenterData: data });
  },
  loadMicroTasks: async () => {
    try {
      const res = await fragmentTimeApi.listMicroTasks();
      const tasks: MicroTask[] = res.data.tasks;
      set({ microTasks: tasks });
    } catch (e) {
      console.error('Failed to load micro tasks:', e);
    }
  },
  createMicroTask: async (data) => {
    try {
      const res = await fragmentTimeApi.createMicroTask({
        title: data.title,
        description: data.description,
        duration_minutes: data.durationMinutes,
        category: data.category,
        icon: data.icon,
        priority: data.priority,
        is_habit: data.isHabit,
        habit_id: data.habitId,
        color: data.color,
      });
      const task: MicroTask = res.data;
      set({ microTasks: [...get().microTasks, task] });
      return task;
    } catch (e) {
      console.error('Failed to create micro task:', e);
      return null;
    }
  },
  updateMicroTask: async (id, data) => {
    try {
      const updateData: any = {};
      if (data.title !== undefined) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.durationMinutes !== undefined) updateData.duration_minutes = data.durationMinutes;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.isHabit !== undefined) updateData.is_habit = data.isHabit;
      if (data.habitId !== undefined) updateData.habit_id = data.habitId;
      if (data.color !== undefined) updateData.color = data.color;

      await fragmentTimeApi.updateMicroTask(id, updateData);
      set({
        microTasks: get().microTasks.map(t => t.id === id ? { ...t, ...data } : t)
      });
    } catch (e) {
      console.error('Failed to update micro task:', e);
    }
  },
  deleteMicroTask: async (id) => {
    try {
      await fragmentTimeApi.deleteMicroTask(id);
      set({
        microTasks: get().microTasks.filter(t => t.id !== id)
      });
    } catch (e) {
      console.error('Failed to delete micro task:', e);
    }
  },
  loadFragmentRecommendations: async (date, maxDuration, minDuration) => {
    set({ fragmentRecommendationsLoading: true });
    try {
      const targetDate = date || get().selectedDate;
      const res = await fragmentTimeApi.getRecommendations({
        date: targetDate,
        maxDuration,
        minDuration,
      });

      const recommendations: FragmentRecommendation[] = res.data.recommendations.map((r: any) => ({
        slot: {
          date: r.slot.date,
          startTime: r.slot.start_time,
          endTime: r.slot.end_time,
          durationMinutes: r.slot.duration_minutes,
          beforeSchedule: r.slot.before_schedule ? {
            id: r.slot.before_schedule.id,
            title: r.slot.before_schedule.title,
            description: r.slot.before_schedule.description,
            startTime: r.slot.before_schedule.start_time,
            endTime: r.slot.before_schedule.end_time,
            priority: r.slot.before_schedule.priority,
            category: r.slot.before_schedule.category,
            completed: r.slot.before_schedule.completed,
          } : undefined,
          afterSchedule: r.slot.after_schedule ? {
            id: r.slot.after_schedule.id,
            title: r.slot.after_schedule.title,
            description: r.slot.after_schedule.description,
            startTime: r.slot.after_schedule.start_time,
            endTime: r.slot.after_schedule.end_time,
            priority: r.slot.after_schedule.priority,
            category: r.slot.after_schedule.category,
            completed: r.slot.after_schedule.completed,
          } : undefined,
        },
        suggestions: r.suggestions.map((s: any) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          durationMinutes: s.durationMinutes,
          category: s.category,
          icon: s.icon,
          priority: s.priority,
          isHabit: s.isHabit,
          habitId: s.habitId,
          color: s.color,
        })),
        reason: r.reason,
      }));

      set({ fragmentRecommendations: recommendations });
    } catch (e) {
      console.error('Failed to load fragment recommendations:', e);
    } finally {
      set({ fragmentRecommendationsLoading: false });
    }
  },
  confirmFragmentTask: async (microTaskId, startTime, endTime, date) => {
    try {
      const res = await fragmentTimeApi.confirmTask({
        microTaskId,
        startTime,
        endTime,
        date,
      });

      const schedule: Schedule = {
        id: res.data.schedule.id,
        title: res.data.schedule.title,
        description: res.data.schedule.description,
        startTime: res.data.schedule.start_time,
        endTime: res.data.schedule.end_time,
        priority: res.data.schedule.priority,
        category: res.data.schedule.category,
        completed: res.data.schedule.completed,
      };

      set({ schedules: [...get().schedules, schedule] });
      return schedule;
    } catch (e) {
      console.error('Failed to confirm fragment task:', e);
      return null;
    }
  },
  clearFragmentRecommendations: () => {
    set({ fragmentRecommendations: [] });
  },
}));
