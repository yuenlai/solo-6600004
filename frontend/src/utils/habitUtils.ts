import { HabitRecord } from '../types';

export const deduplicateHabitRecords = (records: HabitRecord[]): HabitRecord[] => {
  const seen = new Map<string, HabitRecord>();
  
  records.forEach(record => {
    const existing = seen.get(record.date);
    if (!existing) {
      seen.set(record.date, record);
    } else if (record.completed && !existing.completed) {
      seen.set(record.date, record);
    }
  });
  
  return Array.from(seen.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
};

export const getHabitCompletionMap = (records: HabitRecord[]): Map<string, boolean> => {
  const map = new Map<string, boolean>();
  const uniqueRecords = deduplicateHabitRecords(records);
  uniqueRecords.forEach(r => {
    if (r.completed) map.set(r.date, true);
  });
  return map;
};

export const getUniqueCompletedDates = (records: HabitRecord[]): string[] => {
  const uniqueRecords = deduplicateHabitRecords(records);
  return uniqueRecords
    .filter(r => r.completed)
    .map(r => r.date)
    .sort();
};

export const calculateTotalCompleted = (records: HabitRecord[]): number => {
  return getUniqueCompletedDates(records).length;
};

const parseDate = (dateStr: string): Date => {
  return new Date(dateStr + 'T00:00:00');
};

export const calculateCurrentStreak = (records: HabitRecord[]): number => {
  const uniqueDates = getUniqueCompletedDates(records);
  if (uniqueDates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const latestDate = parseDate(uniqueDates[uniqueDates.length - 1]);
  const daysSinceLatest = Math.floor(
    (today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLatest > 1) return 0;
  
  let currentStreak = 1;
  for (let i = uniqueDates.length - 2; i >= 0; i--) {
    const prevDate = parseDate(uniqueDates[i + 1]);
    const currDate = parseDate(uniqueDates[i]);
    const delta = Math.floor(
      (prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (delta === 1) {
      currentStreak++;
    } else if (delta > 1) {
      break;
    }
  }
  
  return currentStreak;
};

export const calculateLongestStreak = (records: HabitRecord[]): number => {
  const uniqueDates = getUniqueCompletedDates(records);
  if (uniqueDates.length === 0) return 0;
  if (uniqueDates.length === 1) return 1;
  
  let longestStreak = 1;
  let tempStreak = 1;
  
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = parseDate(uniqueDates[i - 1]);
    const currDate = parseDate(uniqueDates[i]);
    const delta = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (delta === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else if (delta > 1) {
      tempStreak = 1;
    }
  }
  
  return longestStreak;
};

export const calculateCompletionRate = (records: HabitRecord[]): number => {
  const uniqueDates = getUniqueCompletedDates(records);
  if (uniqueDates.length === 0) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const firstDate = parseDate(uniqueDates[0]);
  const totalDays = Math.floor(
    (today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  
  return totalDays > 0 
    ? Math.round((uniqueDates.length / totalDays) * 1000) / 10 
    : 0;
};
