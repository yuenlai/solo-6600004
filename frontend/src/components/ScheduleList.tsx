import React, { useState } from 'react';
import { useScheduleStore } from '../store/schedule';
import { getWeekStartDate, addDays, formatDate } from '../data/weekTemplates';
import { Schedule } from '../types';
import { RescheduleAssistant } from './RescheduleAssistant';

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

interface ScheduleItemProps {
  s: Schedule;
  compact?: boolean;
  onReschedule: (schedule: Schedule) => void;
}

const ScheduleItem: React.FC<ScheduleItemProps> = ({ s, compact, onReschedule }) => {
  const { toggleComplete, deleteSchedule } = useScheduleStore();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: compact ? '6px' : '12px',
      padding: compact ? '6px 8px' : '12px',
      marginBottom: '6px', borderRadius: '6px',
      background: s.completed ? '#e8f5e9' : '#fff',
      border: '1px solid #e0e0e0',
      textDecoration: s.completed ? 'line-through' : 'none'
    }}>
      <input type="checkbox" checked={s.completed} onChange={() => toggleComplete(s.id)}
        style={compact ? { transform: 'scale(0.8)' } : {}} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: compact ? '12px' : '14px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {s.title}
        </div>
        <div style={{ fontSize: '11px', color: '#666' }}>
          {s.startTime.split('T')[1]?.substring(0,5)} - {s.endTime?.split('T')[1]?.substring(0,5)}
        </div>
      </div>
      {!compact && (
        <span style={{
          fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
          background: s.priority === 'high' ? '#ffcdd2' : s.priority === 'medium' ? '#fff9c4' : '#c8e6c9'
        }}>{s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}</span>
      )}
      {!compact && !s.completed && (
        <button
          onClick={(e) => { e.stopPropagation(); onReschedule(s); }}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: '#1a237e', fontSize: '14px', padding: '4px 8px',
            borderRadius: '4px'
          }}
          title="智能改期"
        >
          🔄
        </button>
      )}
      <button onClick={() => deleteSchedule(s.id)} style={{
        border: 'none', background: 'none', cursor: 'pointer',
        color: '#999', fontSize: compact ? '14px' : '18px'
      }}>×</button>
    </div>
  );
};

export const ScheduleList: React.FC = () => {
  const { schedules, selectedDate, viewMode, setViewMode, setSelectedDate } = useScheduleStore();
  const [rescheduleSchedule, setRescheduleSchedule] = useState<Schedule | null>(null);

  const getDurationMinutes = (start: string, end: string) => {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  };

  const handleReschedule = (schedule: Schedule) => {
    setRescheduleSchedule(schedule);
  };

  const getWeekDates = () => {
    const start = getWeekStartDate(new Date(selectedDate));
    return dayNames.map((_, i) => formatDate(addDays(start, i)));
  };

  const weekDates = getWeekDates();
  const isToday = (date: string) => date === new Date().toISOString().split('T')[0];

  const renderDayView = () => {
    const daySchedules = schedules.filter(s => s.startTime.startsWith(selectedDate));
    return (
      <div style={{ padding: '16px' }}>
        <h2 style={{ margin: '0 0 16px' }}>📅 {selectedDate} 日程</h2>
        {daySchedules.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', marginTop: '40px' }}>暂无日程安排</p>
        ) : daySchedules.map(s => <ScheduleItem key={s.id} s={s} onReschedule={handleReschedule} />)}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    const weekSchedules = schedules.filter(s => {
      const date = s.startTime.split('T')[0];
      return date >= weekStart && date <= weekEnd;
    });

    return (
      <div style={{ padding: '16px' }}>
        <h2 style={{ margin: '0 0 16px' }}>📅 {weekStart} ~ {weekEnd} 周视图</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
          {weekDates.map((date, idx) => {
            const daySchedules = weekSchedules.filter(s => s.startTime.startsWith(date));
            return (
              <div key={date} style={{
                background: isToday(date) ? '#e3f2fd' : '#fff',
                borderRadius: '8px',
                border: isToday(date) ? '2px solid #2196f3' : '1px solid #e0e0e0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '300px',
              }}>
                <div style={{
                  padding: '8px',
                  background: isToday(date) ? '#2196f3' : '#f5f5f5',
                  color: isToday(date) ? '#fff' : '#333',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onClick={() => { setViewMode('day'); setSelectedDate(date); }}
                >
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{dayNames[idx]}</div>
                  <div style={{ fontSize: '11px', opacity: 0.9 }}>{date.substring(5)}</div>
                  <div style={{ fontSize: '10px', marginTop: '2px' }}>
                    {daySchedules.length} 项
                  </div>
                </div>
                <div style={{ flex: 1, padding: '6px', overflowY: 'auto' }}>
                  {daySchedules.length === 0 ? (
                    <p style={{ color: '#ccc', textAlign: 'center', fontSize: '11px', marginTop: '20px' }}>
                      空
                    </p>
                  ) : daySchedules.map(s => <ScheduleItem key={s.id} s={s} compact onReschedule={handleReschedule} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '12px 16px',
          background: '#fff',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '13px', color: '#666', marginRight: '8px' }}>视图:</span>
        <button
          onClick={() => setViewMode('day')}
          style={{
            padding: '6px 16px',
            border: '1px solid #ddd',
            borderRadius: '16px',
            background: viewMode === 'day' ? '#1a237e' : '#fff',
            color: viewMode === 'day' ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >日视图</button>
        <button
          onClick={() => setViewMode('week')}
          style={{
            padding: '6px 16px',
            border: '1px solid #ddd',
            borderRadius: '16px',
            background: viewMode === 'week' ? '#1a237e' : '#fff',
            color: viewMode === 'week' ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >周视图</button>
        {viewMode === 'week' && (
          <span style={{ marginLeft: '12px', fontSize: '12px', color: '#999' }}>
            💡 点击日期可切换到日视图
          </span>
        )}
      </div>
      {viewMode === 'day' ? renderDayView() : renderWeekView()}
    </div>
      {rescheduleSchedule && (
        <RescheduleAssistant
          mode={{
            type: 'existing',
            schedule: rescheduleSchedule,
            title: rescheduleSchedule.title,
            durationMinutes: getDurationMinutes(rescheduleSchedule.startTime, rescheduleSchedule.endTime),
            priority: rescheduleSchedule.priority,
            category: rescheduleSchedule.category,
            preferredStartTime: rescheduleSchedule.startTime
          }}
          onClose={() => setRescheduleSchedule(null)}
          onConfirmed={() => setRescheduleSchedule(null)}
        />
      )}
    </>
  );
};
