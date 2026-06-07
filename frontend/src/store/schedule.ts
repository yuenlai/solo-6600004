import { create } from 'zustand';
import { Schedule, Habit, FocusSession } from '../types';

interface ScheduleState {
  schedules: Schedule[];
  habits: Habit[];
  focusSession: FocusSession | null;
  selectedDate: string;
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
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [], habits: [], focusSession: null,
  selectedDate: new Date().toISOString().split('T')[0],
  addSchedule: (s) => set({ schedules: [...get().schedules, s] }),
  addSchedules: (newSchedules) => set({ schedules: [...get().schedules, ...newSchedules] }),
  setSchedules: (schedules) => set({ schedules }),
  updateSchedule: (id, updates) => set({
    schedules: get().schedules.map(s => s.id === id ? { ...s, ...updates } : s)
  }),
  deleteSchedule: (id) => set({ schedules: get().schedules.filter(s => s.id !== id) }),
  toggleComplete: (id) => set({
    schedules: get().schedules.map(s => s.id === id ? { ...s, completed: !s.completed } : s)
  }),
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
