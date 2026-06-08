import React, { useState, useEffect, useMemo } from 'react';
import { useScheduleStore } from '../store/schedule';
import { HabitChallengeCreator } from './HabitChallengeCreator';
import { HabitChallengeCard } from './HabitChallengeCard';
import { HabitStats } from '../types';
import { getHabitCompletionMap as getCompletionMap } from '../utils/habitUtils';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

const parseDate = (dateStr: string): Date => {
  return new Date(dateStr + 'T00:00:00');
};

const getWeekDay = (dateStr: string): string => {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  return days[parseDate(dateStr).getDay()];
};

const generateCalendarDays = (year: number, month: number): { date: string; isCurrentMonth: boolean }[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = firstDay.getDay();
  const days: { date: string; isCurrentMonth: boolean }[] = [];
  
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({ date: formatDate(d), isCurrentMonth: false });
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push({ date: formatDate(d), isCurrentMonth: true });
  }
  
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: formatDate(d), isCurrentMonth: false });
  }
  
  return days;
};

export const HabitTracker: React.FC = () => {
  const { habits, recordHabit, selectedDate, loadChallenges, challenges, checkedExceptionDay, habitStats, deleteHabitRecord, loadHabits } = useScheduleStore();
  const [showCreator, setShowCreator] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'habits' | 'challenges'>('habits');
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [showStats, setShowStats] = useState<string | null>(null);
  const [showMakeup, setShowMakeup] = useState<string | null>(null);
  const [makeupDate, setMakeupDate] = useState(formatDate(new Date()));
  const [calendarMonth, setCalendarMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() });
  const [recording, setRecording] = useState<string | null>(null);

  useEffect(() => {
    loadChallenges();
    loadHabits();
  }, []);

  const isHabitSkipped = (habitId: string) => {
    if (!checkedExceptionDay?.rule?.skipHabits) return false;
    const habitIds = checkedExceptionDay.rule.habitIdsToSkip;
    return habitIds.length === 0 || habitIds.includes(habitId);
  };

  const handleCreateChallenge = (habitId?: string) => {
    setSelectedHabitId(habitId);
    setShowCreator(true);
  };

  const handleRecordHabit = async (habitId: string, date: string, value: number) => {
    setRecording(habitId);
    try {
      await recordHabit(habitId, date, value);
    } finally {
      setRecording(null);
    }
  };

  const handleDeleteRecord = async (habitId: string, date: string) => {
    if (confirm('确定要取消这一天的打卡记录吗？')) {
      try {
        await deleteHabitRecord(habitId, date);
      } catch (e) {
        console.error('Failed to delete record:', e);
      }
    }
  };

  const handleMakeup = async (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    await handleRecordHabit(habitId, makeupDate, habit.target);
    setShowMakeup(null);
  };

  const activeChallengesCount = challenges.filter(c => c.status === 'active').length;
  const today = formatDate(new Date());

  const getHabitStats = (habitId: string): HabitStats | null => {
    return habitStats.get(habitId) || null;
  };

  const getHabitCompletionMap = (habit: typeof habits[0]): Map<string, boolean> => {
    return getCompletionMap(habit.history);
  };

  const prevMonth = () => {
    setCalendarMonth(prev => {
      const newMonth = prev.month - 1;
      if (newMonth < 0) {
        return { year: prev.year - 1, month: 11 };
      }
      return { year: prev.year, month: newMonth };
    });
  };

  const nextMonth = () => {
    setCalendarMonth(prev => {
      const newMonth = prev.month + 1;
      if (newMonth > 11) {
        return { year: prev.year + 1, month: 0 };
      }
      return { year: prev.year, month: newMonth };
    });
  };

  const calendarDays = useMemo(() => 
    generateCalendarDays(calendarMonth.year, calendarMonth.month),
    [calendarMonth]
  );

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>🎯 习惯管理</h3>
        <button
          onClick={() => handleCreateChallenge()}
          style={{
            padding: '8px 16px', borderRadius: '20px', border: 'none',
            background: '#1a237e', color: '#fff', cursor: 'pointer', fontSize: '13px'
          }}
        >
          + 发起挑战
        </button>
      </div>

      <div style={{
        display: 'flex', gap: '8px', marginBottom: '16px',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <button
          onClick={() => setActiveTab('habits')}
          style={{
            padding: '10px 20px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: '14px',
            borderBottom: activeTab === 'habits' ? '2px solid #1a237e' : '2px solid transparent',
            color: activeTab === 'habits' ? '#1a237e' : '#666',
            fontWeight: activeTab === 'habits' ? 600 : 400
          }}
        >
          习惯打卡
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          style={{
            padding: '10px 20px', border: 'none', background: 'transparent',
            cursor: 'pointer', fontSize: '14px',
            borderBottom: activeTab === 'challenges' ? '2px solid #1a237e' : '2px solid transparent',
            color: activeTab === 'challenges' ? '#1a237e' : '#666',
            fontWeight: activeTab === 'challenges' ? 600 : 400
          }}
        >
          挑战中心 {activeChallengesCount > 0 && `(${activeChallengesCount})`}
        </button>
      </div>

      {activeTab === 'habits' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {checkedExceptionDay?.rule?.skipHabits && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px', marginBottom: '12px',
              background: '#fff3e0', border: '1px solid #ffcc80',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
              <span style={{ fontSize: '20px' }}>📅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#e65100' }}>
                  今日为例外日：{checkedExceptionDay.name}
                </div>
                <div style={{ fontSize: '12px', color: '#ef6c00' }}>
                  {checkedExceptionDay.rule.habitIdsToSkip.length === 0
                    ? '所有习惯打卡已自动跳过'
                    : `部分习惯打卡已自动跳过（${checkedExceptionDay.rule.habitIdsToSkip.length}个）`}
                </div>
              </div>
            </div>
          )}
          {habits.map(h => {
            const todayRecord = h.history.find(r => r.date === selectedDate);
            const hasActiveChallenge = challenges.some(
              c => c.habitId === h.id && c.status === 'active'
            );
            const skipped = isHabitSkipped(h.id);
            const stats = getHabitStats(h.id);
            const completionMap = getHabitCompletionMap(h);
            const isToday = selectedDate === today;

            return (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                borderRadius: '8px',
                background: todayRecord?.completed ? '#e8f5e9' : skipped ? '#f5f5f5' : '#fafafa',
                border: '1px solid #e0e0e0',
                opacity: skipped ? 0.6 : 1
              }}>
                <span style={{ fontSize: '24px' }}>{h.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>{h.name}</span>
                    {hasActiveChallenge && (
                      <span style={{
                        fontSize: '10px', padding: '2px 6px', borderRadius: '8px',
                        background: '#fff3e0', color: '#f57c00'
                      }}>
                        🔥 挑战中
                      </span>
                    )}
                    {skipped && (
                      <span style={{
                        fontSize: '10px', padding: '2px 6px', borderRadius: '8px',
                        background: '#ffebee', color: '#c62828'
                      }}>
                        🚫 今日跳过
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                    🔥 连续 {h.currentStreak} 天 | 目标: {h.target}{h.unit}
                    {stats && (
                      <span style={{ marginLeft: '8px' }}>
                        | 📊 总完成 {stats.totalCompleted} 天 | 完成率 {stats.completionRate}%
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => setShowStats(showStats === h.id ? null : h.id)}
                    style={{
                      padding: '6px 10px', borderRadius: '16px',
                      border: '1px solid #1a237e', background: '#fff',
                      color: '#1a237e', cursor: 'pointer', fontSize: '11px'
                    }}
                    title="查看统计"
                  >
                    📊 统计
                  </button>
                  <button
                    onClick={() => setShowHistory(showHistory === h.id ? null : h.id)}
                    style={{
                      padding: '6px 10px', borderRadius: '16px',
                      border: '1px solid #4caf50', background: '#fff',
                      color: '#4caf50', cursor: 'pointer', fontSize: '11px'
                    }}
                    title="查看历史"
                  >
                    📅 历史
                  </button>
                  {!isToday && (
                    <button
                      onClick={() => {
                        setShowMakeup(showMakeup === h.id ? null : h.id);
                        setMakeupDate(selectedDate);
                      }}
                      style={{
                        padding: '6px 10px', borderRadius: '16px',
                        border: '1px solid #ff9800', background: '#fff',
                        color: '#ff9800', cursor: 'pointer', fontSize: '11px'
                      }}
                      title="补录打卡"
                    >
                      ✏️ 补录
                    </button>
                  )}
                  {!hasActiveChallenge && (
                    <button
                      onClick={() => handleCreateChallenge(h.id)}
                      style={{
                        padding: '6px 10px', borderRadius: '16px',
                        border: '1px solid #1a237e', background: '#fff',
                        color: '#1a237e', cursor: 'pointer', fontSize: '11px',
                        opacity: skipped ? 0.5 : 1
                      }}
                      title="发起挑战"
                    >
                      🎯 挑战
                    </button>
                  )}
                  {!todayRecord ? (
                    <button
                      onClick={() => !skipped && handleRecordHabit(h.id, selectedDate, h.target)}
                      disabled={skipped || recording === h.id}
                      style={{
                        padding: '6px 16px', borderRadius: '20px', border: 'none',
                        background: skipped ? '#bdbdbd' : (h.color || '#4caf50'),
                        color: '#fff', cursor: skipped ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        opacity: recording === h.id ? 0.7 : 1
                      }}
                    >{recording === h.id ? '打卡中...' : skipped ? '已跳过' : isToday ? '打卡' : '补录'}</button>
                  ) : (
                    <button
                      onClick={() => handleDeleteRecord(h.id, selectedDate)}
                      style={{
                        padding: '6px 12px', borderRadius: '20px', border: 'none',
                        background: '#f44336', color: '#fff', cursor: 'pointer',
                        fontSize: '12px'
                      }}
                      title="取消打卡"
                    >
                      ✓ 已完成 (点击取消)
                    </button>
                  )}
                </div>

                {showStats === h.id && stats && (
                  <div style={{
                    gridColumn: '1 / -1', marginTop: '12px', padding: '16px',
                    background: '#f5f5f5', borderRadius: '8px',
                    borderTop: '1px solid #e0e0e0', width: '100%'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>📊 {h.name} - 数据统计</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>🔥 {stats.currentStreak}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>当前连续天数</div>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>🏆 {stats.longestStreak}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>最长连续天数</div>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>✅ {stats.totalCompleted}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>累计完成天数</div>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2196f3' }}>📈 {stats.completionRate}%</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>总完成率</div>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#9c27b0' }}>📅 {stats.thisMonthCompleted}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>本月完成天数</div>
                      </div>
                      <div style={{ padding: '12px', background: '#fff', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#795548' }}>⏱️ {stats.totalDaysTracked}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>累计跟踪天数</div>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '8px', color: '#333' }}>最近7天完成情况</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {stats.last7Days.map(day => (
                          <div key={day.date} style={{
                            flex: 1, padding: '10px 4px',
                            background: day.completed ? '#e8f5e9' : '#fafafa',
                            border: `1px solid ${day.completed ? '#81c784' : '#e0e0e0'}`,
                            borderRadius: '8px', textAlign: 'center'
                          }}>
                            <div style={{ fontSize: '12px', color: '#666' }}>周{getWeekDay(day.date)}</div>
                            <div style={{ fontSize: '18px', marginTop: '4px' }}>
                              {day.completed ? '✅' : '⭕'}
                            </div>
                            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>
                              {day.date.slice(5)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {stats.firstRecordDate && (
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
                        📝 首次打卡日期: {stats.firstRecordDate}
                      </div>
                    )}
                  </div>
                )}

                {showHistory === h.id && (
                  <div style={{
                    gridColumn: '1 / -1', marginTop: '12px', padding: '16px',
                    background: '#f5f5f5', borderRadius: '8px',
                    borderTop: '1px solid #e0e0e0', width: '100%'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', color: '#333' }}>📅 {h.name} - 打卡历史</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={prevMonth} style={{
                          padding: '4px 12px', border: '1px solid #ddd',
                          background: '#fff', borderRadius: '4px', cursor: 'pointer'
                        }}>◀</button>
                        <span style={{ fontSize: '14px', fontWeight: 500, minWidth: '100px', textAlign: 'center' }}>
                          {calendarMonth.year}年{calendarMonth.month + 1}月
                        </span>
                        <button onClick={nextMonth} style={{
                          padding: '4px 12px', border: '1px solid #ddd',
                          background: '#fff', borderRadius: '4px', cursor: 'pointer'
                        }}>▶</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
                      {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                        <div key={day} style={{
                          textAlign: 'center', fontSize: '12px', color: '#888', padding: '4px'
                        }}>{day}</div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {calendarDays.map(({ date, isCurrentMonth }) => {
                        const completed = completionMap.get(date);
                        const isSelected = date === makeupDate;
                        const isFuture = date > today;
                        return (
                          <div
                            key={date}
                            onClick={() => {
                              if (!isFuture && isCurrentMonth) {
                                setMakeupDate(date);
                                if (completed) {
                                  if (confirm(`确定要取消 ${date} 的打卡记录吗？`)) {
                                    handleDeleteRecord(h.id, date);
                                  }
                                } else {
                                  handleRecordHabit(h.id, date, h.target);
                                }
                              }
                            }}
                            style={{
                              aspectRatio: '1',
                              display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              borderRadius: '6px',
                              background: completed ? '#e8f5e9' : isSelected ? '#bbdefb' : '#fff',
                              border: `1px solid ${completed ? '#81c784' : isSelected ? '#2196f3' : '#e0e0e0'}`,
                              opacity: isCurrentMonth ? (isFuture ? 0.5 : 1) : 0.3,
                              cursor: isCurrentMonth && !isFuture ? 'pointer' : 'default',
                              fontSize: '12px',
                              transition: 'all 0.2s'
                            }}
                            title={isCurrentMonth && !isFuture ? (completed ? `${date} ✅ 已完成 (点击取消)` : `${date} ⭕ 未完成 (点击补录)`) : ''}
                          >
                            <span style={{ fontSize: completed ? '16px' : '14px' }}>
                              {completed ? '✓' : date.slice(8).replace(/^0/, '')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '12px', color: '#666' }}>
                      <span>✓ 已完成</span>
                      <span>⭕ 未完成</span>
                      <span>点击日期可补录或取消打卡</span>
                    </div>
                  </div>
                )}

                {showMakeup === h.id && (
                  <div style={{
                    gridColumn: '1 / -1', marginTop: '12px', padding: '16px',
                    background: '#fff3e0', borderRadius: '8px',
                    border: '1px solid #ffcc80', width: '100%'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#e65100' }}>✏️ 补录打卡 - {h.name}</h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: '13px', color: '#666', marginRight: '8px' }}>选择补录日期:</label>
                        <input
                          type="date"
                          value={makeupDate}
                          max={today}
                          onChange={(e) => setMakeupDate(e.target.value)}
                          style={{
                            padding: '8px 12px', border: '1px solid #ddd',
                            borderRadius: '6px', fontSize: '14px'
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleMakeup(h.id)}
                        disabled={recording === h.id}
                        style={{
                          padding: '8px 20px', borderRadius: '20px', border: 'none',
                          background: h.color || '#4caf50', color: '#fff',
                          cursor: 'pointer', fontSize: '14px',
                          opacity: recording === h.id ? 0.7 : 1
                        }}
                      >{recording === h.id ? '补录中...' : '确认补录'}</button>
                      <button
                        onClick={() => setShowMakeup(null)}
                        style={{
                          padding: '8px 20px', borderRadius: '20px',
                          border: '1px solid #999', background: '#fff',
                          color: '#666', cursor: 'pointer', fontSize: '14px'
                        }}
                      >取消</button>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
                      💡 补录后将自动重新计算连续天数和统计数据
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {habits.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <div>暂无习惯，快去添加吧！</div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'challenges' && <HabitChallengeCard />}

      {showCreator && (
        <HabitChallengeCreator
          onClose={() => setShowCreator(false)}
          preselectedHabitId={selectedHabitId}
        />
      )}
    </div>
  );
};
