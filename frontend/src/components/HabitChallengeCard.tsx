import React from 'react';
import { useScheduleStore } from '../store/schedule';
import { HabitChallenge } from '../types';

interface ChallengeCardProps {
  challenge: HabitChallenge;
  onDelete?: () => void;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({ challenge, onDelete }) => {
  const { habits, selectedDate, recordChallenge } = useScheduleStore();
  const habit = habits.find(h => h.id === challenge.habitId);

  const completedDays = challenge.records.filter(r => r.completed).length;
  const progress = Math.min((completedDays / challenge.targetDays) * 100, 100);

  const today = new Date().toISOString().split('T')[0];
  const endDate = new Date(challenge.endDate);
  const todayDate = new Date(today);
  const diffTime = endDate.getTime() - todayDate.getTime();
  const remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const todayRecord = challenge.records.find(r => r.date === selectedDate);
  const isCompletedToday = todayRecord?.completed || false;

  const isOnTrack = (() => {
    if (challenge.status !== 'active') return true;
    const startDate = new Date(challenge.startDate);
    const daysSinceStart = Math.max(0, Math.floor((todayDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const expectedDays = Math.min(daysSinceStart, challenge.targetDays);
    return completedDays >= expectedDays * 0.8;
  })();

  const getStatusColor = () => {
    if (challenge.status === 'completed') return '#4caf50';
    if (challenge.status === 'failed') return '#f44336';
    return isOnTrack ? '#4caf50' : '#ff9800';
  };

  const getStatusText = () => {
    if (challenge.status === 'completed') return '🎉 挑战成功';
    if (challenge.status === 'failed') return '😢 挑战失败';
    if (remainingDays === 0) return '⏰ 最后一天';
    return isOnTrack ? '✅ 进度正常' : '⚠️ 需要加油';
  };

  const handleCheckIn = async () => {
    if (challenge.status !== 'active') return;
    try {
      const habitValue = habit?.target || 1;
      await recordChallenge(challenge.id, selectedDate, habitValue);
    } catch (e) {
      console.error('Failed to check in:', e);
      alert('打卡失败，请稍后重试');
    }
  };

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '16px',
      border: `2px solid ${getStatusColor()}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>{habit?.icon || '🎯'}</span>
          <div>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>{challenge.name}</h4>
            <span style={{
              fontSize: '12px', padding: '2px 8px', borderRadius: '10px',
              background: `${getStatusColor()}20`, color: getStatusColor(), fontWeight: 500
            }}>
              {getStatusText()}
            </span>
          </div>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#999', fontSize: '18px', padding: '4px'
            }}
            title="删除挑战"
          >
            ✕
          </button>
        )}
      </div>

      {challenge.description && (
        <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#666' }}>
          {challenge.description}
        </p>
      )}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', color: '#666' }}>完成进度</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: getStatusColor() }}>
            {completedDays} / {challenge.targetDays} 天
          </span>
        </div>
        <div style={{
          height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden'
        }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: getStatusColor(), borderRadius: '4px',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '10px 12px', background: '#f5f5f5',
        borderRadius: '8px', marginBottom: '12px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#1a237e' }}>
            {remainingDays}
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>剩余天数</div>
        </div>
        <div style={{ width: '1px', background: '#ddd' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '18px', fontWeight: 600, color: getStatusColor() }}>
            {Math.round(progress)}%
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>完成率</div>
        </div>
        <div style={{ width: '1px', background: '#ddd' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '18px', fontWeight: 600,
            color: isOnTrack ? '#4caf50' : '#ff9800'
          }}>
            {isOnTrack ? '✓' : '!'}
          </div>
          <div style={{ fontSize: '11px', color: '#888' }}>是否达标</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {challenge.status === 'active' ? (
          isCompletedToday ? (
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px',
              background: '#e8f5e9', borderRadius: '8px',
              color: '#4caf50', fontSize: '14px', fontWeight: 500
            }}>
              ✓ 今日已打卡
            </div>
          ) : (
            <button
              onClick={handleCheckIn}
              style={{
                flex: 1, padding: '10px', border: 'none', borderRadius: '8px',
                background: '#1a237e', color: '#fff', cursor: 'pointer',
                fontSize: '14px', fontWeight: 500
              }}
            >
              📝 今日打卡
            </button>
          )
        ) : (
          <div style={{
            flex: 1, textAlign: 'center', padding: '10px',
            background: challenge.status === 'completed' ? '#e8f5e9' : '#ffebee',
            borderRadius: '8px',
            color: challenge.status === 'completed' ? '#4caf50' : '#f44336',
            fontSize: '14px', fontWeight: 500
          }}>
            {challenge.status === 'completed' ? '🎉 恭喜完成挑战！' : '😢 挑战已结束'}
          </div>
        )}
      </div>
    </div>
  );
};

export const HabitChallengeCard: React.FC = () => {
  const { challenges, deleteChallenge } = useScheduleStore();
  const activeChallenges = challenges.filter(c => c.status === 'active');
  const completedChallenges = challenges.filter(c => c.status !== 'active');

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个挑战吗？')) {
      try {
        await deleteChallenge(id);
      } catch (e) {
        console.error('Failed to delete challenge:', e);
        alert('删除失败，请稍后重试');
      }
    }
  };

  if (challenges.length === 0) {
    return (
      <div style={{
        padding: '32px', textAlign: 'center', color: '#999',
        background: '#fafafa', borderRadius: '12px', border: '2px dashed #ddd'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
        <div style={{ fontSize: '14px' }}>暂无习惯挑战</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>前往「习惯」页面发起挑战吧！</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {activeChallenges.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: '14px', color: '#666' }}>
            🔥 进行中的挑战 ({activeChallenges.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeChallenges.map(c => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </div>
        </div>
      )}

      {completedChallenges.length > 0 && (
        <div>
          <h4 style={{ margin: '16px 0 8px', fontSize: '14px', color: '#666' }}>
            📜 已结束的挑战 ({completedChallenges.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.85 }}>
            {completedChallenges.map(c => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                onDelete={() => handleDelete(c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
