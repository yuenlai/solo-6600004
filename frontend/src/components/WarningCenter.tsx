import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';
import { ScheduleWarning, HabitWarning, LongPendingWarning, WarningLevel, Schedule, DailyAction, WeeklyAction } from '../types';

interface WarningCenterProps {
  onClose: () => void;
  onNavigateToSchedule: (scheduleId: string, date: string) => void;
  onNavigateToHabits: () => void;
  onNavigateToGoals: () => void;
}

const getWarningLevelStyle = (level: WarningLevel) => {
  switch (level) {
    case 'critical':
      return {
        bgColor: '#ffebee',
        borderColor: '#ef5350',
        textColor: '#c62828',
        icon: '🚨'
      };
    case 'warning':
      return {
        bgColor: '#fff8e1',
        borderColor: '#ffca28',
        textColor: '#ef6c00',
        icon: '⚠️'
      };
    case 'info':
      return {
        bgColor: '#e3f2fd',
        borderColor: '#42a5f5',
        textColor: '#1565c0',
        icon: 'ℹ️'
      };
  }
};

const formatTimeRemaining = (minutes: number): string => {
  if (minutes < 0) {
    const absMinutes = Math.abs(minutes);
    if (absMinutes >= 60) {
      const hours = Math.floor(absMinutes / 60);
      const mins = absMinutes % 60;
      return `已超时 ${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
    }
    return `已超时 ${absMinutes} 分钟`;
  }
  if (minutes < 60) {
    return `剩余 ${minutes} 分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `剩余 ${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
};

const formatDeadlineTime = (deadline: string): string => {
  const date = new Date(deadline);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const ScheduleWarningItem: React.FC<{
  warning: ScheduleWarning;
  onHandle: (schedule: Schedule) => void;
  onComplete: (scheduleId: string) => void;
  onClose: () => void;
}> = ({ warning, onHandle, onComplete, onClose }) => {
  const style = getWarningLevelStyle(warning.warningLevel);
  const date = warning.schedule.startTime.split('T')[0];

  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      background: style.bgColor,
      border: `1px solid ${style.borderColor}`,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px'
    }}>
      <span style={{ fontSize: '20px' }}>{style.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 500,
          fontSize: '14px',
          color: '#333',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {warning.schedule.title}
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '8px',
            background: warning.schedule.priority === 'high' ? '#ffcdd2' :
                       warning.schedule.priority === 'medium' ? '#fff9c4' : '#c8e6c9',
            color: '#666'
          }}>
            {warning.schedule.priority === 'high' ? '高优' :
             warning.schedule.priority === 'medium' ? '中优' : '低优'}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: style.textColor, fontWeight: 500 }}>
          {formatTimeRemaining(warning.minutesRemaining)} · 截止 {formatDeadlineTime(warning.deadline)}
        </div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
          {warning.schedule.category} · {date}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={() => onComplete(warning.schedule.id)}
          style={{
            padding: '6px 12px',
            borderRadius: '16px',
            border: '1px solid #4caf50',
            background: '#fff',
            color: '#4caf50',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✓ 完成
        </button>
        <button
          onClick={() => { onHandle(warning.schedule); onClose(); }}
          style={{
            padding: '6px 12px',
            borderRadius: '16px',
            border: 'none',
            background: '#1a237e',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          去处理
        </button>
      </div>
    </div>
  );
};

const HabitWarningItem: React.FC<{
  warning: HabitWarning;
  onHandle: () => void;
  onRecord: (habitId: string) => void;
}> = ({ warning, onHandle, onRecord }) => {
  const style = getWarningLevelStyle(warning.warningLevel);

  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      background: style.bgColor,
      border: `1px solid ${style.borderColor}`,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px'
    }}>
      <span style={{ fontSize: '20px' }}>{warning.habit.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 500,
          fontSize: '14px',
          color: '#333',
          marginBottom: '4px'
        }}>
          {warning.habit.name}
        </div>
        <div style={{ fontSize: '12px', color: style.textColor, fontWeight: 500 }}>
          {warning.daysSinceLastCompletion === 1
            ? '今日还未打卡，' + (warning.warningLevel === 'critical' ? '即将断签！' : '别忘记打卡哦')
            : `已 ${warning.daysSinceLastCompletion} 天未打卡，连续 ${warning.currentStreak} 天的记录即将中断！`}
        </div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
          🔥 连续 {warning.currentStreak} 天 · 目标: {warning.habit.target}{warning.habit.unit}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={() => onRecord(warning.habit.id)}
          style={{
            padding: '6px 12px',
            borderRadius: '16px',
            border: 'none',
            background: warning.habit.color || '#4caf50',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✓ 打卡
        </button>
        <button
          onClick={onHandle}
          style={{
            padding: '6px 12px',
            borderRadius: '16px',
            border: '1px solid #1a237e',
            background: '#fff',
            color: '#1a237e',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          查看
        </button>
      </div>
    </div>
  );
};

const LongPendingItem: React.FC<{
  warning: LongPendingWarning;
  onHandleSchedule: (schedule: Schedule) => void;
  onHandleDailyAction: (action: DailyAction) => void;
  onHandleWeeklyAction: (action: WeeklyAction) => void;
  onCompleteSchedule: (scheduleId: string) => void;
  onCompleteDailyAction: (actionId: string) => void;
  onCompleteWeeklyAction: (actionId: string) => void;
  onClose: () => void;
}> = ({ warning, onHandleSchedule, onHandleDailyAction, onHandleWeeklyAction,
       onCompleteSchedule, onCompleteDailyAction, onCompleteWeeklyAction, onClose }) => {
  const style = getWarningLevelStyle(warning.warningLevel);

  const getItemTitle = () => {
    if (warning.itemType === 'schedule') return (warning.item as Schedule).title;
    if (warning.itemType === 'daily_action') return (warning.item as DailyAction).title;
    return (warning.item as WeeklyAction).title;
  };

  const getItemTypeLabel = () => {
    switch (warning.itemType) {
      case 'schedule': return '📅 日程';
      case 'daily_action': return '📝 日行动';
      case 'weekly_action': return '📋 周行动';
    }
  };

  const handleComplete = () => {
    if (warning.itemType === 'schedule') {
      onCompleteSchedule((warning.item as Schedule).id);
    } else if (warning.itemType === 'daily_action') {
      onCompleteDailyAction((warning.item as DailyAction).id);
    } else {
      onCompleteWeeklyAction((warning.item as WeeklyAction).id);
    }
  };

  const handleGoHandle = () => {
    if (warning.itemType === 'schedule') {
      onHandleSchedule(warning.item as Schedule);
    } else if (warning.itemType === 'daily_action') {
      onHandleDailyAction(warning.item as DailyAction);
    } else {
      onHandleWeeklyAction(warning.item as WeeklyAction);
    }
    onClose();
  };

  return (
    <div style={{
      padding: '12px',
      borderRadius: '8px',
      background: style.bgColor,
      border: `1px solid ${style.borderColor}`,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '10px'
    }}>
      <span style={{ fontSize: '20px' }}>{style.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 500,
          fontSize: '14px',
          color: '#333',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {getItemTitle()}
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '8px',
            background: '#fff',
            border: '1px solid #e0e0e0',
            color: '#666'
          }}>
            {getItemTypeLabel()}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: style.textColor, fontWeight: 500 }}>
          已拖延 {warning.daysPending} 天未完成
        </div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
          创建于 {warning.createdDate}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        <button
          onClick={handleComplete}
          style={{
            padding: '6px 12px',
            borderRadius: '16px',
            border: '1px solid #4caf50',
            background: '#fff',
            color: '#4caf50',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✓ 完成
        </button>
        <button
          onClick={handleGoHandle}
          style={{
            padding: '6px 12px',
            borderRadius: '16px',
            border: 'none',
            background: '#1a237e',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          去处理
        </button>
      </div>
    </div>
  );
};

export const WarningCenter: React.FC<WarningCenterProps> = ({
  onClose,
  onNavigateToSchedule,
  onNavigateToHabits,
  onNavigateToGoals
}) => {
  const {
    warningCenterData,
    loadWarningCenter,
    loadHabits,
    loadSchedules,
    loadDailyActions,
    selectedDate,
    toggleComplete,
    recordHabit,
    updateDailyAction,
    updateWeeklyAction,
    setSelectedDate,
    setViewMode
  } = useScheduleStore();

  const [activeTab, setActiveTab] = useState<'all' | 'schedule' | 'habit' | 'pending'>('all');

  useEffect(() => {
    loadWarningCenter();
    const interval = setInterval(() => {
      loadWarningCenter();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadWarningCenter]);

  const handleRefresh = () => {
    loadHabits();
    loadSchedules();
    loadDailyActions(selectedDate);
    loadWarningCenter();
  };

  const handleScheduleClick = (schedule: Schedule) => {
    const date = schedule.startTime.split('T')[0];
    setSelectedDate(date);
    setViewMode('day');
    onNavigateToSchedule(schedule.id, date);
  };

  const handleCompleteSchedule = (scheduleId: string) => {
    toggleComplete(scheduleId);
    setTimeout(loadWarningCenter, 100);
  };

  const handleRecordHabit = (habitId: string) => {
    recordHabit(habitId, selectedDate, 1);
    setTimeout(loadWarningCenter, 100);
  };

  const handleCompleteDailyAction = (actionId: string) => {
    updateDailyAction(actionId, { completed: true });
    setTimeout(() => {
      loadDailyActions(selectedDate);
      loadWarningCenter();
    }, 100);
  };

  const handleCompleteWeeklyAction = (actionId: string) => {
    updateWeeklyAction(actionId, { completed: true });
    setTimeout(loadWarningCenter, 100);
  };

  const handleDailyActionClick = (action: DailyAction) => {
    setSelectedDate(action.date);
    setViewMode('day');
    onNavigateToGoals();
  };

  const handleWeeklyActionClick = (_action: WeeklyAction) => {
    onNavigateToGoals();
  };

  if (!warningCenterData) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <div style={{ color: '#666' }}>加载中...</div>
        </div>
      </div>
    );
  }

  const { scheduleWarnings, habitWarnings, longPendingWarnings, totalCount,
          criticalCount, warningCount, infoCount, lastUpdated } = warningCenterData;

  const getFilteredWarnings = () => {
    switch (activeTab) {
      case 'schedule': return { schedule: scheduleWarnings, habit: [], pending: [] };
      case 'habit': return { schedule: [], habit: habitWarnings, pending: [] };
      case 'pending': return { schedule: [], habit: [], pending: longPendingWarnings };
      default: return { schedule: scheduleWarnings, habit: habitWarnings, pending: longPendingWarnings };
    }
  };

  const filtered = getFilteredWarnings();
  const filteredTotal = filtered.schedule.length + filtered.habit.length + filtered.pending.length;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '700px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              🚨 截止预警中心
              {totalCount > 0 && (
                <span style={{
                  fontSize: '12px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  background: '#f44336',
                  color: '#fff',
                  fontWeight: 500
                }}>
                  {totalCount} 项待处理
                </span>
              )}
            </h2>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              最后更新: {new Date(lastUpdated).toLocaleTimeString('zh-CN')}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleRefresh}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #1a237e',
                background: '#fff',
                color: '#1a237e',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              🔄 刷新
            </button>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: '#f5f5f5',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={{
          padding: '16px 24px',
          display: 'flex',
          gap: '12px',
          background: '#fafafa',
          borderBottom: '1px solid #e0e0e0'
        }}>
          <div style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            background: '#ffebee',
            border: '1px solid #ef9a9a',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#c62828' }}>{criticalCount}</div>
            <div style={{ fontSize: '12px', color: '#c62828', marginTop: '2px' }}>🚨 紧急</div>
          </div>
          <div style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            background: '#fff8e1',
            border: '1px solid #ffd54f',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#ef6c00' }}>{warningCount}</div>
            <div style={{ fontSize: '12px', color: '#ef6c00', marginTop: '2px' }}>⚠️ 警告</div>
          </div>
          <div style={{
            flex: 1,
            padding: '12px',
            borderRadius: '8px',
            background: '#e3f2fd',
            border: '1px solid #90caf9',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#1565c0' }}>{infoCount}</div>
            <div style={{ fontSize: '12px', color: '#1565c0', marginTop: '2px' }}>ℹ️ 提示</div>
          </div>
        </div>

        <div style={{
          padding: '0 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          gap: '4px'
        }}>
          {[
            { key: 'all', label: '全部', count: totalCount },
            { key: 'schedule', label: '日程超时', count: scheduleWarnings.length, icon: '⏰' },
            { key: 'habit', label: '习惯断签', count: habitWarnings.length, icon: '🔥' },
            { key: 'pending', label: '长期未完成', count: longPendingWarnings.length, icon: '📋' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
                borderBottom: activeTab === tab.key ? '2px solid #1a237e' : '2px solid transparent',
                color: activeTab === tab.key ? '#1a237e' : '#666',
                fontWeight: activeTab === tab.key ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {(tab as any).icon && <span>{(tab as any).icon}</span>}
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '8px',
                  background: activeTab === tab.key ? '#1a237e' : '#e0e0e0',
                  color: activeTab === tab.key ? '#fff' : '#666'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {filteredTotal === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '16px', fontWeight: 500, color: '#4caf50', marginBottom: '8px' }}>
                太棒了！当前没有预警
              </div>
              <div style={{ fontSize: '13px' }}>
                所有任务都已及时处理，继续保持！
              </div>
            </div>
          ) : (
            <>
              {filtered.schedule.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{
                    margin: '0 0 12px',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>⏰</span>
                    即将超时的日程
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'normal',
                      color: '#999'
                    }}>
                      ({filtered.schedule.length}项)
                    </span>
                  </h3>
                  {filtered.schedule.map((warning, idx) => (
                    <ScheduleWarningItem
                      key={`schedule-${idx}`}
                      warning={warning}
                      onHandle={handleScheduleClick}
                      onComplete={handleCompleteSchedule}
                      onClose={onClose}
                    />
                  ))}
                </div>
              )}

              {filtered.habit.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{
                    margin: '0 0 12px',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>🔥</span>
                    快断签的习惯
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'normal',
                      color: '#999'
                    }}>
                      ({filtered.habit.length}项)
                    </span>
                  </h3>
                  {filtered.habit.map((warning, idx) => (
                    <HabitWarningItem
                      key={`habit-${idx}`}
                      warning={warning}
                      onHandle={() => { onNavigateToHabits(); onClose(); }}
                      onRecord={handleRecordHabit}
                    />
                  ))}
                </div>
              )}

              {filtered.pending.length > 0 && (
                <div>
                  <h3 style={{
                    margin: '0 0 12px',
                    fontSize: '15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>📋</span>
                    长期未完成事项
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 'normal',
                      color: '#999'
                    }}>
                      ({filtered.pending.length}项)
                    </span>
                  </h3>
                  {filtered.pending.map((warning, idx) => (
                    <LongPendingItem
                      key={`pending-${idx}`}
                      warning={warning}
                      onHandleSchedule={handleScheduleClick}
                      onHandleDailyAction={handleDailyActionClick}
                      onHandleWeeklyAction={handleWeeklyActionClick}
                      onCompleteSchedule={handleCompleteSchedule}
                      onCompleteDailyAction={handleCompleteDailyAction}
                      onCompleteWeeklyAction={handleCompleteWeeklyAction}
                      onClose={onClose}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e0e0e0',
          background: '#fafafa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#999' }}>
            💡 点击"去处理"可直接跳转到对应页面
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { onNavigateToHabits(); onClose(); }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #7b1fa2',
                background: '#fff',
                color: '#7b1fa2',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              🎯 去习惯页
            </button>
            <button
              onClick={() => { onNavigateToGoals(); onClose(); }}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #ff9800',
                background: '#fff',
                color: '#ff9800',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              🎯 去目标页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
