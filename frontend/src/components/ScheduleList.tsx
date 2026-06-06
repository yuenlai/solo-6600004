import React from 'react';
import { Schedule } from '../types';
import { useScheduleStore } from '../store/schedule';

export const ScheduleList: React.FC = () => {
  const { schedules, selectedDate, toggleComplete, deleteSchedule } = useScheduleStore();
  const daySchedules = schedules.filter(s => s.startTime.startsWith(selectedDate));

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
      <h2 style={{ margin: '0 0 16px' }}>📅 {selectedDate} 日程</h2>
      {daySchedules.length === 0 ? (
        <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>暂无日程安排</p>
      ) : daySchedules.map(s => (
        <div key={s.id} style={{
          display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
          marginBottom: '8px', borderRadius: '8px', background: s.completed ? '#e8f5e9' : '#fff',
          border: '1px solid #e0e0e0', textDecoration: s.completed ? 'line-through' : 'none'
        }}>
          <input type="checkbox" checked={s.completed} onChange={() => toggleComplete(s.id)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{s.title}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {s.startTime.split('T')[1]?.substring(0,5)} - {s.endTime?.split('T')[1]?.substring(0,5)}
            </div>
          </div>
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
            background: s.priority === 'high' ? '#ffcdd2' : s.priority === 'medium' ? '#fff9c4' : '#c8e6c9'
          }}>{s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}</span>
          <button onClick={() => deleteSchedule(s.id)} style={{
            border: 'none', background: 'none', cursor: 'pointer', color: '#999', fontSize: '18px'
          }}>×</button>
        </div>
      ))}
    </div>
  );
};
