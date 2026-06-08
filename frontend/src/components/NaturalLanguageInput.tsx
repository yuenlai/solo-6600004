import React, { useState, useEffect, useCallback, useRef } from 'react';
import { scheduleApi } from '../services/api';
import { useScheduleStore } from '../store/schedule';
import { Schedule, ConflictInfo, TimeAdjustmentSuggestion } from '../types';
import { RescheduleAssistant } from './RescheduleAssistant';

interface NaturalLanguageInputProps {
  onClose: () => void;
}

interface EditableSchedule extends Schedule {
  tempStartTime: string;
  tempEndTime: string;
  checking: boolean;
}

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

const formatTime = (iso: string) => iso.split('T')[1]?.substring(0, 5) || '';
const getDurationMinutes = (start: string, end: string) => 
  Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);

const getScoreColor = (score: number) => {
  if (score >= 100) return '#4caf50';
  if (score >= 80) return '#8bc34a';
  if (score >= 60) return '#ffc107';
  return '#ff9800';
};

const getSeverityColor = (severity?: string) => {
  switch (severity) {
    case 'high': return { bg: '#ffebee', border: '#f44336', text: '#c62828' };
    case 'medium': return { bg: '#fff3e0', border: '#ff9800', text: '#e65100' };
    default: return { bg: '#e8f5e9', border: '#4caf50', text: '#2e7d32' };
  }
};

