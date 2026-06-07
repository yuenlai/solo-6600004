import React, { useState, useEffect } from 'react';
import { scheduleApi } from '../services/api';
import { useScheduleStore } from '../store/schedule';
import { Schedule, RescheduleOption, RescheduleMode, ConflictInfo } from '../types';

interface RescheduleAssistantProps {
  mode: RescheduleMode;
  conflictInfo?: ConflictInfo;
  onClose: () => void;
  onConfirmed?: (schedule: Schedule) => void;
  onCreated?: (schedule: Schedule) => void;
}

export const RescheduleAssistant: React.FC<RescheduleAssistantProps> = ({
  mode,
  conflictInfo,
  onClose,
  onConfirmed,
  onCreated
}) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<RescheduleOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { updateSchedule, addSchedule, schedules } = useScheduleStore();

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    return iso.split('T')[0];
  };

  const getDurationMinutes = (start: string, end: string) => {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  };

  const getScoreColor = (score: number) => {
    if (score >= 120) return '#4caf50';
    if (score >= 100) return '#8bc34a';
    if (score >= 80) return '#ffc107';
    if (score >= 60) return '#ff9800';
    return '#f44336';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 120) return '极佳';
    if (score >= 100) return '很好';
    if (score >= 80) return '良好';
    if (score >= 60) return '一般';
    return '较差';
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      high: '#ffcdd2',
      medium: '#fff9c4',
      low: '#c8e6c9'
    };
    const labels: Record<string, string> = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return (
      <span style={{
        fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
        background: colors[priority] || colors.medium
      }}>
        {labels[priority] || '中'}
      </span>
    );
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await scheduleApi.getRescheduleOptions({
        scheduleId: mode.type === 'existing' ? mode.schedule?.id : undefined,
        title: mode.title,
        preferredStartTime: mode.preferredStartTime,
        durationMinutes: mode.durationMinutes,
        priority: mode.priority,
        category: mode.category,
        date: mode.date,
        maxOptions: 5
      });
      
      const optionsData = res.data.options.map((opt: any) => ({
        optionId: opt.option_id,
        title: opt.title,
        startTime: opt.start_time,
        endTime: opt.end_time,
        durationMinutes: opt.duration_minutes,
        score: opt.score,
        reason: opt.reason,
        originalSchedule: res.data.original_schedule ? {
          id: res.data.original_schedule.id,
          title: res.data.original_schedule.title,
          description: res.data.original_schedule.description,
          startTime: res.data.original_schedule.start_time,
          endTime: res.data.original_schedule.end_time,
          priority: res.data.original_schedule.priority,
          category: res.data.original_schedule.category,
          completed: res.data.original_schedule.completed,
          recurring: res.data.original_schedule.recurring
        } : undefined
      }));
      
      setOptions(optionsData);
      if (optionsData.length > 0) {
        setSelectedOptionId(optionsData[0].optionId);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || '获取改期方案失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedOptionId) return;
    
    const selected = options.find(o => o.optionId === selectedOptionId);
    if (!selected) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (mode.type === 'existing' && mode.schedule) {
        const res = await scheduleApi.confirmReschedule(
          mode.schedule.id,
          selected.startTime,
          selected.endTime,
          selected.optionId
        );
        
        const updatedSchedule: Schedule = {
          id: res.data.schedule.id,
          title: res.data.schedule.title,
          description: res.data.schedule.description,
          startTime: res.data.schedule.start_time,
          endTime: res.data.schedule.end_time,
          priority: res.data.schedule.priority,
          category: res.data.schedule.category,
          completed: res.data.schedule.completed,
          recurring: res.data.schedule.recurring
        };
        
        updateSchedule(updatedSchedule.id, {
          startTime: updatedSchedule.startTime,
          endTime: updatedSchedule.endTime
        });
        
        setSuccess('✅ 改期成功！日程已更新');
        setTimeout(() => {
          onConfirmed?.(updatedSchedule);
          onClose();
        }, 1000);
      } else {
        const res = await scheduleApi.create({
          title: mode.title,
          description: mode.schedule?.description || '',
          start_time: selected.startTime,
          end_time: selected.endTime,
          priority: mode.priority,
          category: mode.category
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
          recurring: res.data.recurring
        };
        
        addSchedule(newSchedule);
        setSuccess('✅ 创建成功！日程已添加');
        setTimeout(() => {
          onCreated?.(newSchedule);
          onClose();
        }, 1000);
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || '操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const renderConflictInfo = () => {
    if (!conflictInfo || !conflictInfo.hasConflict) return null;
    
    return (
      <div style={{
        background: '#fff3e0',
        border: '1px solid #ff9800',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <span style={{ fontWeight: 600, color: '#e65100' }}>检测到时间冲突</span>
        </div>
        <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#666' }}>
          {conflictInfo.message}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {conflictInfo.conflictingSchedules.map(s => (
            <div key={s.id} style={{
              background: '#fff',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              border: '1px solid #ffcc80'
            }}>
              <span style={{ fontWeight: 500 }}>{s.title}</span>
              <span style={{ color: '#999', marginLeft: '6px' }}>
                {formatTime(s.startTime)} - {formatTime(s.endTime)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderOriginalInfo = () => {
    if (mode.type !== 'existing' || !mode.schedule) return null;
    
    return (
      <div style={{
        background: '#f5f5f5',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>原日程安排</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#1a237e', fontWeight: 500 }}>
            {formatTime(mode.schedule.startTime)} - {formatTime(mode.schedule.endTime)}
          </span>
          <span style={{ flex: 1, fontWeight: 500 }}>{mode.schedule.title}</span>
          {getPriorityBadge(mode.schedule.priority)}
        </div>
      </div>
    );
  };

  const renderOptions = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
          <p>智能分析日程安排中...</p>
        </div>
      );
    }

    if (options.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>😔</div>
          <p>暂无可用的改期方案</p>
          <p style={{ fontSize: '12px', marginTop: '8px' }}>尝试缩短日程时长或更换日期</p>
        </div>
      );
    }

    return (
      <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '0 4px'
        }}>
          <h3 style={{ fontSize: '14px', margin: 0, color: '#333' }}>
            为你找到 {options.length} 个可选方案
          </h3>
          <span style={{ fontSize: '11px', color: '#999' }}>
            按推荐度排序
          </span>
        </div>
        
        {options.map((option, index) => {
          const isSelected = selectedOptionId === option.optionId;
          const dateStr = formatDate(option.startTime);
          const dayOfWeek = new Date(option.startTime).toLocaleDateString('zh-CN', { weekday: 'short' });
          const timeChange = mode.schedule ? getDurationMinutes(mode.schedule.startTime, option.startTime) : 0;
          const timeChangeStr = timeChange > 0 ? `+${timeChange}分钟` : timeChange < 0 ? `${timeChange}分钟` : '同时段';
          
          return (
            <div
              key={option.optionId}
              onClick={() => setSelectedOptionId(option.optionId)}
              style={{
                border: `2px solid ${isSelected ? '#1a237e' : '#e0e0e0'}`,
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '10px',
                cursor: 'pointer',
                background: isSelected ? '#e8eaf6' : '#fff',
                transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {index === 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '12px',
                  background: '#4caf50',
                  color: '#fff',
                  fontSize: '10px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 600
                }}>
                  最佳推荐
                </div>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: `2px solid ${isSelected ? '#1a237e' : '#ccc'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {isSelected && (
                    <div style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#1a237e'
                    }} />
                  )}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ color: '#1a237e', fontWeight: 600, fontSize: '15px' }}>
                      {formatTime(option.startTime)} - {formatTime(option.endTime)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#999' }}>
                      {dateStr} {dayOfWeek}
                    </span>
                    {mode.schedule && (
                      <span style={{
                        fontSize: '11px',
                        padding: '1px 6px',
                        borderRadius: '8px',
                        background: timeChange === 0 ? '#e8f5e9' : '#fff3e0',
                        color: timeChange === 0 ? '#2e7d32' : '#e65100'
                      }}>
                        {timeChangeStr}
                      </span>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: getScoreColor(option.score)
                      }} />
                      <span style={{
                        fontSize: '12px',
                        color: getScoreColor(option.score),
                        fontWeight: 600
                      }}>
                        {getScoreLabel(option.score)} ({option.score}分)
                      </span>
                    </div>
                    
                    <span style={{
                      fontSize: '11px',
                      color: '#888',
                      background: '#f5f5f5',
                      padding: '2px 8px',
                      borderRadius: '8px'
                    }}>
                      💡 {option.reason}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '560px',
        maxWidth: '90vw', maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px' }}>
              🤖 智能改期助手
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#666' }}>
              {mode.type === 'existing' ? '为你的日程推荐更优的时间段' : '找到冲突，为你推荐可用时段'}
            </p>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '24px', color: '#999', lineHeight: 1
          }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <p style={{ color: '#f44336', fontSize: '13px', margin: '0 0 12px', padding: '10px', background: '#ffebee', borderRadius: '6px' }}>
              {error}
            </p>
          )}
          
          {success && (
            <p style={{ color: '#2e7d32', fontSize: '13px', margin: '0 0 12px', padding: '10px', background: '#e8f5e9', borderRadius: '6px' }}>
              {success}
            </p>
          )}

          {renderConflictInfo()}
          {renderOriginalInfo()}
          {renderOptions()}
        </div>

        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e0e0e0',
          display: 'flex',
          gap: '12px'
        }}>
          <button onClick={onClose} disabled={loading} style={{
            flex: 1, padding: '12px 20px', borderRadius: '8px',
            border: '1px solid #ddd', background: '#fff', color: '#666',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px',
            opacity: loading ? 0.6 : 1
          }}>取消</button>
          <button 
            onClick={loadOptions} 
            disabled={loading} 
            style={{
              padding: '12px 20px', borderRadius: '8px',
              border: '1px solid #1a237e', background: '#fff', color: '#1a237e',
              cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px',
              opacity: loading ? 0.6 : 1
            }}>
            🔄 重新生成
          </button>
          <button 
            onClick={handleConfirm} 
            disabled={loading || !selectedOptionId || options.length === 0} 
            style={{
              flex: 1.5, padding: '12px 20px', borderRadius: '8px',
              border: 'none', background: '#1a237e', color: '#fff',
              cursor: (loading || !selectedOptionId || options.length === 0) ? 'not-allowed' : 'pointer', 
              fontSize: '14px', fontWeight: 600,
              opacity: (loading || !selectedOptionId || options.length === 0) ? 0.6 : 1
            }}>
            {loading ? '处理中...' : mode.type === 'existing' ? '✅ 确认改期' : '✅ 确认创建'}
          </button>
        </div>
      </div>
    </div>
  );
};
