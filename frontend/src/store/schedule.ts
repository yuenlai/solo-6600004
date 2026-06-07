import { create } from 'zustand';
import { Schedule, Habit, FocusSession, HabitChallenge, MorningPlan, EveningReview, CompletionStats, InterruptionStatistics } from '../types';
import { scheduleApi, challengeApi, habitApi, dailyPlanApi, focusSessionApi } from '../services/api';
import { getWeekStartDate, addDays, formatDate } from '../data/weekTemplates';

interface ScheduleState {
  schedules: Schedule[];
  habits: Habit[];
  challenges: HabitChallenge[];
  focusSession: FocusSession | null;
  focusSessions: FocusSession[];
  interruptionStatistics: InterruptionStatistics | null;
  selectedDate: string;
  viewMode: 'day' | 'week';
  loading: boolean;
  morningPlan: MorningPlan | null;
  eveningReview: EveningReview | null;
  completionStats: CompletionStats | null;
  addSchedule: (s: Schedule) => void;
  addSchedules: (s: Schedule[]) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  toggleComplete: (id: string) => void;
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
  setViewMode: (mode: 'day' | 'week') => void;
  setSchedules: (schedules: Schedule[]) => void;
  loadSchedules: (date?: string) => Promise<void>;
  loadWeekSchedules: (weekStartDate?: string) => Promise<void>;
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
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [], habits: [], challenges: [], focusSession: null,
  focusSessions: [],
  interruptionStatistics: null,
  selectedDate: new Date().toISOString().split('T')[0],
  viewMode: 'day',
  loading: false,
  morningPlan: null,
  eveningReview: null,
  completionStats: null,
  addSchedule: (s) => set({ schedules: [...get().schedules, s] }),
  addSchedules: (newSchedules) => set({ schedules: [...get().schedules, ...newSchedules] }),
  setSchedules: (schedules) => set({ schedules }),
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
        recurring: s.recurring
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
        recurring: s.recurring
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
        set({
          schedules: get().schedules.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
        });
      } catch (e) {
        console.error('Failed to toggle schedule:', e);
      }
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
}));
