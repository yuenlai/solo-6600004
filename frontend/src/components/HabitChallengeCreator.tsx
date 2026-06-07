import React, { useState } from 'react';
import { useScheduleStore } from '../store/schedule';
import { challengeApi } from '../services/api';
import { HabitChallenge } from '../types';

interface Props {
  onClose: () => void;
  preselectedHabitId?: string;
}

export const HabitChallengeCreator: React.FC<Props> = ({ onClose, preselectedHabitId }) => {
  const { habits, addChallenge, loadChallenges } = useScheduleStore();
  const [habitId, setHabitId] = useState(preselectedHabitId || '');
  const [name, setName] = useState('');
  const [targetDays, setTargetDays] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitId || !name || targetDays < 1) return;

    try {
      const res = await challengeApi.create({
        habitId,
        name,
        targetDays,
        startDate,
        description
      });
      const c = res.data as HabitChallenge;
      addChallenge(c);
      await loadChallenges();
      onClose();
    } catch (err) {
      console.error('Failed to create challenge:', err);
      alert('创建挑战失败，请稍后重试');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '500px'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>🎯 发起习惯挑战</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
              选择习惯
            </label>
            <select
              value={habitId}
              onChange={e => setHabitId(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px'
              }}
              required
            >
              <option value="">请选择习惯...</option>
              {habits.map(h => (
                <option key={h.id} value={h.id}>
                  {h.icon} {h.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
              挑战名称
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如：30天早起挑战"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
              目标天数：{targetDays} 天
            </label>
            <input
              type="range"
              min="7"
              max="365"
              value={targetDays}
              onChange={e => setTargetDays(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
              <span>7天</span>
              <span>365天</span>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
              开始日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
              挑战描述（可选）
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="描述你的挑战目标和动力..."
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd',
                background: '#fff', cursor: 'pointer', fontSize: '14px'
              }}
            >
              取消
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 24px', borderRadius: '6px', border: 'none',
                background: '#1a237e', color: '#fff', cursor: 'pointer', fontSize: '14px',
                fontWeight: 500
              }}
            >
              创建挑战
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
