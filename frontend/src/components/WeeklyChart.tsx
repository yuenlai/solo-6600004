import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const mockData = [
  { day: '周一', completed: 5, total: 7 }, { day: '周二', completed: 6, total: 8 },
  { day: '周三', completed: 4, total: 6 }, { day: '周四', completed: 7, total: 9 },
  { day: '周五', completed: 5, total: 5 }, { day: '周六', completed: 3, total: 4 },
  { day: '周日', completed: 2, total: 3 },
];

const COLORS = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0'];

export const WeeklyChart: React.FC = () => (
  <div style={{ padding: '16px' }}>
    <h3 style={{ margin: '0 0 12px' }}>📊 本周统计</h3>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={mockData}>
        <XAxis dataKey="day" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="total" fill="#e0e0e0" name="总计" />
        <Bar dataKey="completed" fill="#4caf50" name="完成" />
      </BarChart>
    </ResponsiveContainer>
  </div>
);
