import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
export const scheduleApi = {
  list: (date?: string) => api.get('/schedules', { params: { date } }),
  listByRange: (startDate: string, endDate: string) =>
    api.get('/schedules', { params: { start_date: startDate, end_date: endDate } }),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  parse: (text: string, date?: string) => api.post('/schedules/parse', { text, date }),
  batchCreate: (data: any[]) => api.post('/schedules/batch-create', data),
  batchParse: (text: string, date?: string, save?: boolean) => api.post('/schedules/batch-parse', { text, date, save }),
  checkConflict: (startTime: string, endTime: string, excludeId?: string, extra?: { title?: string; priority?: string; category?: string }) =>
    api.post('/schedules/check-conflict', { 
      start_time: startTime, 
      end_time: endTime, 
      exclude_id: excludeId,
      ...(extra || {})
    }),
  getRescheduleOptions: (data: {
    scheduleId?: string;
    title: string;
    preferredStartTime?: string;
    durationMinutes: number;
    priority: string;
    category: string;
    date?: string;
    maxOptions?: number;
  }) => api.post('/schedules/reschedule-options', {
    schedule_id: data.scheduleId,
    title: data.title,
    preferred_start_time: data.preferredStartTime,
    duration_minutes: data.durationMinutes,
    priority: data.priority,
    category: data.category,
    date: data.date,
    max_options: data.maxOptions || 5
  }),
  confirmReschedule: (scheduleId: string, newStartTime: string, newEndTime: string, optionId?: string) =>
    api.post('/schedules/confirm-reschedule', {
      schedule_id: scheduleId,
      new_start_time: newStartTime,
      new_end_time: newEndTime,
      option_id: optionId
    })
};
export const habitApi = {
  list: () => api.get('/habits'),
  create: (data: any) => api.post('/habits', data),
  record: (id: string, data: any) => api.post(`/habits/${id}/record`, data),
  delete: (id: string) => api.delete(`/habits/${id}`),
};
export const reportApi = {
  weekly: (weekStart: string) => api.get('/reports/weekly', { params: { weekStart } }),
  monthly: (month: string) => api.get('/reports/monthly', { params: { month } }),
};
export const challengeApi = {
  list: () => api.get('/challenges'),
  create: (data: any) => api.post('/challenges', data),
  record: (id: string, data: any) => api.post(`/challenges/${id}/record`, data),
  updateStatus: (id: string) => api.put(`/challenges/${id}/status`),
  delete: (id: string) => api.delete(`/challenges/${id}`),
};

export const dailyPlanApi = {
  getDailyPlan: (date: string) => api.get(`/daily-plans/${date}`),
  getMorningPlan: (date: string) => api.get(`/daily-plans/morning/${date}`),
  createMorningPlan: (data: {
    date: string;
    focus_items: string[];
    priorities: string[];
    schedule_ids: string[];
    note: string;
  }) => api.post('/daily-plans/morning', data),
  updateMorningPlan: (date: string, data: {
    focus_items?: string[];
    priorities?: string[];
    schedule_ids?: string[];
    note?: string;
  }) => api.put(`/daily-plans/morning/${date}`, data),
  generateMorningSuggestion: (date: string) => api.get(`/daily-plans/morning/generate-suggestion?date=${date}`),
  getCompletionStats: (date: string) => api.get(`/daily-plans/completion-stats/${date}`),
  getEveningReview: (date: string) => api.get(`/daily-plans/evening/${date}`),
  createEveningReview: (data: {
    date: string;
    highlights: string;
    improvements: string;
    summary: string;
    mood: string;
  }) => api.post('/daily-plans/evening', data),
  updateEveningReview: (date: string, data: {
    highlights?: string;
    improvements?: string;
    summary?: string;
    mood?: string;
  }) => api.put(`/daily-plans/evening/${date}`, data),
};

export const focusSessionApi = {
  list: (date?: string) => api.get('/focus-sessions', { params: { date } }),
  listByRange: (startDate: string, endDate: string) =>
    api.get('/focus-sessions', { params: { start_date: startDate, end_date: endDate } }),
  get: (id: string) => api.get(`/focus-sessions/${id}`),
  create: (data: { duration: number; start_time: string; schedule_id?: string }) =>
    api.post('/focus-sessions', data),
  update: (id: string, data: { end_time?: string; completed?: boolean; interrupted?: boolean }) =>
    api.put(`/focus-sessions/${id}`, data),
  delete: (id: string) => api.delete(`/focus-sessions/${id}`),
  getInterruptionStatistics: (startDate: string, endDate: string) =>
    api.get('/focus-sessions/statistics/interruptions', { params: { start_date: startDate, end_date: endDate } }),
};

