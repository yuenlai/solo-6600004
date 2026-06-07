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
  checkConflict: (startTime: string, endTime: string, excludeId?: string) =>
    api.post('/schedules/check-conflict', { start_time: startTime, end_time: endTime, exclude_id: excludeId }),
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
export default api;
