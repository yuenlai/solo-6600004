import React, { useState, useEffect, useMemo } from 'react';
import { useScheduleStore } from '../store/schedule';
import { addDays, formatDate } from '../data/weekTemplates';
import { Schedule, CrossDaySchedule, FreeTimeSlot, DaySummary } from '../types';

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

interface ScheduleCardProps {
  schedule: Schedule;
  compact?: boolean;
  isCrossDay?: boolean;
  crossDayInfo?: {
    dayOffset: number;
    totalDays: number;
    isFirstDay: boolean;
    isLastDay: boolean;
  };
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, compact, isCrossDay, crossDayInfo }) => {
  const { toggleComplete, deleteSchedule, conflicts } = useScheduleStore();
  const conflictInfo = conflicts.get(schedule.id);

  const priorityColors = {
    high: { bg: '#ffcdd2', text: '#c62828', border: '#ef5350' },
    medium: { bg: '#fff9c4', text: '#f57f17', border: '#ffb300' },
    low: { bg: '#c8e6c9', text: '#2e7d32', border: '#66bb6a' },
  };

  const colors = priorityColors[schedule.priority] || priorityColors.medium;

  const formatTime = (iso: string) => {
    return iso.split('T')[1]?.substring(0, 5) || '';
  };

  const getCrossDayStyle = () => {
    if (!isCrossDay || !crossDayInfo) return {};
    const { isFirstDay, isLastDay, dayOffset } = crossDayInfo;
    
    return {
      borderLeft: isFirstDay ? `3px solid ${colors.border}` : 'none',
      borderRight: isLastDay ? `3px solid ${colors.border}` : 'none',
      borderRadius: isFirstDay && isLastDay ? '6px' : 
                    isFirstDay ? '6px 0 0 6px' : 
                    isLastDay ? '0 6px 6px 0' : '0',
      marginLeft: isFirstDay ? '0' : '-4px',
      marginRight: isLastDay ? '0' : '-4px',
      zIndex: 10 - dayOffset,
      background: `linear-gradient(90deg, ${colors.bg} 0%, ${colors.bg}dd 100%)`,
    };
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: compact ? '4px' : '8px',
      padding: compact ? '6px 8px' : '10px 12px',
      marginBottom: '6px',
      borderRadius: '6px',
      background: schedule.completed ? '#e8f5e9' : colors.bg,
      border: conflictInfo ? '2px solid #f44336' : `1px solid ${colors.border}40`,
      textDecoration: schedule.completed ? 'line-through' : 'none',
      opacity: schedule.completed ? 0.7 : 1,
      position: 'relative',
      ...getCrossDayStyle(),
    }}>
      {!compact && (
        <input 
          type="checkbox" 
          checked={schedule.completed} 
          onChange={() => toggleComplete(schedule.id)}
          style={{ transform: compact ? 'scale(0.8)' : 'scale(1)' }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: 500, 
          fontSize: compact ? '11px' : '13px',
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          color: schedule.completed ? '#888' : colors.text,
        }}>
          {isCrossDay && crossDayInfo?.isFirstDay && (
            <span style={{ marginRight: '4px' }}>🔗</span>
          )}
          {schedule.title}
        </div>
        <div style={{ fontSize: '10px', color: '#666' }}>
          {isCrossDay ? (
            <span>
              {crossDayInfo?.isFirstDay && `${formatTime(schedule.startTime)} - 24:00`}
              {crossDayInfo?.isLastDay && `00:00 - ${formatTime(schedule.endTime)}`}
              {!crossDayInfo?.isFirstDay && !crossDayInfo?.isLastDay && '全天'}
            </span>
          ) : (
            <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
          )}
        </div>
        {conflictInfo && (
          <div style={{ fontSize: '10px', color: '#f44336', marginTop: '2px' }}>
            ⚠️ {conflictInfo.message}
          </div>
        )}
      </div>
      {!compact && (
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '10px',
          background: colors.border,
          color: '#fff',
        }}>
          {schedule.priority === 'high' ? '高' : schedule.priority === 'medium' ? '中' : '低'}
        </span>
      )}
      {!compact && (
        <button 
          onClick={() => deleteSchedule(schedule.id)} 
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#999',
            fontSize: compact ? '14px' : '16px',
            padding: '2px 4px',
          }}
        >
          ×
        </button>
      )}
    </div>
  );
};

