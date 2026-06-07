import React, { useState } from 'react';
import { scheduleApi } from '../services/api';
import { useScheduleStore } from '../store/schedule';
import { Schedule } from '../types';

interface NaturalLanguageInputProps {
  onClose: () => void;
}

export const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({ onClose }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Schedule[]>([]);
  const [error, setError] = useState('');
  const { selectedDate, addSchedules } = useScheduleStore();

  const handlePreview = async () => {
    if (!text.trim()) {
      setError('请输入日程描述');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await scheduleApi.parse(text, selectedDate);
      const schedules = res.data.schedules.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.start_time,
        endTime: s.end_time,
        priority: s.priority,
        category: s.category,
        completed: s.completed,
        recurring: s.recurring
      }));
      setPreview(schedules);
    } catch (e: any) {
      setError(e.response?.data?.detail || '解析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (preview.length === 0) return;
    
    setLoading(true);
    setError('');
    try {
      const data = preview.map(s => ({
        title: s.title,
        description: s.description,
        start_time: s.startTime,
        end_time: s.endTime,
        priority: s.priority,
        category: s.category
      }));
      const res = await scheduleApi.batchCreate(data);
      const createdSchedules = res.data.schedules.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.start_time,
        endTime: s.end_time,
        priority: s.priority,
        category: s.category,
        completed: s.completed,
        recurring: s.recurring
      }));
      addSchedules(createdSchedules);
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || '保存失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    return iso.split('T')[1]?.substring(0, 5) || '';
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '600px',
        maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', padding: '24px'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>✨ 智能录入日程</h2>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '24px', color: '#999'
          }}>×</button>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#666' }}>
            输入你今天的安排，系统会自动识别并创建日程：
          </label>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`例如：
早上8点到9点吃早饭
上午9点半到11点开项目会议，重要
下午2点到4点写代码
晚上7点健身
晚上10点半睡觉`}
            style={{
              width: '100%', height: '150px', padding: '12px',
              border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
            }}
          />
        </div>

        {error && <p style={{ color: '#f44336', fontSize: '13px', margin: '8px 0' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={handlePreview}
            disabled={loading}
            style={{
              flex: 1, padding: '10px 20px', borderRadius: '8px',
              border: 'none', background: '#1a237e', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '解析中...' : '🔍 预览解析结果'}
          </button>
        </div>

        {preview.length > 0 && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', margin: '0 0 12px', color: '#333' }}>
                已识别 {preview.length} 条日程：
              </h3>
              {preview.map((s, idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 12px', marginBottom: '8px',
                  background: '#f5f5f5', borderRadius: '6px', fontSize: '14px'
                }}>
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                    background: s.priority === 'high' ? '#ffcdd2' : s.priority === 'medium' ? '#fff9c4' : '#c8e6c9'
                  }}>{s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}</span>
                  <span style={{ color: '#1a237e', fontWeight: 500, minWidth: '110px' }}>
                    {formatTime(s.startTime)} - {formatTime(s.endTime)}
                  </span>
                  <span style={{ flex: 1 }}>{s.title}</span>
                  <span style={{ color: '#999', fontSize: '12px' }}>{s.category}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={onClose} disabled={loading} style={{
                flex: 1, padding: '10px 20px', borderRadius: '8px',
                border: '1px solid #ddd', background: '#fff', color: '#666',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px',
                opacity: loading ? 0.6 : 1
              }}>取消</button>
              <button onClick={handleConfirm} disabled={loading} style={{
                flex: 1, padding: '10px 20px', borderRadius: '8px',
                border: 'none', background: '#4caf50', color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px',
                opacity: loading ? 0.6 : 1
              }}>{loading ? '保存中...' : '✅ 确认添加'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
