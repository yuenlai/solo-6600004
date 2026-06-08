import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useScheduleStore } from '../store/schedule';
import { getWeekStartDate, addDays, formatDate } from '../data/weekTemplates';

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export const WeeklyChart: React.FC = () => {
  const { schedules, selectedDate, completionStats } = useScheduleStore();

  const chartData = useMemo(() => {
    const weekStart = getWeekStartDate(new Date(selectedDate));
    const data = dayNames.map((dayName, index) => {
      const date = formatDate(addDays(weekStart, index));
      const daySchedules = schedules.filter(s => s.startTime.startsWith(date));
      const total = daySchedules.length;
      const completed = daySchedules.filter(s => s.completed).length;
      return {
        day: dayName,
        date,
        completed,
        total,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    });
    return data;
  }, [schedules, selectedDate]);

  const weekSummary = useMemo(() => {
    const totalSchedules = chartData.reduce((sum, d) => sum + d.total, 0);
    const totalCompleted = chartData.reduce((sum, d) => sum + d.completed, 0);
    const overallRate = totalSchedules > 0 ? Math.round((totalCompleted / totalSchedules) * 100) : 0;
    return { totalSchedules, totalCompleted, overallRate };
  }, [chartData]);

  const getRateColor = (rate: number) => {
    if (rate >= 80) return '#4caf50';
    if (rate >= 60) return '#ffc107';
    return '#f44336';
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px' }}>📊 本周统计</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {completionStats && (
          <>
            <div style={{ padding: '16px', background: '#e3f2fd', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#666' }}>今日已完成</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>{completionStats.completedCount}</p>
            </div>
            <div style={{ padding: '16px', background: '#f3e5f5', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#666' }}>今日总计</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#7b1fa2' }}>{completionStats.totalCount}</p>
            </div>
            <div style={{ padding: '16px', background: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#666' }}>今日完成率</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: getRateColor(completionStats.completionRate) }}>{completionStats.completionRate}%</p>
            </div>
            <div style={{ padding: '16px', background: '#fff8e1', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#666' }}>本周完成率</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: getRateColor(weekSummary.overallRate) }}>{weekSummary.overallRate}%</p>
            </div>
          </>
        )}
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '10px', marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#333' }}>每日完成情况</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              tickFormatter={(value, index) => (
                chartData[index]?.date === todayStr ? `${value}*` : value
              )}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                value,
                name === 'total' ? '总计' : '完成',
              ]}
              labelFormatter={(label, payload: any[]) => {
                if (payload && payload[0]) {
                  const data = payload[0].payload;
                  return `${label} (${data.date}) - 完成率: ${data.rate}%`;
                }
                return label;
              }}
            />
            <Bar dataKey="total" fill="#e0e0e0" name="总计" radius={[4, 4, 0, 0]} />
            <Bar dataKey="completed" fill="#4caf50" name="完成" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background: '#fff', padding: '16px', borderRadius: '10px' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#333' }}>每日详情</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {chartData.map((item) => (
            <div
              key={item.date}
              style={{
                padding: '10px',
                background: item.date === todayStr ? '#e3f2fd' : '#fafafa',
                border: item.date === todayStr ? '1px solid #2196f3' : '1px solid #e0e0e0',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, color: item.date === todayStr ? '#1976d2' : '#333', marginBottom: '6px' }}>
                {item.day}
              </div>
              <div style={{ fontSize: '11px', color: '#999', marginBottom: '8px' }}>
                {item.date.substring(5)}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: getRateColor(item.rate), marginBottom: '4px' }}>
                {item.rate}%
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {item.completed}/{item.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
