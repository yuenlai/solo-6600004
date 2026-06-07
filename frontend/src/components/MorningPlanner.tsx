import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';

interface MorningPlannerProps {
  onClose: () => void;
}

export const MorningPlanner: React.FC<MorningPlannerProps> = ({ onClose }) => {
  const { selectedDate, morningPlan, schedules, loadMorningPlan, createMorningPlan, updateMorningPlan, generateMorningSuggestion } = useScheduleStore();
  
  const [focusItems, setFocusItems] = useState<string[]>([]);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [newFocusItem, setNewFocusItem] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadMorningPlan(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (morningPlan) {
      setFocusItems(morningPlan.focusItems || []);
      setPriorities(morningPlan.priorities || []);
      setNote(morningPlan.note || '');
      setIsEditing(true);
    } else {
      setFocusItems([]);
      setPriorities([]);
      setNote('');
      setIsEditing(false);
    }
  }, [morningPlan]);

  const handleAddFocusItem = () => {
    if (newFocusItem.trim()) {
      setFocusItems([...focusItems, newFocusItem.trim()]);
      setNewFocusItem('');
    }
  };

  const handleRemoveFocusItem = (index: number) => {
    setFocusItems(focusItems.filter((_, i) => i !== index));
  };

  const handleAddPriority = () => {
    if (newPriority.trim()) {
      setPriorities([...priorities, newPriority.trim()]);
      setNewPriority('');
    }
  };

  const handleRemovePriority = (index: number) => {
    setPriorities(priorities.filter((_, i) => i !== index));
  };

  const handleGenerateSuggestion = async () => {
    setLoading(true);
    try {
      const suggestion = await generateMorningSuggestion(selectedDate);
      if (suggestion) {
        if (suggestion.focus_items?.length) {
          setFocusItems(prev => [...prev, ...suggestion.focus_items.filter(item => !prev.includes(item))]);
        }
        if (suggestion.priorities?.length) {
          setPriorities(prev => [...prev, ...suggestion.priorities.filter(item => !prev.includes(item))]);
        }
        if (suggestion.note && !note) {
          setNote(suggestion.note);
        }
      }
    } catch (e) {
      console.error('Failed to generate suggestion:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (focusItems.length === 0 && priorities.length === 0 && !note.trim()) {
      alert('请至少填写一项内容');
      return;
    }

    setLoading(true);
    try {
      const scheduleIds = schedules.map(s => s.id);
      if (isEditing) {
        await updateMorningPlan(selectedDate, {
          focusItems,
          priorities,
          scheduleIds,
          note
        });
      } else {
        await createMorningPlan({
          focusItems,
          priorities,
          scheduleIds,
          note
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

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '700px',
        maxWidth: '90vw', maxHeight: '85vh', overflow: 'auto', padding: '28px'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#1a237e' }}>🌅 晨间规划</h2>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#666' }}>{formatDate(selectedDate)}</p>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '28px', color: '#999', lineHeight: 1
          }}>×</button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleGenerateSuggestion}
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px',
              border: '1px dashed #1a237e', background: '#f8f9ff',
              color: '#1a237e', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px', opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '生成中...' : '✨ 根据今日日程智能生成建议'}
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: '#333' }}>
            🎯 今日重点（最多5项）
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={newFocusItem}
              onChange={e => setNewFocusItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFocusItem()}
              placeholder="输入重点事项，按回车添加"
              style={{
                flex: 1, padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px'
              }}
              maxLength={50}
            />
            <button
              onClick={handleAddFocusItem}
              disabled={focusItems.length >= 5 || !newFocusItem.trim()}
              style={{
                padding: '10px 16px', borderRadius: '6px', border: 'none',
                background: focusItems.length >= 5 ? '#ccc' : '#1a237e',
                color: '#fff', cursor: focusItems.length >= 5 || !newFocusItem.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              添加
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {focusItems.map((item, index) => (
              <div key={index} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: '#fff8e1',
                borderLeft: '4px solid #ff9800', borderRadius: '4px'
              }}>
                <span style={{ fontSize: '12px', color: '#ff9800', fontWeight: 500, minWidth: '24px' }}>
                  #{index + 1}
                </span>
                <span style={{ flex: 1, fontSize: '14px' }}>{item}</span>
                <button
                  onClick={() => handleRemoveFocusItem(index)}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: '#f44336', fontSize: '18px', padding: '0 4px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {focusItems.length === 0 && (
              <p style={{ margin: 0, fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
                还没有添加重点事项
              </p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: '#333' }}>
            ⚡ 优先排序
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              value={newPriority}
              onChange={e => setNewPriority(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddPriority()}
              placeholder="输入优先事项，按回车添加"
              style={{
                flex: 1, padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px'
              }}
              maxLength={50}
            />
            <button
              onClick={handleAddPriority}
              disabled={!newPriority.trim()}
              style={{
                padding: '10px 16px', borderRadius: '6px', border: 'none',
                background: !newPriority.trim() ? '#ccc' : '#4caf50',
                color: '#fff', cursor: !newPriority.trim() ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              添加
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {priorities.map((item, index) => (
              <div key={index} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', background: '#e8f5e9',
                borderLeft: '4px solid #4caf50', borderRadius: '4px'
              }}>
                <span style={{ fontSize: '12px', color: '#4caf50', fontWeight: 500, minWidth: '24px' }}>
                  {index + 1}.
                </span>
                <span style={{ flex: 1, fontSize: '14px' }}>{item}</span>
                <button
                  onClick={() => handleRemovePriority(index)}
                  style={{
                    border: 'none', background: 'none', cursor: 'pointer',
                    color: '#f44336', fontSize: '18px', padding: '0 4px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {priorities.length === 0 && (
              <p style={{ margin: 0, fontSize: '13px', color: '#999', fontStyle: 'italic' }}>
                还没有添加优先事项
              </p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '10px', fontSize: '15px', fontWeight: 500, color: '#333' }}>
            📝 晨间笔记
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="记录今天的心情、目标或其他想法..."
            style={{
              width: '100%', height: '80px', padding: '12px',
              border: '1px solid #ddd', borderRadius: '8px',
              fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
            }}
            maxLength={200}
          />
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#999', textAlign: 'right' }}>
            {note.length}/200
          </p>
        </div>

        {schedules.length > 0 && (
          <div style={{ marginBottom: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666' }}>
              📅 今日已安排 {schedules.length} 个日程
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {schedules.slice(0, 5).map(s => (
                <span key={s.id} style={{
                  fontSize: '12px', padding: '4px 10px', borderRadius: '12px',
                  background: s.priority === 'high' ? '#ffcdd2' : s.priority === 'medium' ? '#fff9c4' : '#c8e6c9',
                  color: s.priority === 'high' ? '#c62828' : s.priority === 'medium' ? '#f57f17' : '#2e7d32'
                }}>
                  {s.title}
                </span>
              ))}
              {schedules.length > 5 && (
                <span style={{ fontSize: '12px', color: '#999', padding: '4px 8px' }}>
                  +{schedules.length - 5} 更多
                </span>
              )}
            </div>
          </div>
        )}

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
          }}>{loading ? '保存中...' : isEditing ? '💾 更新规划' : '✅ 保存规划'}</button>
        </div>
      </div>
    </div>
  );
};
