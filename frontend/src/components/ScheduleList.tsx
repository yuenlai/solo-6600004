import React, { useState } from 'react';
import { useScheduleStore } from '../store/schedule';
import { getWeekStartDate, addDays, formatDate } from '../data/weekTemplates';
import { Schedule } from '../types';
import { RescheduleAssistant } from './RescheduleAssistant';
import { ChallengeCard } from './HabitChallengeCard';
import { DragDropScheduler } from './DragDropScheduler';
import { MultiDayView } from './MultiDayView';

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
  const { schedules, selectedDate, viewMode, scheduleViewMode, setViewMode, setScheduleViewMode, setSelectedDate, challenges, deleteChallenge, checkedExceptionDay, exceptionDays, applyExceptionDay } = useScheduleStore();
  const [rescheduleSchedule, setRescheduleSchedule] = useState<Schedule | null>(null);
  const activeChallenges = challenges.filter(c => c.status === 'active');

  const getExceptionDayForDate = (date: string) => {
    return exceptionDays.find(d => d.date === date);
  };

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

  const handleDeleteChallenge = async (id: string) => {
    if (confirm('确定要删除这个挑战吗？')) {
      try {
        await deleteChallenge(id);
      } catch (e) {
        console.error('Failed to delete challenge:', e);
        alert('删除失败，请稍后重试');
      }
    }
  };

  const renderDayView = () => {
    const daySchedules = schedules.filter(s => s.startTime.startsWith(selectedDate));
    const todayException = getExceptionDayForDate(selectedDate);
    
    const typeConfig: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
      holiday: { label: '节假日', icon: '🎉', color: '#c62828', bgColor: '#ffebee' },
      business_trip: { label: '出差日', icon: '✈️', color: '#1565c0', bgColor: '#e3f2fd' },
      rest_day: { label: '休息日', icon: '🌴', color: '#2e7d32', bgColor: '#e8f5e9' },
      custom: { label: '自定义', icon: '📅', color: '#6a1b9a', bgColor: '#f3e5f5' },
    };

    return (
      <div style={{ padding: '16px' }}>
        {todayException && (
          <div style={{
            padding: '16px', borderRadius: '10px', marginBottom: '20px',
            background: typeConfig[todayException.type]?.bgColor || '#f5f5f5',
            border: `1px solid ${typeConfig[todayException.type]?.color || '#ddd'}30`
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', gap: '16px'
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  fontSize: '32px', width: '50px', height: '50px',
                  borderRadius: '10px', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {typeConfig[todayException.type]?.icon || '📅'}
                </div>
                <div>
                  <h3 style={{
                    margin: '0 0 4px', fontSize: '16px',
                    color: typeConfig[todayException.type]?.color || '#333'
                  }}>
                    {todayException.name}
                  </h3>
                  <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                    {typeConfig[todayException.type]?.label || '自定义'} · {todayException.date}
                  </div>
                  {todayException.description && (
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                      {todayException.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {todayException.rule?.skipHabits && (
                      <span style={{
                        padding: '3px 10px', fontSize: '11px', borderRadius: '12px',
                        background: '#fff', border: '1px solid #e0e0e0', color: '#666'
                      }}>
                        🚫 跳过习惯 {todayException.rule.habitIdsToSkip?.length > 0 ? `(${todayException.rule.habitIdsToSkip.length}个)` : ''}
                      </span>
                    )}
                    {todayException.rule?.skipSchedules && (
                      <span style={{
                        padding: '3px 10px', fontSize: '11px', borderRadius: '12px',
                        background: '#fff', border: '1px solid #e0e0e0', color: '#666'
                      }}>
                        🚫 跳过日程 {todayException.rule.scheduleCategoriesToSkip?.length > 0 ? `(${todayException.rule.scheduleCategoriesToSkip.join(', ')})` : ''}
                      </span>
                    )}
                    {todayException.rule?.rescheduleToNextWorkingDay && (
                      <span style={{
                        padding: '3px 10px', fontSize: '11px', borderRadius: '12px',
                        background: '#fff', border: '1px solid #e0e0e0', color: '#666'
                      }}>
                        🔄 自动改期到下一个工作日
                      </span>
                    )}
                    {todayException.rule?.adjustWorkHours && (
                      <span style={{
                        padding: '3px 10px', fontSize: '11px', borderRadius: '12px',
                        background: '#fff', border: '1px solid #e0e0e0', color: '#666'
                      }}>
                        ⏰ 工作时间: {todayException.rule.workStartTime || '09:00'} - {todayException.rule.workEndTime || '18:00'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  if (confirm('应用规则将修改今天的日程安排，确定继续吗？')) {
                    await applyExceptionDay(todayException.id);
                    window.location.reload();
                  }
                }}
                style={{
                  padding: '8px 16px', borderRadius: '6px',
                  border: '1px solid #4caf50', background: '#fff',
                  color: '#4caf50', cursor: 'pointer', fontSize: '13px',
                  flexShrink: 0
                }}
              >
                应用规则
              </button>
            </div>
          </div>
        )}
        {activeChallenges.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
              🔥 我的挑战 ({activeChallenges.length})
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px'
            }}>
              {activeChallenges.map(c => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  onDelete={() => handleDeleteChallenge(c.id)}
                />
              ))}
            </div>
          </div>
        )}
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
        {activeChallenges.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '16px' }}>
              🔥 我的挑战 ({activeChallenges.length})
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '12px'
            }}>
              {activeChallenges.map(c => (
                <ChallengeCard
                  key={c.id}
                  challenge={c}
                  onDelete={() => handleDeleteChallenge(c.id)}
                />
              ))}
            </div>
          </div>
        )}
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
          <span style={{ fontSize: '13px', color: '#666', marginRight: '8px' }}>显示:</span>
        <button
          onClick={() => setScheduleViewMode('list')}
          style={{
            padding: '6px 16px',
            border: '1px solid #ddd',
            borderRadius: '16px',
            background: scheduleViewMode === 'list' ? '#1a237e' : '#fff',
            color: scheduleViewMode === 'list' ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >📋 列表</button>
        <button
          onClick={() => setScheduleViewMode('timeline')}
          style={{
            padding: '6px 16px',
            border: '1px solid #ddd',
            borderRadius: '16px',
            background: scheduleViewMode === 'timeline' ? '#1a237e' : '#fff',
            color: scheduleViewMode === 'timeline' ? '#fff' : '#333',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >🖱️ 拖拽</button>
        {scheduleViewMode === 'list' && (
          <>
            <span style={{ marginLeft: '16px', fontSize: '13px', color: '#666', marginRight: '8px' }}>时间:</span>
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
            <button
              onClick={() => setViewMode('multiDay')}
              style={{
                padding: '6px 16px',
                border: '1px solid #ddd',
                borderRadius: '16px',
                background: viewMode === 'multiDay' ? '#1a237e' : '#fff',
                color: viewMode === 'multiDay' ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >多日视图</button>
            {viewMode === 'week' && (
              <span style={{ marginLeft: '12px', fontSize: '12px', color: '#999' }}>
                💡 点击日期可切换到日视图
              </span>
            )}
            {viewMode === 'multiDay' && (
              <span style={{ marginLeft: '12px', fontSize: '12px', color: '#999' }}>
                📊 跨天任务、空档、冲突集中展示
              </span>
            )}
          </>
        )}
      </div>
      {scheduleViewMode === 'timeline' ? <DragDropScheduler /> : (
        viewMode === 'day' ? renderDayView() :
        viewMode === 'week' ? renderWeekView() :
        <MultiDayView />
      )}
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
