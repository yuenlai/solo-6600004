import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
export const scheduleApi = {
  list: (date?: string) => api.get('/schedules', { params: { date } }),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
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
