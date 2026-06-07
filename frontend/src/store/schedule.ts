import { create } from 'zustand';
import { Schedule, Habit, FocusSession, HabitChallenge } from '../types';
import { scheduleApi, challengeApi, habitApi } from '../services/api';
import { getWeekStartDate, addDays, formatDate } from '../data/weekTemplates';

interface ScheduleState {
  schedules: Schedule[];
  habits: Habit[];
  challenges: HabitChallenge[];
  focusSession: FocusSession | null;
  selectedDate: string;
  viewMode: 'day' | 'week';
  loading: boolean;
  addSchedule: (s: Schedule) => void;
  addSchedules: (s: Schedule[]) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  toggleComplete: (id: string) => void;
  addHabit: (h: Habit) => void;
  recordHabit: (habitId: string, date: string, value: number) => void;
  startFocus: (duration: number, scheduleId?: string) => void;
  endFocus: () => void;
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
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [], habits: [], challenges: [], focusSession: null,
  selectedDate: new Date().toISOString().split('T')[0],
  viewMode: 'day',
  loading: false,
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
  startFocus: (duration, scheduleId) => set({
    focusSession: { id: Date.now().toString(), duration, startTime: new Date().toISOString(), scheduleId, completed: false }
  }),
  endFocus: () => set({ focusSession: null }),
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
}));
