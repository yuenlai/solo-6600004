import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useScheduleStore } from '../store/schedule';
import { Schedule, ConflictInfo, TimeAdjustmentSuggestion } from '../types';
import { scheduleApi } from '../services/api';

interface ScheduleEditorProps {
  mode: 'create' | 'edit';
  initialSchedule?: Partial<Schedule>;
  defaultStartTime?: string;
  defaultEndTime?: string;
  onClose: () => void;
  onSaved?: (schedule: Schedule) => void;
}

const formatTime = (iso: string) => iso.split('T')[1]?.substring(0, 5) || '';
const formatDate = (iso: string) => iso.split('T')[0] || '';
const getDurationMinutes = (start: string, end: string) => 
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);

const CATEGORIES = ['工作', '学习', '生活', '其他'];
const PRIORITIES: { value: Schedule['priority']; label: string; color: string }[] = [
  { value: 'high', label: '高', color: '#ffcdd2' },
  { value: 'medium', label: '中', color: '#fff9c4' },
  { value: 'low', label: '低', color: '#c8e6c9' },
];

const OVERLAP_TYPE_LABELS: Record<string, string> = {
  full: '完全包含',
  contains: '包含该日程',
  partial_start: '尾部冲突',
  partial_end: '头部冲突',
};

export const ScheduleEditor: React.FC<ScheduleEditorProps> = ({
  mode,
  initialSchedule,
  defaultStartTime,
  defaultEndTime,
  onClose,
  onSaved,
}) => {
  const { selectedDate, addSchedule, updateSchedule, checkScheduleConflict } = useScheduleStore();
  
  const [title, setTitle] = useState(initialSchedule?.title || '');
  const [description, setDescription] = useState(initialSchedule?.description || '');
  const [priority, setPriority] = useState<Schedule['priority']>(
    (initialSchedule?.priority as Schedule['priority']) || 'medium'
  );
  const [category, setCategory] = useState(initialSchedule?.category || '工作');
  
  const dateStr = initialSchedule?.startTime 
    ? formatDate(initialSchedule.startTime) 
    : selectedDate;
  
  const [startDate, setStartDate] = useState(dateStr);
  const [endDate, setEndDate] = useState(dateStr);
  
  const initialStartTime = defaultStartTime || initialSchedule?.startTime || `${dateStr}T09:00:00`;
  const initialEndTime = defaultEndTime || initialSchedule?.endTime || `${dateStr}T10:00:00`;
  
  const [startTime, setStartTime] = useState(formatTime(initialStartTime));
  const [endTime, setEndTime] = useState(formatTime(initialEndTime));
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const conflictCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const getFullStartIso = useCallback(() => {
    return `${startDate}T${startTime}:00`;
  }, [startDate, startTime]);
  
  const getFullEndIso = useCallback(() => {
    return `${endDate}T${endTime}:00`;
  }, [endDate, endTime]);
  
  const checkConflict = useCallback(async () => {
    const startIso = getFullStartIso();
    const endIso = getFullEndIso();
    
    if (new Date(endIso) <= new Date(startIso)) {
      setError('结束时间必须晚于开始时间');
      setConflict(null);
      return;
    }
    
    if (getDurationMinutes(startIso, endIso) < 5) {
      setError('日程时长至少5分钟');
      setConflict(null);
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      const result = await checkScheduleConflict(
        startIso,
        endIso,
        mode === 'edit' ? initialSchedule?.id : undefined,
        { title, priority, category }
      );
      setConflict(result);
      if (result?.hasConflict) {
        setShowSuggestions(true);
      }
    } catch (e) {
      console.error('Conflict check failed:', e);
    } finally {
      setLoading(false);
    }
  }, [getFullStartIso, getFullEndIso, mode, initialSchedule?.id, title, priority, category, checkScheduleConflict]);
  
  useEffect(() => {
    if (conflictCheckTimeoutRef.current) {
      clearTimeout(conflictCheckTimeoutRef.current);
    }
    conflictCheckTimeoutRef.current = setTimeout(() => {
      checkConflict();
    }, 300);
    
    return () => {
      if (conflictCheckTimeoutRef.current) {
        clearTimeout(conflictCheckTimeoutRef.current);
      }
    };
  }, [startDate, startTime, endDate, endTime, checkConflict]);
  
  const applySuggestion = (suggestion: TimeAdjustmentSuggestion) => {
    const newStartDate = formatDate(suggestion.startTime);
    const newEndDate = formatDate(suggestion.endTime);
    const newStartTime = formatTime(suggestion.startTime);
    const newEndTime = formatTime(suggestion.endTime);
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setStartTime(newStartTime);
    setEndTime(newEndTime);
    
    setTimeout(() => {
      checkConflict();
    }, 50);
  };
  
  const handleSave = async () => {
    if (!title.trim()) {
      setError('请输入日程标题');
      return;
    }
    
    const startIso = getFullStartIso();
    const endIso = getFullEndIso();
    
    if (new Date(endIso) <= new Date(startIso)) {
      setError('结束时间必须晚于开始时间');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      if (mode === 'create') {
        const res = await scheduleApi.create({
          title: title.trim(),
          description: description.trim(),
          start_time: startIso,
          end_time: endIso,
          priority,
          category,
        });
        
        const newSchedule: Schedule = {
          id: res.data.id,
          title: res.data.title,
          description: res.data.description,
          startTime: res.data.start_time,
          endTime: res.data.end_time,
          priority: res.data.priority,
          category: res.data.category,
          completed: res.data.completed,
          recurring: res.data.recurring,
        };
        
        addSchedule(newSchedule);
        onSaved?.(newSchedule);
      } else if (mode === 'edit' && initialSchedule?.id) {
        const res = await scheduleApi.update(initialSchedule.id, {
          title: title.trim(),
          description: description.trim(),
          start_time: startIso,
          end_time: endIso,
          priority,
          category,
        });
        
        const updatedSchedule: Schedule = {
          id: res.data.id,
          title: res.data.title,
          description: res.data.description,
          startTime: res.data.start_time,
          endTime: res.data.end_time,
          priority: res.data.priority,
          category: res.data.category,
          completed: res.data.completed,
          recurring: res.data.recurring,
        };
        
        updateSchedule(updatedSchedule.id, {
          startTime: updatedSchedule.startTime,
          endTime: updatedSchedule.endTime,
          title: updatedSchedule.title,
          description: updatedSchedule.description,
          priority: updatedSchedule.priority,
          category: updatedSchedule.category,
        });
        onSaved?.(updatedSchedule);
      }
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.detail || '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };
  
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return { bg: '#ffebee', border: '#f44336', text: '#c62828' };
      case 'medium': return { bg: '#fff3e0', border: '#ff9800', text: '#e65100' };
      default: return { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' };
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 100) return '#4caf50';
    if (score >= 80) return '#8bc34a';
    if (score >= 60) return '#ffc107';
    return '#ff9800';
  };
  
  const severityColors = conflict ? getSeverityColor(conflict.severity) : getSeverityColor('low');
  const duration = getDurationMinutes(getFullStartIso(), getFullEndIso());
  
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '560px',
        maxWidth: '90vw', maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>
            {mode === 'create' ? '➕ 新建日程' : '✏️ 编辑日程'}
          </h2>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '24px', color: '#999', lineHeight: 1,
          }}>×</button>
        </div>
        
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '10px 12px', background: '#ffebee', color: '#c62828',
              borderRadius: '6px', fontSize: '13px', marginBottom: '16px',
            }}>{error}</div>
          )}
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
              日程标题 <span style={{ color: '#f44336' }}>*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="请输入日程标题"
              style={{
                width: '100%', padding: '10px 12px', fontSize: '14px',
                border: '1px solid #ddd', borderRadius: '6px',
              }}
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                开始时间
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 10px', fontSize: '13px',
                    border: '1px solid #ddd', borderRadius: '6px',
                  }}
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  style={{
                    width: '90px', padding: '8px 10px', fontSize: '13px',
                    border: '1px solid #ddd', borderRadius: '6px',
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                结束时间
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{
                    flex: 1, padding: '8px 10px', fontSize: '13px',
                    border: '1px solid #ddd', borderRadius: '6px',
                  }}
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  style={{
                    width: '90px', padding: '8px 10px', fontSize: '13px',
                    border: '1px solid #ddd', borderRadius: '6px',
                  }}
                />
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px', fontSize: '13px', color: '#666' }}>
            ⏱️ 时长：{duration >= 60 ? `${Math.floor(duration / 60)}小时${duration % 60}分` : `${duration}分钟`}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                优先级
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    style={{
                      flex: 1, padding: '8px', fontSize: '13px',
                      background: priority === p.value ? p.color : '#f5f5f5',
                      border: priority === p.value ? `2px solid ${p.color.replace('dd2', 'd32').replace('9c4', '7b1').replace('8e6', '388')}` : '1px solid #ddd',
                      borderRadius: '6px', cursor: 'pointer',
                      fontWeight: priority === p.value ? 600 : 400,
                    }}
                  >{p.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
                分类
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: '100%', padding: '8px 10px', fontSize: '13px',
                  border: '1px solid #ddd', borderRadius: '6px', background: '#fff',
                }}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#333', fontWeight: 500 }}>
              描述
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="可选：添加日程详情"
              rows={3}
              style={{
                width: '100%', padding: '10px 12px', fontSize: '14px',
                border: '1px solid #ddd', borderRadius: '6px',
                resize: 'vertical', fontFamily: 'inherit',
              }}
            />
          </div>
          
          {loading && (
            <div style={{
              padding: '10px', textAlign: 'center', color: '#999', fontSize: '13px',
            }}>
              🔍 正在检查冲突...
            </div>
          )}
          
          {!loading && conflict && (
            <div style={{
              background: conflict.hasConflict ? severityColors.bg : '#e8f5e9',
              border: `1px solid ${conflict.hasConflict ? severityColors.border : '#4caf50'}`,
              borderRadius: '8px', padding: '12px', marginBottom: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '18px' }}>
                  {conflict.hasConflict ? '⚠️' : '✅'}
                </span>
                <span style={{ 
                  fontWeight: 600, 
                  color: conflict.hasConflict ? severityColors.text : '#2e7d32',
                }}>
                  {conflict.hasConflict ? '检测到时间冲突' : '该时间段可用'}
                </span>
                {conflict.hasConflict && conflict.severity && (
                  <span style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                    background: '#fff', border: `1px solid ${severityColors.border}`,
                    color: severityColors.text, marginLeft: 'auto',
                  }}>
                    {conflict.severity === 'high' ? '严重' : conflict.severity === 'medium' ? '中等' : '轻微'}
                  </span>
                )}
              </div>
              
              <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#666' }}>
                {conflict.message}
              </p>
              
              {conflict.hasConflict && conflict.affectedTimeRange && (
                <div style={{
                  background: 'rgba(255,255,255,0.5)', padding: '8px 10px',
                  borderRadius: '6px', fontSize: '12px', marginBottom: '10px',
                }}>
                  <span style={{ color: '#666' }}>影响时段：</span>
                  <span style={{ fontWeight: 500, color: '#333' }}>
                    {formatTime(conflict.affectedTimeRange.start)} - {formatTime(conflict.affectedTimeRange.end)}
                  </span>
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    共冲突 {conflict.affectedTimeRange.totalOverlapMinutes} 分钟
                  </span>
                </div>
              )}
              
              {conflict.hasConflict && conflict.conflictDetails && conflict.conflictDetails.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                    冲突对象：
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {conflict.conflictDetails.map(detail => (
                      <div key={detail.scheduleId} style={{
                        background: '#fff', padding: '8px 10px', borderRadius: '6px',
                        border: '1px solid #ffcc80', fontSize: '12px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                      }}>
                        <span style={{ 
                          padding: '2px 6px', borderRadius: '8px', fontSize: '10px',
                          background: PRIORITIES.find(p => p.value === detail.priority)?.color || '#eee',
                        }}>
                          {PRIORITIES.find(p => p.value === detail.priority)?.label || '中'}
                        </span>
                        <span style={{ fontWeight: 500, flex: 1 }}>{detail.title}</span>
                        <span style={{ color: '#666' }}>
                          {formatTime(detail.startTime)} - {formatTime(detail.endTime)}
                        </span>
                        <span style={{ 
                          padding: '2px 6px', borderRadius: '8px', fontSize: '10px',
                          background: '#fff3e0', color: '#e65100',
                        }}>
                          {OVERLAP_TYPE_LABELS[detail.overlapType] || detail.overlapType}
                        </span>
                        <span style={{ color: '#f44336', fontSize: '11px' }}>
                          -{detail.overlapMinutes}分钟
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {conflict.hasConflict && conflict.suggestions && conflict.suggestions.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowSuggestions(!showSuggestions)}
                    style={{
                      width: '100%', padding: '8px', fontSize: '12px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: '#1a237e', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    💡 调整建议 ({conflict.suggestions.length})
                    <span style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: showSuggestions ? 'rotate(90deg)' : 'rotate(0)' }}>
                      ▶
                    </span>
                  </button>
                  
                  {showSuggestions && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {conflict.suggestions.map((suggestion, idx) => (
                        <div
                          key={suggestion.suggestionId}
                          style={{
                            background: '#fff', padding: '10px 12px', borderRadius: '6px',
                            border: '1px solid #e0e0e0', cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onClick={() => applySuggestion(suggestion)}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            {idx === 0 && (
                              <span style={{
                                fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
                                background: '#4caf50', color: '#fff', fontWeight: 600,
                              }}>推荐</span>
                            )}
                            <span style={{ fontWeight: 500, fontSize: '13px' }}>
                              {formatTime(suggestion.startTime)} - {formatTime(suggestion.endTime)}
                            </span>
                            <span style={{ fontSize: '11px', color: '#666' }}>
                              ({suggestion.durationMinutes}分钟)
                            </span>
                            <span style={{
                              marginLeft: 'auto', fontSize: '11px', fontWeight: 600,
                              color: getScoreColor(suggestion.score),
                            }}>
                              {suggestion.score}分
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              padding: '1px 6px', borderRadius: '6px', fontSize: '10px',
                              background: suggestion.adjustmentType === 'move_earlier' ? '#e3f2fd' :
                                         suggestion.adjustmentType === 'move_later' ? '#fff3e0' : '#f3e5f5',
                              color: suggestion.adjustmentType === 'move_earlier' ? '#1565c0' :
                                     suggestion.adjustmentType === 'move_later' ? '#e65100' : '#6a1b9a',
                            }}>
                              {suggestion.adjustmentType === 'move_earlier' ? '提前' :
                               suggestion.adjustmentType === 'move_later' ? '延后' :
                               suggestion.adjustmentType === 'shorten' ? '缩短' : '调整'}
                            </span>
                            <span>{suggestion.reason}</span>
                            <span style={{ marginLeft: 'auto', color: '#1a237e', fontSize: '11px' }}>
                              点击应用 →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div style={{
          padding: '16px 20px', borderTop: '1px solid #e0e0e0',
          display: 'flex', gap: '12px',
        }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              flex: 1, padding: '10px 20px', borderRadius: '8px',
              border: '1px solid #ddd', background: '#fff', color: '#666',
              cursor: saving ? 'not-allowed' : 'pointer', fontSize: '14px',
              opacity: saving ? 0.6 : 1,
            }}
          >取消</button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || (conflict?.hasConflict ?? false)}
            style={{
              flex: 1.5, padding: '10px 20px', borderRadius: '8px',
              border: 'none', 
              background: (saving || !title.trim() || (conflict?.hasConflict ?? false)) ? '#bdbdbd' : '#1a237e',
              color: '#fff',
              cursor: (saving || !title.trim() || (conflict?.hasConflict ?? false)) ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600,
              opacity: (saving || !title.trim() || (conflict?.hasConflict ?? false)) ? 0.6 : 1,
            }}
          >
            {saving ? '保存中...' : mode === 'create' ? '✅ 创建日程' : '💾 保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
};