export const monthlyGoalApi = {
  list: (month?: string) => api.get('/monthly-goals', { params: { month } }),
  get: (id: string) => api.get(`/monthly-goals/${id}`),
  create: (data: { title: string; description?: string; month: string; category?: string; priority?: string }) =>
    api.post('/monthly-goals', data),
  update: (id: string, data: { title?: string; description?: string; category?: string; priority?: string; status?: string }) =>
    api.put(`/monthly-goals/${id}`, data),
  delete: (id: string) => api.delete(`/monthly-goals/${id}`),
  getMonthWeeks: (month: string) => api.get(`/monthly-goals/weeks/${month}`),
  createBreakdown: (data: {
    monthly_goal_id: string;
    weekly_actions: Array<{
      monthly_goal_id: string;
      title: string;
      description?: string;
      week_number: number;
      start_date: string;
      end_date: string;
    }>;
    daily_actions?: Array<{
      weekly_action_id: string;
      monthly_goal_id: string;
      title: string;
      description?: string;
      date: string;
    }>;
  }) => api.post('/monthly-goals/breakdown', data),
  createWeeklyAction: (data: {
    monthly_goal_id: string;
    title: string;
    description?: string;
    week_number: number;
    start_date: string;
    end_date: string;
  }) => api.post('/monthly-goals/weekly-actions', data),
  updateWeeklyAction: (id: string, data: { title?: string; description?: string; completed?: boolean }) =>
    api.put(`/monthly-goals/weekly-actions/${id}`, data),
  deleteWeeklyAction: (id: string) => api.delete(`/monthly-goals/weekly-actions/${id}`),
  createDailyAction: (data: {
    weekly_action_id: string;
    monthly_goal_id: string;
    title: string;
    description?: string;
    date: string;
  }) => api.post('/monthly-goals/daily-actions', data),
  updateDailyAction: (id: string, data: { title?: string; description?: string; completed?: boolean; schedule_id?: string }) =>
    api.put(`/monthly-goals/daily-actions/${id}`, data),
  deleteDailyAction: (id: string) => api.delete(`/monthly-goals/daily-actions/${id}`),
  getGoalProgress: (id: string) => api.get(`/monthly-goals/progress/${id}`),
  getMonthProgress: (month: string) => api.get(`/monthly-goals/progress/month/${month}`),
  getDailyActions: (date: string) => api.get(`/monthly-goals/daily/${date}`),
};

export const exceptionDayApi = {
  list: (startDate?: string, endDate?: string) =>
    api.get('/exception-days', { params: { start_date: startDate, end_date: endDate } }),
  get: (date: string) => api.get(`/exception-days/${date}`),
  check: (date: string) => api.get(`/exception-days/check/${date}`),
  create: (data: {
    date: string;
    type: string;
    name: string;
    description?: string;
    rule: {
      skipHabits: boolean;
      habitIdsToSkip: string[];
      skipSchedules: boolean;
      scheduleCategoriesToSkip: string[];
      rescheduleToNextWorkingDay: boolean;
      adjustWorkHours: boolean;
      workStartTime?: string;
      workEndTime?: string;
      note?: string;
    };
  }) => api.post('/exception-days', data),
  update: (id: string, data: {
    date?: string;
    type?: string;
    name?: string;
    description?: string;
    rule?: {
      skipHabits?: boolean;
      habitIdsToSkip?: string[];
      skipSchedules?: boolean;
      scheduleCategoriesToSkip?: string[];
      rescheduleToNextWorkingDay?: boolean;
      adjustWorkHours?: boolean;
      workStartTime?: string;
      workEndTime?: string;
      note?: string;
    };
  }) => api.put(`/exception-days/${id}`, data),
  delete: (id: string) => api.delete(`/exception-days/${id}`),
  apply: (id: string) => api.post(`/exception-days/${id}/apply`),
};

export const shareApi = {
  create: (data: { schedule_id: string; owner_name: string; shared_with: string; message?: string }) =>
    api.post('/schedule-shares', data),
  accept: (token: string, sharedWith: string) =>
    api.post('/schedule-shares/accept', { token, shared_with: sharedWith }),
  reject: (token: string, sharedWith: string) =>
    api.post('/schedule-shares/reject', { token, shared_with: sharedWith }),
  getOutgoing: (ownerName: string) =>
    api.get('/schedule-shares/outgoing', { params: { owner_name: ownerName } }),
  getIncoming: (sharedWith: string) =>
    api.get('/schedule-shares/incoming', { params: { shared_with: sharedWith } }),
  getAccepted: (userName: string) =>
    api.get('/schedule-shares/accepted', { params: { user_name: userName } }),
  sync: (userName: string) =>
    api.get('/schedule-shares/sync', { params: { user_name: userName } }),
  cancel: (shareId: string, ownerName: string) =>
    api.delete(`/schedule-shares/${shareId}`, { params: { owner_name: ownerName } }),
  getByToken: (token: string) => api.get(`/schedule-shares/token/${token}`),
};

export const fragmentTimeApi = {
  listMicroTasks: () => api.get('/fragment-time/micro-tasks'),
  createMicroTask: (data: any) => api.post('/fragment-time/micro-tasks', data),
  updateMicroTask: (id: string, data: any) => api.put(`/fragment-time/micro-tasks/${id}`, data),
  deleteMicroTask: (id: string) => api.delete(`/fragment-time/micro-tasks/${id}`),
  getRecommendations: (data: {
    date?: string;
    maxDuration?: number;
    minDuration?: number;
    maxRecommendations?: number;
  }) => api.post('/fragment-time/recommendations', {
    date: data.date,
    max_duration: data.maxDuration || 60,
    min_duration: data.minDuration || 5,
    max_recommendations: data.maxRecommendations || 5,
  }),
  confirmTask: (data: {
    microTaskId: string;
    startTime: string;
    endTime: string;
    date: string;
  }) => api.post('/fragment-time/confirm', {
    micro_task_id: data.microTaskId,
    start_time: data.startTime,
    end_time: data.endTime,
    date: data.date,
  }),
};

export default api;
