import React from 'react';
import { useScheduleStore } from '../store/schedule';

export const HabitTracker: React.FC = () => {
  const { habits, recordHabit, selectedDate } = useScheduleStore();

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 12px' }}>🎯 习惯打卡</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {habits.map(h => {
          const todayRecord = h.history.find(r => r.date === selectedDate);
          return (
            <div key={h.id} style={{
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
              borderRadius: '8px', background: todayRecord?.completed ? '#e8f5e9' : '#fafafa',
              border: '1px solid #e0e0e0'
            }}>
              <span style={{ fontSize: '24px' }}>{h.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: '14px' }}>{h.name}</div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  �� 连续 {h.currentStreak} 天 | 目标: {h.target}{h.unit}
                </div>
              </div>
              {!todayRecord ? (
                <button onClick={() => recordHabit(h.id, selectedDate, h.target)}
                  style={{ padding: '6px 16px', borderRadius: '20px', border: 'none',
                    background: h.color || '#4caf50', color: '#fff', cursor: 'pointer', fontSize: '13px'
                  }}>打卡</button>
              ) : <span style={{ color: '#4caf50', fontSize: '13px' }}>✓ 已完成</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
