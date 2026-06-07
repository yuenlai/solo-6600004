import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';
import { HabitChallengeCreator } from './HabitChallengeCreator';
import { HabitChallengeCard } from './HabitChallengeCard';

export const HabitTracker: React.FC = () => {
  const { habits, recordHabit, selectedDate, loadChallenges, challenges, checkedExceptionDay } = useScheduleStore();
  const [showCreator, setShowCreator] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'habits' | 'challenges'>('habits');

  const isHabitSkipped = (habitId: string) => {
    if (!checkedExceptionDay?.rule?.skipHabits) return false;
    const habitIds = checkedExceptionDay.rule.habitIdsToSkip;
    return habitIds.length === 0 || habitIds.includes(habitId);
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  const handleCreateChallenge = (habitId?: string) => {
    setSelectedHabitId(habitId);
    setShowCreator(true);
  };

  const activeChallengesCount = challenges.filter(c => c.status === 'active').length;

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
                  <div style={{ fontSize: '11px', color: '#888' }}>
                    🔥 连续 {h.currentStreak} 天 | 目标: {h.target}{h.unit}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                      onClick={() => !skipped && recordHabit(h.id, selectedDate, h.target)}
                      disabled={skipped}
                      style={{
                        padding: '6px 16px', borderRadius: '20px', border: 'none',
                        background: skipped ? '#bdbdbd' : (h.color || '#4caf50'),
                        color: '#fff', cursor: skipped ? 'not-allowed' : 'pointer',
                        fontSize: '13px'
                      }}
                    >{skipped ? '已跳过' : '打卡'}</button>
                  ) : <span style={{ color: '#4caf50', fontSize: '13px' }}>✓ 已完成</span>}
                </div>
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