const FreeTimeSlotCard: React.FC<{ slot: FreeTimeSlot; compact?: boolean }> = ({ slot, compact }) => {
  const formatTime = (iso: string) => iso.split('T')[1]?.substring(0, 5) || '';
  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    }
    return `${minutes}分钟`;
  };

  return (
    <div style={{
      padding: compact ? '6px 8px' : '8px 12px',
      marginBottom: '6px',
      borderRadius: '6px',
      background: 'repeating-linear-gradient(45deg, #f0f4c3, #f0f4c3 10px, #f5f5f5 10px, #f5f5f5 20px)',
      border: '1px dashed #c0ca33',
      fontSize: compact ? '10px' : '11px',
      color: '#827717',
    }}>
      <div style={{ fontWeight: 500 }}>
        ⏳ 空档 {formatDuration(slot.durationMinutes)}
      </div>
      {!compact && (
        <div style={{ marginTop: '2px' }}>
          {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
        </div>
      )}
    </div>
  );
};

const DaySummaryCard: React.FC<{ summary: DaySummary; isToday: boolean; onClick: () => void }> = ({ summary, isToday, onClick }) => {
  const formatHours = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const completionRate = summary.totalSchedules > 0 
    ? Math.round((summary.completedCount / summary.totalSchedules) * 100) 
    : 0;

  return (
    <div 
      onClick={onClick}
      style={{
        padding: '12px',
        background: isToday ? '#e3f2fd' : '#fff',
        borderRadius: '8px',
        border: isToday ? '2px solid #2196f3' : '1px solid #e0e0e0',
        cursor: 'pointer',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '13px', color: isToday ? '#1976d2' : '#333' }}>
          {summary.date.substring(5)}
        </span>
        {summary.highPriorityCount > 0 && (
          <span style={{ fontSize: '10px', padding: '2px 6px', background: '#ffcdd2', color: '#c62828', borderRadius: '10px' }}>
            {summary.highPriorityCount} 高优
          </span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px' }}>
        <div style={{ color: '#666' }}>📋 {summary.totalSchedules} 项</div>
        <div style={{ color: '#666' }}>✅ {summary.completedCount} 完成</div>
        <div style={{ color: '#666' }}>⏱️ {formatHours(summary.totalDurationMinutes)}</div>
        <div style={{ color: '#666' }}>💤 {formatHours(summary.freeTimeMinutes)}</div>
      </div>
      <div style={{ marginTop: '8px' }}>
        <div style={{ height: '4px', background: '#e0e0e0', borderRadius: '2px', overflow: 'hidden' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${completionRate}%`, 
              background: completionRate >= 80 ? '#4caf50' : completionRate >= 50 ? '#ff9800' : '#f44336',
              borderRadius: '2px',
            }} 
          />
        </div>
        <div style={{ fontSize: '9px', color: '#999', marginTop: '2px', textAlign: 'right' }}>
          {completionRate}%
        </div>
      </div>
    </div>
  );
};

const ConflictAlert: React.FC<{ schedule: Schedule; conflictInfo: any }> = ({ schedule, conflictInfo }) => {
  const formatTime = (iso: string) => iso.split('T')[1]?.substring(0, 5) || '';
  
  return (
    <div style={{
      padding: '10px 12px',
      marginBottom: '8px',
      background: '#ffebee',
      borderLeft: '4px solid #f44336',
      borderRadius: '4px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontWeight: 500, color: '#c62828', fontSize: '13px' }}>
          ⚠️ {schedule.title}
        </span>
        <span style={{ fontSize: '11px', color: '#e53935' }}>
          {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
        </span>
      </div>
      <div style={{ fontSize: '11px', color: '#d32f2f', marginBottom: '4px' }}>
        {conflictInfo.message}
      </div>
      {conflictInfo.conflictingSchedules.length > 0 && (
        <div style={{ fontSize: '10px', color: '#c62828' }}>
          冲突日程: {conflictInfo.conflictingSchedules.map((s: Schedule) => s.title).join(', ')}
        </div>
      )}
    </div>
  );
};

const CrossDayScheduleTimeline: React.FC<{ schedules: CrossDaySchedule[]; dates: string[] }> = ({ schedules, dates }) => {
  if (schedules.length === 0) return null;

  const groupedById = new Map<string, CrossDaySchedule[]>();
  schedules.forEach(s => {
    const existing = groupedById.get(s.id) || [];
    existing.push(s);
    groupedById.set(s.id, existing);
  });

  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#333' }}>
        🔗 跨天任务 ({groupedById.size})
      </h3>
      <div style={{ 
        background: '#fff', 
        borderRadius: '8px', 
        padding: '16px',
        border: '1px solid #e0e0e0',
      }}>
        {Array.from(groupedById.entries()).map(([id, segments]) => {
          const first = segments[0];
          return (
            <div key={id} style={{ marginBottom: '12px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '6px',
              }}>
                <span style={{ fontWeight: 500, fontSize: '13px' }}>{first.title}</span>
                <span style={{ fontSize: '11px', color: '#666' }}>
                  {first.startDate} → {first.endDate} ({first.totalDays}天)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {dates.map((date) => {
                  const segment = segments.find(s => s.startTime.startsWith(date) || s.endTime.startsWith(date));
                  const isInRange = date >= first.startDate && date <= first.endDate;
                  return (
                    <div 
                      key={date}
                      style={{
                        flex: 1,
                        height: '24px',
                        borderRadius: '4px',
                        background: segment ? '#1a237e' : isInRange ? '#1a237e60' : '#f5f5f5',
                        position: 'relative',
                      }}
                    >
                      {segment?.isFirstDay && (
                        <div style={{
                          position: 'absolute',
                          left: '-2px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '10px',
                          color: '#fff',
                        }}>▶</div>
                      )}
                      {segment?.isLastDay && (
                        <div style={{
                          position: 'absolute',
                          right: '-2px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: '10px',
                          color: '#fff',
                        }}>◀</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const MultiDayView: React.FC = () => {
  const { 
    selectedDate, 
    multiDayCount, 
    multiDayViewData, 
    setSelectedDate, 
    setViewMode,
    setMultiDayCount,
    loadMultiDaySchedules,
    schedules,
    generateMultiDayViewData,
    loading,
  } = useScheduleStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'detail' | 'conflicts'>('overview');
  const [showFreeTime, setShowFreeTime] = useState(true);

  useEffect(() => {
    loadMultiDaySchedules(selectedDate, multiDayCount);
  }, [selectedDate, multiDayCount]);

  const viewData = useMemo(() => {
    if (multiDayViewData) return multiDayViewData;
    if (schedules.length > 0) {
      return generateMultiDayViewData(selectedDate, multiDayCount, schedules);
    }
    return null;
  }, [multiDayViewData, schedules, selectedDate, multiDayCount, generateMultiDayViewData]);

  const isToday = (date: string) => date === new Date().toISOString().split('T')[0];
  const getDayName = (date: string) => {
    const d = new Date(date);
    const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    return dayNames[dayIdx];
  };

  const navigateDays = (direction: number) => {
    const newDate = formatDate(addDays(new Date(selectedDate), direction * multiDayCount));
    setSelectedDate(newDate);
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
        加载中...
      </div>
    );
  }

  if (!viewData) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
        暂无数据
      </div>
    );
  }

  const renderOverview = () => (
    <div style={{ padding: '16px' }}>
      {viewData.crossDaySchedules.length > 0 && (
        <CrossDayScheduleTimeline 
          schedules={viewData.crossDaySchedules} 
          dates={viewData.dates} 
        />
      )}

      {viewData.allConflicts.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#333' }}>
            ⚠️ 冲突预警 ({viewData.allConflicts.length})
          </h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {viewData.allConflicts.map(({ schedule, conflictInfo }) => (
              <ConflictAlert 
                key={schedule.id} 
                schedule={schedule} 
                conflictInfo={conflictInfo} 
              />
            ))}
          </div>
        </div>
      )}

      <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#333' }}>
        📊 日程概览
      </h3>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${Math.min(viewData.dayCount, 7)}, 1fr)`, 
        gap: '8px',
        marginBottom: '24px',
      }}>
        {viewData.daySummaries.map(summary => (
          <DaySummaryCard
            key={summary.date}
            summary={summary}
            isToday={isToday(summary.date)}
            onClick={() => {
              setSelectedDate(summary.date);
              setViewMode('day');
            }}
          />
        ))}
      </div>

      {showFreeTime && viewData.freeTimeSlots.length > 0 && (
        <div>
          <h3 style={{ margin: '0 0 12px', fontSize: '15px', color: '#333' }}>
            💤 空档时间 ({viewData.freeTimeSlots.length} 段)
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
            gap: '8px' 
          }}>
            {viewData.freeTimeSlots.map((slot, idx) => (
              <FreeTimeSlotCard key={idx} slot={slot} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDetail = () => (
    <div style={{ padding: '16px' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${Math.min(viewData.dayCount, 7)}, 1fr)`, 
        gap: '8px',
      }}>
        {viewData.dates.map(date => {
          const daySchedules = viewData.schedulesByDate.get(date) || [];
          const dayCrossDay = viewData.crossDaySchedules.filter(s => 
            s.startTime.startsWith(date) || 
            (s.dayOffset > 0 && s.startDate < date && s.endDate >= date)
          );
          const dayFreeSlots = viewData.freeTimeSlots.filter(slot => slot.date === date);
          const today = isToday(date);

          const allItems: Array<{ type: 'schedule' | 'crossDay' | 'freeTime'; data: any }> = [];
          
          daySchedules.forEach(s => {
            if (!dayCrossDay.find(cd => cd.id === s.id)) {
              allItems.push({ type: 'schedule', data: s });
            }
          });
          
          dayCrossDay.forEach(s => {
            allItems.push({ type: 'crossDay', data: s });
          });
          
          if (showFreeTime) {
            dayFreeSlots.forEach(s => {
              allItems.push({ type: 'freeTime', data: s });
            });
          }

          allItems.sort((a, b) => {
            const aTime = a.type === 'freeTime' ? new Date(a.data.startTime).getTime() : new Date(a.data.startTime).getTime();
            const bTime = b.type === 'freeTime' ? new Date(b.data.startTime).getTime() : new Date(b.data.startTime).getTime();
            return aTime - bTime;
          });

          return (
            <div key={date} style={{
              background: today ? '#e3f2fd' : '#fff',
              borderRadius: '8px',
              border: today ? '2px solid #2196f3' : '1px solid #e0e0e0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '400px',
            }}>
              <div style={{
                padding: '8px',
                background: today ? '#2196f3' : '#f5f5f5',
                color: today ? '#fff' : '#333',
                textAlign: 'center',
                cursor: 'pointer',
              }}
              onClick={() => { setViewMode('day'); setSelectedDate(date); }}
              >
                <div style={{ fontWeight: 600, fontSize: '12px' }}>
                  {getDayName(date)} {date.substring(5)}
                </div>
                <div style={{ fontSize: '10px', marginTop: '2px' }}>
                  {daySchedules.length} 项
                  {dayCrossDay.length > 0 && ` · 🔗${dayCrossDay.length}`}
                </div>
              </div>
              <div style={{ flex: 1, padding: '6px', overflowY: 'auto' }}>
                {allItems.length === 0 ? (
                  <p style={{ color: '#ccc', textAlign: 'center', fontSize: '11px', marginTop: '30px' }}>
                    空
                  </p>
                ) : (
                  allItems.map((item, idx) => {
                    if (item.type === 'schedule') {
                      return <ScheduleCard key={idx} schedule={item.data} compact />;
                    }
                    if (item.type === 'crossDay') {
                      return (
                        <ScheduleCard 
                          key={idx} 
                          schedule={item.data} 
                          compact 
                          isCrossDay
                          crossDayInfo={{
                            dayOffset: item.data.dayOffset,
                            totalDays: item.data.totalDays,
                            isFirstDay: item.data.isFirstDay,
                            isLastDay: item.data.isLastDay,
                          }}
                        />
                      );
                    }
                    if (item.type === 'freeTime') {
                      return <FreeTimeSlotCard key={idx} slot={item.data} compact />;
                    }
                    return null;
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderConflicts = () => (
    <div style={{ padding: '16px' }}>
      {viewData.allConflicts.length === 0 ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#4caf50',
          background: '#e8f5e9',
          borderRadius: '12px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>太棒了！</div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
            {viewData.startDate} ~ {viewData.endDate} 期间没有日程冲突
          </div>
        </div>
      ) : (
        <>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#c62828' }}>
            ⚠️ 共发现 {viewData.allConflicts.length} 个日程冲突
          </h3>
          {viewData.allConflicts.map(({ schedule, conflictInfo }) => (
            <div 
              key={schedule.id} 
              style={{
                background: '#fff',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                border: '1px solid #ef5350',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '4px' }}>
                    {schedule.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    📅 {schedule.startTime.split('T')[0]} {schedule.startTime.split('T')[1]?.substring(0, 5)} - 
                    {schedule.endTime.split('T')[1]?.substring(0, 5)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#e53935', marginBottom: '8px' }}>
                    ❌ {conflictInfo.message}
                  </div>
                  {conflictInfo.conflictingSchedules.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                        与以下日程冲突：
                      </div>
                      {conflictInfo.conflictingSchedules.map((cs: Schedule) => (
                        <div 
                          key={cs.id} 
                          style={{
                            padding: '8px 12px',
                            background: '#ffebee',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{cs.title}</span>
                          <span style={{ color: '#666', marginLeft: '8px' }}>
                            {cs.startTime.split('T')[1]?.substring(0, 5)} - 
                            {cs.endTime.split('T')[1]?.substring(0, 5)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <span style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    background: schedule.priority === 'high' ? '#ffcdd2' : 
                              schedule.priority === 'medium' ? '#fff9c4' : '#c8e6c9',
                    color: schedule.priority === 'high' ? '#c62828' : 
                          schedule.priority === 'medium' ? '#f57f17' : '#2e7d32',
                  }}>
                    {schedule.priority === 'high' ? '高优' : schedule.priority === 'medium' ? '中优' : '低优'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '12px 16px',
        background: '#fff',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            onClick={() => navigateDays(-1)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← 上{multiDayCount}天
          </button>
          <span style={{ fontSize: '13px', fontWeight: 500, minWidth: '180px', textAlign: 'center' }}>
            {viewData.startDate} ~ {viewData.endDate}
          </span>
          <button 
            onClick={() => navigateDays(1)}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            下{multiDayCount}天 →
          </button>
          <button 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            style={{
              padding: '6px 12px',
              border: '1px solid #1a237e',
              borderRadius: '6px',
              background: '#fff',
              color: '#1a237e',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            今天
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>显示:</span>
          {[3, 5, 7, 14].map(count => (
            <button
              key={count}
              onClick={() => setMultiDayCount(count)}
              style={{
                padding: '4px 10px',
                border: '1px solid #ddd',
                borderRadius: '12px',
                background: multiDayCount === count ? '#1a237e' : '#fff',
                color: multiDayCount === count ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {count}天
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '16px' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={showFreeTime} 
              onChange={(e) => setShowFreeTime(e.target.checked)}
            />
            显示空档
          </label>
        </div>
      </div>

      <div style={{
        padding: '8px 16px',
        background: '#fafafa',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        gap: '8px',
      }}>
        {[
          { key: 'overview', label: '📊 概览', count: '' },
          { key: 'detail', label: '📅 详情', count: '' },
          { key: 'conflicts', label: '⚠️ 冲突', count: viewData.allConflicts.length > 0 ? `(${viewData.allConflicts.length})` : '' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === tab.key ? '#1a237e' : 'transparent',
              color: activeTab === tab.key ? '#fff' : '#666',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 500 : 400,
            }}
          >
            {tab.label} {tab.count}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'detail' && renderDetail()}
      {activeTab === 'conflicts' && renderConflicts()}
    </div>
  );
};
