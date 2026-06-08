import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';
import { Schedule } from '../types';

interface EveningReviewProps {
  onClose: () => void;
}

const moodOptions = [
  { value: 'great', label: '😊 超棒', color: '#4caf50' },
  { value: 'good', label: '🙂 不错', color: '#8bc34a' },
  { value: 'neutral', label: '😐 一般', color: '#ffc107' },
  { value: 'bad', label: '😔 不佳', color: '#ff9800' },
  { value: 'terrible', label: '😢 糟糕', color: '#f44336' },
];

export const EveningReview: React.FC<EveningReviewProps> = ({ onClose }) => {
  const { selectedDate, eveningReview, schedules, loadEveningReview, loadCompletionStats, completionStats, createEveningReview, updateEveningReview, toggleComplete } = useScheduleStore();
  
  const [highlights, setHighlights] = useState('');
  const [improvements, setImprovements] = useState('');
  const [summary, setSummary] = useState('');
  const [mood, setMood] = useState<string>('neutral');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<{ completed: number; total: number; rate: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setHighlights('');
      setImprovements('');
      setSummary('');
      setMood('neutral');
      setIsEditing(false);
      setStats(null);
      
      await Promise.all([
        loadEveningReview(selectedDate),
        loadCompletionStats(selectedDate)
      ]);
      setIsLoading(false);
    };
    loadData();
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoading && eveningReview) {
      setHighlights(eveningReview.highlights || '');
      setImprovements(eveningReview.improvements || '');
      setSummary(eveningReview.summary || '');
      setMood(eveningReview.mood || 'neutral');
      setIsEditing(true);
    } else if (!isLoading && !eveningReview) {
      setHighlights('');
      setImprovements('');
      setSummary('');
      setMood('neutral');
      setIsEditing(false);
    }
  }, [eveningReview, isLoading]);

  useEffect(() => {
    if (completionStats) {
      setStats({
        completed: completionStats.completedCount,
        total: completionStats.totalCount,
        rate: completionStats.completionRate
      });
    }
  }, [completionStats]);

  const handleToggleComplete = async (scheduleId: string) => {
    await toggleComplete(scheduleId);
  };

  const handleSave = async () => {
    if (!highlights.trim() && !improvements.trim() && !summary.trim()) {
      alert('请至少填写一项内容');
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateEveningReview(selectedDate, {
          highlights,
          improvements,
          summary,
          mood
        });
      } else {
        await createEveningReview({
          highlights,
          improvements,
          summary,
          mood
        });
      }
      onClose();
    } catch (e: any) {
      alert(e.response?.data?.detail || '保存失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    return date.toLocaleDateString('zh-CN', options);
  };

  const formatTime = (iso: string) => {
    return iso.split('T')[1]?.substring(0, 5) || '';
  };

  const getRateColor = (rate: number) => {
    if (rate >= 80) return '#4caf50';
    if (rate >= 60) return '#ffc107';
    return '#f44336';
  };

  const sortedSchedules = [...schedules].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000
      }} onClick={onClose}>
        <div style={{
          background: '#fff', borderRadius: '12px', width: '750px',
          maxWidth: '90vw', padding: '40px', textAlign: 'center'
        }} onClick={e => e.stopPropagation()}>
          <p style={{ margin: 0, fontSize: '16px', color: '#666' }}>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '750px',
        maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: '28px'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#1a237e' }}>🌙 晚间复盘</h2>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>{formatDate(selectedDate)}</p>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '28px', color: '#999', lineHeight: 1
          }}>×</button>
        </div>

        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{ padding: '20px', background: '#e3f2fd', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#666', marginBottom: '8px' }}>已完成</p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#1976d2' }}>{stats.completed}</p>
            </div>
            <div style={{ padding: '20px', background: '#f3e5f5', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#666', marginBottom: '8px' }}>总计</p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: '#7b1fa2' }}>{stats.total}</p>
            </div>
            <div style={{ padding: '20px', background: '#e8f5e9', borderRadius: '10px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '13px', color: '#666', marginBottom: '8px' }}>完成率</p>
              <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold', color: getRateColor(stats.rate) }}>{stats.rate}%</p>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: '#333' }}>
            📋 今日日程完成情况
          </label>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
            {sortedSchedules.length > 0 ? (
              sortedSchedules.map((schedule: Schedule) => (
                <div key={schedule.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 16px', borderBottom: '1px solid #f0f0f0',
                  background: schedule.completed ? '#f9f9f9' : '#fff'
                }}>
                  <input
                    type="checkbox"
                    checked={schedule.completed}
                    onChange={() => handleToggleComplete(schedule.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ 
                    minWidth: '90px', fontSize: '13px', 
                    color: schedule.completed ? '#999' : '#666' 
                  }}>
                    {formatTime(schedule.startTime)}
                  </span>
                  <span style={{ 
                    flex: 1, fontSize: '14px', 
                    color: schedule.completed ? '#999' : '#333',
                    textDecoration: schedule.completed ? 'line-through' : 'none'
                  }}>
                    {schedule.title}
                  </span>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                    background: schedule.priority === 'high' ? '#ffcdd2' : schedule.priority === 'medium' ? '#fff9c4' : '#c8e6c9',
                    color: schedule.priority === 'high' ? '#c62828' : schedule.priority === 'medium' ? '#f57f17' : '#2e7d32'
                  }}>
                    {schedule.priority === 'high' ? '高' : schedule.priority === 'medium' ? '中' : '低'}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ margin: 0, padding: '24px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                今日没有安排日程
              </p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: '#333' }}>
            今日心情
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {moodOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setMood(option.value)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', border: `2px solid ${mood === option.value ? option.color : '#e0e0e0'}`,
                  background: mood === option.value ? `${option.color}15` : '#fff',
                  color: mood === option.value ? option.color : '#666',
                  cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: '#333' }}>
            ✨ 今日亮点
          </label>
          <textarea
            value={highlights}
            onChange={e => setHighlights(e.target.value)}
            placeholder="今天有什么做得好的地方？有什么值得开心的事？"
            style={{
              width: '100%', height: '80px', padding: '12px',
              border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
            }}
            maxLength={300}
          />
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#999', textAlign: 'right' }}>
            {highlights.length}/300
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: '#333' }}>
            💡 待改进
          </label>
          <textarea
            value={improvements}
            onChange={e => setImprovements(e.target.value)}
            placeholder="有什么可以做得更好的？明天要注意什么？"
            style={{
              width: '100%', height: '80px', padding: '12px',
              border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
            }}
            maxLength={300}
          />
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#999', textAlign: 'right' }}>
            {improvements.length}/300
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: '#333' }}>
            📝 今日总结
          </label>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="用几句话总结一下今天..."
            style={{
              width: '100%', height: '80px', padding: '12px',
              border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
            }}
            maxLength={500}
          />
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#999', textAlign: 'right' }}>
            {summary.length}/500
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, padding: '12px 20px', borderRadius: '8px',
            border: '1px solid #ddd', background: '#fff', color: '#666',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px',
            opacity: loading ? 0.6 : 1
          }}>取消</button>
          <button onClick={handleSave} disabled={loading} style={{
            flex: 1, padding: '12px 20px', borderRadius: '8px',
            border: 'none', background: '#1a237e', color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px',
            opacity: loading ? 0.6 : 1
          }}>{loading ? '保存中...' : isEditing ? '💾 更新复盘' : '✅ 保存复盘'}</button>
        </div>
      </div>
    </div>
  );
};