export const NaturalLanguageInput: React.FC<NaturalLanguageInputProps> = ({ onClose }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<EditableSchedule[]>([]);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<Map<string, ConflictInfo>>(new Map());
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [showRescheduleFor, setShowRescheduleFor] = useState<{ schedule: Schedule; conflict: ConflictInfo } | null>(null);
  const { selectedDate, addSchedules, checkScheduleConflict } = useScheduleStore();
  
  const conflictCheckTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const checkSingleConflict = useCallback(async (schedule: EditableSchedule) => {
    const timeoutId = conflictCheckTimeoutsRef.current.get(schedule.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    setPreview(prev => prev.map(s => 
      s.id === schedule.id ? { ...s, checking: true } : s
    ));
    
    const newTimeout = setTimeout(async () => {
      try {
        const result = await checkScheduleConflict(
          schedule.tempStartTime,
          schedule.tempEndTime,
          undefined,
          { title: schedule.title, priority: schedule.priority, category: schedule.category }
        );
        
        if (result) {
          setConflicts(prev => {
            const newConflicts = new Map(prev);
            if (result.hasConflict) {
              newConflicts.set(schedule.id, result);
            } else {
              newConflicts.delete(schedule.id);
            }
            return newConflicts;
          });
        }
      } catch (e) {
        console.error('Conflict check failed:', e);
      } finally {
        setPreview(prev => prev.map(s => 
          s.id === schedule.id ? { ...s, checking: false } : s
        ));
      }
    }, 300);
    
    conflictCheckTimeoutsRef.current.set(schedule.id, newTimeout);
  }, [checkScheduleConflict]);

  const handlePreview = async () => {
    if (!text.trim()) {
      setError('请输入日程描述');
      return;
    }
    setLoading(true);
    setError('');
    setConflicts(new Map());
    conflictCheckTimeoutsRef.current.forEach(t => clearTimeout(t));
    conflictCheckTimeoutsRef.current.clear();
    
    try {
      const res = await scheduleApi.parse(text, selectedDate);
      const schedules: EditableSchedule[] = res.data.schedules.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.start_time,
        endTime: s.end_time,
        tempStartTime: s.start_time,
        tempEndTime: s.end_time,
        priority: s.priority,
        category: s.category,
        completed: s.completed,
        recurring: s.recurring,
        checking: false
      }));
      setPreview(schedules);
      setExpandedScheduleId(null);
      
      schedules.forEach(s => checkSingleConflict(s));
    } catch (e: any) {
      setError(e.response?.data?.detail || '解析失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (scheduleId: string, field: 'start' | 'end', value: string) => {
    setPreview(prev => prev.map(s => {
      if (s.id !== scheduleId) return s;
      
      const currentIso = field === 'start' ? s.tempStartTime : s.tempEndTime;
      const scheduleDate = currentIso.split('T')[0];
      const newTime = `${scheduleDate}T${value}:00`;
      
      const updated = field === 'start'
        ? { ...s, tempStartTime: newTime }
        : { ...s, tempEndTime: newTime };
      
      const duration = getDurationMinutes(updated.tempStartTime, updated.tempEndTime);
      if (duration < 5) {
        return updated;
      }
      
      checkSingleConflict(updated);
      return updated;
    }));
  };

  const applySuggestion = (scheduleId: string, suggestion: TimeAdjustmentSuggestion) => {
    const newStartTime = suggestion.startTime;
    const newEndTime = suggestion.endTime;
    
    setPreview(prev => prev.map(s => {
      if (s.id !== scheduleId) return s;
      const updated = {
        ...s,
        tempStartTime: newStartTime,
        tempEndTime: newEndTime
      };
      checkSingleConflict(updated);
      return updated;
    }));
  };

  const handleReschedule = (schedule: Schedule, conflict: ConflictInfo) => {
    setShowRescheduleFor({ schedule, conflict });
  };

  const handleConfirm = async () => {
    if (preview.length === 0) return;
    
    const hasConflicts = Array.from(conflicts.values()).some(c => c.hasConflict);
    if (hasConflicts) {
      setError('存在时间冲突，请先调整或使用智能改期');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const data = preview.map(s => ({
        title: s.title,
        description: s.description,
        start_time: s.tempStartTime,
        end_time: s.tempEndTime,
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

  useEffect(() => {
    return () => {
      conflictCheckTimeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  const renderScheduleCard = (s: EditableSchedule, idx: number) => {
    const conflict = conflicts.get(s.id);
    const isExpanded = expandedScheduleId === s.id;
    const severityColors = conflict ? getSeverityColor(conflict.severity) : getSeverityColor('low');
    
    return (
      <div key={idx} style={{
        padding: '12px',
        marginBottom: '12px',
        background: conflict?.hasConflict ? severityColors.bg : '#f5f5f5',
        border: conflict?.hasConflict ? `1px solid ${severityColors.border}` : '1px solid transparent',
        borderRadius: '8px',
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{
            fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
            background: PRIORITIES.find(p => p.value === s.priority)?.color || '#eee',
            flexShrink: 0,
          }}>
            {PRIORITIES.find(p => p.value === s.priority)?.label || '中'}
          </span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <input
              type="time"
              value={formatTime(s.tempStartTime)}
              onChange={e => handleTimeChange(s.id, 'start', e.target.value)}
              style={{
                padding: '4px 6px', fontSize: '12px',
                border: '1px solid #ddd', borderRadius: '4px',
                width: '70px',
              }}
            />
            <span style={{ color: '#999' }}>-</span>
            <input
              type="time"
              value={formatTime(s.tempEndTime)}
              onChange={e => handleTimeChange(s.id, 'end', e.target.value)}
              style={{
                padding: '4px 6px', fontSize: '12px',
                border: '1px solid #ddd', borderRadius: '4px',
                width: '70px',
              }}
            />
            {s.checking && (
              <span style={{ fontSize: '11px', color: '#999' }}>🔍</span>
            )}
          </div>
          
          <span style={{ flex: 1, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.title}
          </span>
          
          <span style={{ color: '#999', fontSize: '12px', flexShrink: 0 }}>{s.category}</span>
          
          {conflict?.hasConflict ? (
            <button
              onClick={() => setExpandedScheduleId(isExpanded ? null : s.id)}
              style={{
                padding: '4px 10px', fontSize: '12px',
                background: '#ff9800', color: '#fff',
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                flexShrink: 0,
              }}>
              ⚠️ 冲突
            </button>
          ) : s.checking ? (
            <span style={{ fontSize: '12px', color: '#999' }}>检测中...</span>
          ) : (
            <span style={{ fontSize: '12px', color: '#4caf50', flexShrink: 0 }}>✓ 无冲突</span>
          )}
        </div>
        
        {isExpanded && conflict?.hasConflict && (
          <div style={{
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '6px',
            padding: '10px',
            marginTop: '8px',
          }}>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#666' }}>
              {conflict.message}
            </p>
            
            {conflict.affectedTimeRange && (
              <div style={{
                background: '#fff', padding: '6px 10px',
                borderRadius: '4px', fontSize: '11px', marginBottom: '8px',
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
            
            {conflict.conflictDetails && conflict.conflictDetails.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                  冲突对象：
                </div>
                {conflict.conflictDetails.map(detail => (
                  <div key={detail.scheduleId} style={{
                    background: '#fff', padding: '6px 8px', borderRadius: '4px',
                    border: '1px solid #ffcc80', fontSize: '11px',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    marginBottom: '4px',
                  }}>
                    <span style={{ 
                      padding: '1px 4px', borderRadius: '6px', fontSize: '9px',
                      background: PRIORITIES.find(p => p.value === detail.priority)?.color || '#eee',
                    }}>
                      {PRIORITIES.find(p => p.value === detail.priority)?.label || '中'}
                    </span>
                    <span style={{ fontWeight: 500, flex: 1 }}>{detail.title}</span>
                    <span style={{ color: '#666' }}>
                      {formatTime(detail.startTime)} - {formatTime(detail.endTime)}
                    </span>
                    <span style={{ 
                      padding: '1px 4px', borderRadius: '6px', fontSize: '9px',
                      background: '#fff3e0', color: '#e65100',
                    }}>
                      {OVERLAP_TYPE_LABELS[detail.overlapType] || detail.overlapType}
                    </span>
                    <span style={{ color: '#f44336', fontSize: '10px' }}>
                      -{detail.overlapMinutes}分钟
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {conflict.suggestions && conflict.suggestions.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
                  💡 调整建议（点击应用）：
                </div>
                {conflict.suggestions.slice(0, 3).map((suggestion, sIdx) => (
                  <div
                    key={suggestion.suggestionId}
                    onClick={() => applySuggestion(s.id, suggestion)}
                    style={{
                      background: '#fff', padding: '6px 8px', borderRadius: '4px',
                      border: '1px solid #e0e0e0', cursor: 'pointer',
                      marginBottom: '4px', fontSize: '11px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {sIdx === 0 && (
                        <span style={{
                          fontSize: '9px', padding: '1px 4px', borderRadius: '6px',
                          background: '#4caf50', color: '#fff', fontWeight: 600,
                        }}>推荐</span>
                      )}
                      <span style={{ fontWeight: 500 }}>
                        {formatTime(suggestion.startTime)} - {formatTime(suggestion.endTime)}
                      </span>
                      <span style={{ color: '#666' }}>
                        ({suggestion.durationMinutes}分钟)
                      </span>
                      <span style={{
                        marginLeft: 'auto', fontSize: '10px', fontWeight: 600,
                        color: getScoreColor(suggestion.score),
                      }}>
                        {suggestion.score}分
                      </span>
                    </div>
                    <div style={{ color: '#888', marginTop: '2px', fontSize: '10px' }}>
                      {suggestion.reason}
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReschedule(s, conflict);
                  }}
                  style={{
                    width: '100%', marginTop: '6px', padding: '6px',
                    fontSize: '11px', background: '#1a237e', color: '#fff',
                    border: 'none', borderRadius: '4px', cursor: 'pointer',
                  }}
                >
                  🤖 更多智能改期方案
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', zIndex: 1000
      }} onClick={onClose}>
        <div style={{
          background: '#fff', borderRadius: '12px', width: '640px',
          maxWidth: '90vw', maxHeight: '85vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }} onClick={e => e.stopPropagation()}>
          
          <div style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e0e0e0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h2 style={{ margin: 0, fontSize: '18px' }}>✨ 智能录入日程</h2>
            <button onClick={onClose} style={{
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '24px', color: '#999', lineHeight: 1,
            }}>×</button>
          </div>
          
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
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
                  width: '100%', height: '120px', padding: '12px',
                  border: '1px solid #ddd', borderRadius: '8px',
                  fontSize: '14px', fontFamily: 'inherit', resize: 'vertical',
                }}
              />
            </div>

            {error && <p style={{ 
              color: '#f44336', fontSize: '13px', margin: '8px 0',
              padding: '10px', background: '#ffebee', borderRadius: '6px',
            }}>{error}</p>}

            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <button
                onClick={handlePreview}
                disabled={loading}
                style={{
                  flex: 1, padding: '10px 20px', borderRadius: '8px',
                  border: 'none', background: '#1a237e', color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '14px', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? '解析中...' : '🔍 预览解析结果'}
              </button>
            </div>

            {preview.length > 0 && (
              <>
                <div style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  marginBottom: '12px',
                }}>
                  <h3 style={{ fontSize: '16px', margin: 0, color: '#333' }}>
                    已识别 {preview.length} 条日程：
                  </h3>
                  {conflicts.size > 0 && (
                    <span style={{
                      fontSize: '12px', color: '#e65100',
                      background: '#fff3e0', padding: '4px 10px', borderRadius: '12px'
                    }}>
                      ⚠️ {conflicts.size} 条有冲突，点击「冲突」查看详情和建议
                    </span>
                  )}
                  {conflicts.size === 0 && preview.length > 0 && (
                    <span style={{
                      fontSize: '12px', color: '#2e7d32',
                      background: '#e8f5e9', padding: '4px 10px', borderRadius: '12px'
                    }}>
                      ✓ 全部无冲突，可直接调整时间
                    </span>
                  )}
                </div>
                
                <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                  {preview.map((s, idx) => renderScheduleCard(s, idx))}
                </div>
                
                <div style={{ 
                  display: 'flex', gap: '12px', 
                  marginTop: '20px', paddingTop: '16px',
                  borderTop: '1px solid #e0e0e0',
                }}>
                  <button onClick={onClose} disabled={loading} style={{
                    flex: 1, padding: '10px 20px', borderRadius: '8px',
                    border: '1px solid #ddd', background: '#fff', color: '#666',
                    cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px',
                    opacity: loading ? 0.6 : 1,
                  }}>取消</button>
                  <button 
                    onClick={handleConfirm} 
                    disabled={loading || conflicts.size > 0}
                    style={{
                      flex: 1, padding: '10px 20px', borderRadius: '8px',
                      border: 'none', 
                      background: (loading || conflicts.size > 0) ? '#bdbdbd' : '#4caf50',
                      color: '#fff',
                      cursor: (loading || conflicts.size > 0) ? 'not-allowed' : 'pointer', 
                      fontSize: '14px', fontWeight: 600,
                      opacity: (loading || conflicts.size > 0) ? 0.6 : 1,
                    }}
                  >{loading ? '保存中...' : `✅ 确认添加 ${preview.length} 条日程`}</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {showRescheduleFor && (
        <RescheduleAssistant
          mode={{
            type: 'new',
            title: showRescheduleFor.schedule.title,
            durationMinutes: getDurationMinutes(showRescheduleFor.schedule.startTime, showRescheduleFor.schedule.endTime),
            priority: showRescheduleFor.schedule.priority,
            category: showRescheduleFor.schedule.category,
            preferredStartTime: showRescheduleFor.schedule.startTime,
            date: selectedDate
          }}
          conflictInfo={showRescheduleFor.conflict}
          onClose={() => setShowRescheduleFor(null)}
          onCreated={() => {
            setShowRescheduleFor(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
