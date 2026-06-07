import { create } from 'zustand';
import { Schedule, Habit, FocusSession } from '../types';
import { scheduleApi } from '../services/api';

interface ScheduleState {
  schedules: Schedule[];
  habits: Habit[];
  focusSession: FocusSession | null;
  selectedDate: string;
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
  setSchedules: (schedules: Schedule[]) => void;
  loadSchedules: (date?: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [], habits: [], focusSession: null,
  selectedDate: new Date().toISOString().split('T')[0],
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
}));
