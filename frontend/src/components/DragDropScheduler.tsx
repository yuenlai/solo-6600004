import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useScheduleStore } from '../store/schedule';
import { Schedule, DragState, ResizeState, CreateDragState, ConflictInfo } from '../types';
import { scheduleApi } from '../services/api';
import { RescheduleAssistant } from './RescheduleAssistant';

const START_HOUR = 7;
const END_HOUR = 23;
const HOUR_HEIGHT = 60;
const MINUTE_HEIGHT = HOUR_HEIGHT / 60;
const SNAP_MINUTES = 15;

const CATEGORY_COLORS: Record<string, string> = {
  '工作': '#e3f2fd',
  '学习': '#f3e5f5',
  '生活': '#e8f5e9',
  '其他': '#fff3e0',
};

const CATEGORY_BORDER_COLORS: Record<string, string> = {
  '工作': '#1976d2',
  '学习': '#7b1fa2',
  '生活': '#388e3c',
  '其他': '#f57c00',
};

interface ScheduleBlockProps {
  schedule: Schedule;
  top: number;
  height: number;
  isDragging: boolean;
  isResizing: boolean;
  conflict: ConflictInfo | undefined;
  onDragStart: (e: React.MouseEvent, schedule: Schedule) => void;
  onResizeStart: (e: React.MouseEvent, schedule: Schedule, edge: 'top' | 'bottom') => void;
}

const ScheduleBlock: React.FC<ScheduleBlockProps> = ({
  schedule, top, height, isDragging, isResizing, conflict, onDragStart, onResizeStart }) => {
  const { toggleComplete, deleteSchedule } = useScheduleStore();
  const isShared = !!schedule.sharedFrom;
  const bgColor = isShared ? '#e3f2fd' : (CATEGORY_COLORS[schedule.category] || CATEGORY_COLORS['其他']);
  const borderColor = conflict ? '#d32f2f' : (isShared ? '#2196f3' : (CATEGORY_BORDER_COLORS[schedule.category] || CATEGORY_BORDER_COLORS['其他']));

  const formatTime = (iso: string) => {
    return iso.split('T')[1]?.substring(0, 5) || '';
  };

  return (
    <div
      draggable={false}
      onMouseDown={(e) => onDragStart(e, schedule)}
      style={{
        position: 'absolute',
        left: '50px',
        right: '8px',
        top: `${top}px`,
        height: `${height}px`,
        background: schedule.completed ? '#f5f5f5' : bgColor,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '4px',
        padding: '6px 10px',
        cursor: 'move',
        overflow: 'hidden',
        opacity: isDragging || isResizing ? 0.5 : 1,
        boxShadow: conflict ? '0 0 0 2px rgba(211, 47, 47, 0.3)' : (isShared ? '0 0 0 2px rgba(33, 150, 243, 0.2)' : 'none'),
        transition: 'box-shadow 0.2s',
        zIndex: isDragging || isResizing ? 100 : 1,
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '100%' }}>
        <input
          type="checkbox"
          checked={schedule.completed}
          onChange={(e) => { e.stopPropagation(); toggleComplete(schedule.id); }}
          onClick={(e) => e.stopPropagation()}
          style={{ flexShrink: 0 }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 500, fontSize: '13px',
            textDecoration: schedule.completed ? 'line-through' : 'none',
            color: schedule.completed ? '#999' : '#333',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}>
            {isShared && <span style={{ fontSize: '10px' }}>🔗</span>}
            {schedule.title}
            {isShared && <span style={{ fontSize: '9px', color: '#1976d2', fontWeight: 'normal' }}>· 来自 {schedule.sharedFrom}</span>}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
          </div>
          {conflict && (
              <div style={{ fontSize: '10px', color: '#d32f2f', marginTop: '2px' }}>
              ⚠️ {conflict.message}
            </div>
          )}
        </div>
        <span style={{
          fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
          background: schedule.priority === 'high' ? '#ffcdd2' : schedule.priority === 'medium' ? '#fff9c4' : '#c8e6c9',
          flexShrink: 0,
        }}>
          {schedule.priority === 'high' ? '高' : schedule.priority === 'medium' ? '中' : '低'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); deleteSchedule(schedule.id); }}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: '#999', fontSize: '16px', padding: '0 4px',
            flexShrink: 0,
          }}
        >×</button>
      </div>
      <div
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, schedule, 'top'); }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          cursor: 'ns-resize',
          background: 'transparent',
        }}
      />
      <div
        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e, schedule, 'bottom'); }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '6px',
          cursor: 'ns-resize',
        }}
      />
    </div>
  );
};

export const DragDropScheduler: React.FC = () => {
  const { schedules, selectedDate, conflicts, checkScheduleConflict, updateScheduleTime, addSchedule, clearConflicts } = useScheduleStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    scheduleId: null,
    startY: 0,
    originalStartTime: '',
    originalEndTime: '',
    currentStartTime: null,
    currentEndTime: null,
  });
  const [resizeState, setResizeState] = useState<ResizeState>({
    isResizing: false,
    scheduleId: null,
    edge: null,
    startY: 0,
    originalStartTime: '',
    originalEndTime: '',
    currentStartTime: null,
    currentEndTime: null,
  });
  const [createState, setCreateState] = useState<CreateDragState>({
    isCreating: false,
    startY: 0,
    startTime: null,
    endTime: null,
  });
  const [previewConflict, setPreviewConflict] = useState<ConflictInfo | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<{ startTime: string; endTime: string } | null>(null);
  const [newScheduleTitle, setNewScheduleTitle] = useState('');
  const [showRescheduleFor, setShowRescheduleFor] = useState<Schedule | null>(null);

  const daySchedules = useMemo(() => {
    return schedules.filter(s => s.startTime.startsWith(selectedDate));
  }, [schedules, selectedDate]);

  const getTimeFromY = useCallback((y: number): string => {
    const minutes = Math.round((y / MINUTE_HEIGHT) / SNAP_MINUTES) * SNAP_MINUTES;
    const hours = Math.floor(minutes / 60) + START_HOUR;
    const mins = minutes % 60;
    return `${selectedDate}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
  }, [selectedDate]);

  const getYFromTime = useCallback((time: string): number => {
    const dt = new Date(time);
    const hours = dt.getHours();
    const minutes = dt.getMinutes();
    return ((hours - START_HOUR) * 60 + minutes) * MINUTE_HEIGHT;
  }, []);

  const getDurationMinutes = (start: string, end: string): number => {
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  };

  const roundToNearestSnap = (minutes: number): number => {
    return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
  };

  const calculateFreeSlots = useCallback((): Array<{ start: string; end: string; duration: number }> => {
    const sorted = [...daySchedules].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    const slots: Array<{ start: string; end: string; duration: number }> = [];
    const dayStart = new Date(`${selectedDate}T${String(START_HOUR)}:00:00`);
    const dayEnd = new Date(`${selectedDate}T${String(END_HOUR)}:00:00`);
    let lastEnd = dayStart;

    for (const s of sorted) {
      const sStart = new Date(s.startTime);
      const sEnd = new Date(s.endTime);
      if (sStart > lastEnd) {
        const duration = (sStart.getTime() - lastEnd.getTime()) / 60000;
        if (duration >= 15) {
          slots.push({
            start: lastEnd.toISOString(),
            end: sStart.toISOString(),
            duration,
          });
        }
      }
      if (sEnd > lastEnd) {
        lastEnd = sEnd;
      }
    }

    if (lastEnd < dayEnd) {
      const duration = (dayEnd.getTime() - lastEnd.getTime()) / 60000;
      if (duration >= 15) {
        slots.push({
          start: lastEnd.toISOString(),
          end: dayEnd.toISOString(),
          duration,
        });
      }
    }

    return slots;
  }, [daySchedules, selectedDate]);

  const freeSlots = calculateFreeSlots();
  const totalFreeMinutes = freeSlots.reduce((sum, slot) => sum + slot.duration, 0);
  const totalBusyMinutes = daySchedules.reduce((sum, s) => sum + getDurationMinutes(s.startTime, s.endTime), 0);

  const handleDragStart = (e: React.MouseEvent, schedule: Schedule) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') return;
    e.preventDefault();
    setDragState({
      isDragging: true,
      scheduleId: schedule.id,
      startY: e.clientY,
      originalStartTime: schedule.startTime,
      originalEndTime: schedule.endTime,
      currentStartTime: schedule.startTime,
      currentEndTime: schedule.endTime,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, schedule: Schedule, edge: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    setResizeState({
      isResizing: true,
      scheduleId: schedule.id,
      edge,
      startY: e.clientY,
      originalStartTime: schedule.startTime,
      originalEndTime: schedule.endTime,
      currentStartTime: schedule.startTime,
      currentEndTime: schedule.endTime,
    });
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.target !== containerRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top;
    const time = getTimeFromY(y);
    setCreateState({
      isCreating: true,
      startY: e.clientY,
      startTime: time,
      endTime: time,
    });
  };

  const handleMouseMove = useCallback(async (e: MouseEvent) => {
    if (dragState.isDragging && dragState.scheduleId) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaY = e.clientY - dragState.startY;
      const deltaMinutes = roundToNearestSnap(deltaY / MINUTE_HEIGHT);
      const originalStart = new Date(dragState.originalStartTime);
      const originalEnd = new Date(dragState.originalEndTime);
      const newStart = new Date(originalStart.getTime() + deltaMinutes * 60000);
      const newEnd = new Date(originalEnd.getTime() + deltaMinutes * 60000);
      const startHour = newStart.getHours();
      const endHour = newEnd.getHours();
      if (startHour < START_HOUR || endHour > END_HOUR) return;
      const newStartTime = newStart.toISOString();
      const newEndTime = newEnd.toISOString();
      setDragState(prev => ({
        ...prev,
        currentStartTime: newStartTime,
        currentEndTime: newEndTime,
      }));
      const conflict = await checkScheduleConflict(newStartTime, newEndTime, dragState.scheduleId);
      setPreviewConflict(conflict);
    } else if (resizeState.isResizing && resizeState.scheduleId && resizeState.edge) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const deltaY = e.clientY - resizeState.startY;
      const deltaMinutes = roundToNearestSnap(deltaY / MINUTE_HEIGHT);
      const originalStart = new Date(resizeState.originalStartTime);
      const originalEnd = new Date(resizeState.originalEndTime);
      let newStartTime = resizeState.originalStartTime;
      let newEndTime = resizeState.originalEndTime;
      if (resizeState.edge === 'top') {
        const newStart = new Date(originalStart.getTime() + deltaMinutes * 60000);
        const startHour = newStart.getHours();
        if (startHour < START_HOUR) return;
        const duration = getDurationMinutes(newStart.toISOString(), resizeState.originalEndTime);
        if (duration < 15) return;
        newStartTime = newStart.toISOString();
      } else {
        const newEnd = new Date(originalEnd.getTime() + deltaMinutes * 60000);
        const endHour = newEnd.getHours();
        if (endHour > END_HOUR) return;
        const duration = getDurationMinutes(resizeState.originalStartTime, newEnd.toISOString());
        if (duration < 15) return;
        newEndTime = newEnd.toISOString();
      }
      setResizeState(prev => ({
        ...prev,
        currentStartTime: newStartTime,
        currentEndTime: newEndTime,
      }));
      const conflict = await checkScheduleConflict(newStartTime, newEndTime, resizeState.scheduleId);
      setPreviewConflict(conflict);
    } else if (createState.isCreating && createState.startTime) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const startY = createState.startY - rect.top;
      const currentY = e.clientY - rect.top;
      const minY = Math.min(startY, currentY);
      const maxY = Math.max(startY, currentY);
      const startTime = getTimeFromY(minY);
      const endTime = getTimeFromY(maxY);
      const duration = getDurationMinutes(startTime, endTime);
      if (duration < 15) return;
      setCreateState(prev => ({
        ...prev,
        startTime,
        endTime,
      }));
    }
  }, [dragState, resizeState, createState, checkScheduleConflict, getTimeFromY]);

  const handleMouseUp = useCallback(async () => {
    if (dragState.isDragging && dragState.scheduleId && dragState.currentStartTime && dragState.currentEndTime) {
      const success = await updateScheduleTime(
        dragState.scheduleId,
        dragState.currentStartTime,
        dragState.currentEndTime
      );
      if (!success && previewConflict?.hasConflict) {
        const schedule = schedules.find(s => s.id === dragState.scheduleId);
        if (schedule) {
          setShowRescheduleFor(schedule);
        }
      }
    } else if (resizeState.isResizing && resizeState.scheduleId && resizeState.currentStartTime && resizeState.currentEndTime) {
      const success = await updateScheduleTime(
        resizeState.scheduleId,
        resizeState.currentStartTime,
        resizeState.currentEndTime
      );
      if (!success && previewConflict?.hasConflict) {
        const schedule = schedules.find(s => s.id === resizeState.scheduleId);
        if (schedule) {
          setShowRescheduleFor(schedule);
        }
      }
    } else if (createState.isCreating && createState.startTime && createState.endTime) {
      const duration = getDurationMinutes(createState.startTime, createState.endTime);
      if (duration >= 15) {
        setShowCreateModal({
          startTime: createState.startTime,
          endTime: createState.endTime,
        });
        setNewScheduleTitle('');
      }
    }
    setDragState({
      isDragging: false,
      scheduleId: null,
      startY: 0,
      originalStartTime: '',
      originalEndTime: '',
      currentStartTime: null,
      currentEndTime: null,
    });
    setResizeState({
      isResizing: false,
      scheduleId: null,
      edge: null,
      startY: 0,
      originalStartTime: '',
      originalEndTime: '',
      currentStartTime: null,
      currentEndTime: null,
    });
    setCreateState({
      isCreating: false,
      startY: 0,
      startTime: null,
      endTime: null,
    });
    setPreviewConflict(null);
  }, [dragState, resizeState, createState, previewConflict, updateScheduleTime, schedules]);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
    clearConflicts();
  }, [selectedDate, clearConflicts]);

  const handleCreateSchedule = async () => {
    if (!showCreateModal || !newScheduleTitle.trim()) return;
    try {
      const res = await scheduleApi.create({
        title: newScheduleTitle,
        description: '',
        priority: 'medium',
        category: '工作',
        start_time: showCreateModal.startTime,
        end_time: showCreateModal.endTime,
      });
      const s = res.data;
      addSchedule({
        id: s.id, title: s.title, description: s.description, priority: s.priority,
        category: s.category, completed: s.completed,
        startTime: s.start_time, endTime: s.end_time,
        recurring: s.recurring,
      });
      setShowCreateModal(null);
      setNewScheduleTitle('');
    } catch (e) {
      console.error('Failed to create schedule:', e);
      alert('创建日程失败，请稍后重试');
    }
  };

  const formatTimeDisplay = (iso: string) => {
    return iso.split('T')[1]?.substring(0, 5) || '';
  };

  const getPreviewPosition = () => {
    if (dragState.isDragging && dragState.currentStartTime && dragState.currentEndTime) {
      return {
        top: getYFromTime(dragState.currentStartTime),
        height: getYFromTime(dragState.currentEndTime) - getYFromTime(dragState.currentStartTime),
      };
    }
    if (resizeState.isResizing && resizeState.currentStartTime && resizeState.currentEndTime) {
      return {
        top: getYFromTime(resizeState.currentStartTime),
        height: getYFromTime(resizeState.currentEndTime) - getYFromTime(resizeState.currentStartTime),
      };
    }
    if (createState.isCreating && createState.startTime && createState.endTime) {
      return {
        top: getYFromTime(createState.startTime),
        height: getYFromTime(createState.endTime) - getYFromTime(createState.startTime),
      };
    }
    return null;
  };

  const previewPos = getPreviewPosition();
  const activeScheduleId = dragState.scheduleId || resizeState.scheduleId;

  const renderTimeLabels = () => {
    const labels = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      labels.push(
        <div key={hour} style={{
        position: 'absolute',
        left: 0,
        top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`,
        width: '40px',
        textAlign: 'right',
        paddingRight: '8px',
        fontSize: '12px',
        color: '#999',
        transform: 'translateY(-50%)',
      }}>
        {String(hour).padStart(2, '0')}:00
      </div>
      );
      for (let min = 30; min < 60 && hour < END_HOUR; min += 30) {
        labels.push(
          <div key={`${hour}-${min}`} style={{
          position: 'absolute',
          left: 0,
          top: `${(hour - START_HOUR) * HOUR_HEIGHT + min * MINUTE_HEIGHT}px`,
          width: '40px',
          textAlign: 'right',
          paddingRight: '8px',
          fontSize: '10px',
          color: '#ccc',
          transform: 'translateY(-50%)',
        }}>
          {String(hour).padStart(2, '0')}:{String(min).padStart(2, '0')}
        </div>
        );
      }
    }
    return labels;
  };

  const renderGridLines = () => {
    const lines = [];
    for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
      lines.push(
        <div key={hour} style={{
        position: 'absolute',
        left: '50px',
        right: 0,
        top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`,
        height: '1px',
        background: '#e0e0e0',
      }}
      />
      );
      for (let min = 30; min < 60 && hour < END_HOUR; min += 30) {
        lines.push(
          <div key={`${hour}-${min}`} style={{
          position: 'absolute',
          left: '50px',
          right: 0,
          top: `${(hour - START_HOUR) * HOUR_HEIGHT + min * MINUTE_HEIGHT}px`,
          height: '1px',
          background: '#f0f0f0',
          borderTop: '1px dashed #f0f0f0',
        }}
        />
        );
      }
    }
    return lines;
  };

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>📅 拖拽排程 - {selectedDate}</h2>
        <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
          <span style={{ color: '#666' }}>
            🟢 空闲: <strong style={{ color: '#4caf50' }}>{Math.floor(totalFreeMinutes / 60)}小时{totalFreeMinutes % 60}分</strong>
          </span>
          <span style={{ color: '#666' }}>
            🔵 已安排: <strong style={{ color: '#1976d2' }}>{Math.floor(totalBusyMinutes / 60)}小时{totalBusyMinutes % 60}分</strong>
          </span>
        </div>
      </div>

      {freeSlots.length > 0 && (
        <div style={{
          marginBottom: '12px',
          padding: '10px 12px',
          background: '#f1f8e9',
          borderRadius: '8px',
          fontSize: '12px',
        }}>
          <span style={{ fontWeight: 500, color: '#33691e' }}>💡 空闲时段：</span>
          {freeSlots.map((slot, idx) => (
            <span key={idx} style={{ marginLeft: '8px', color: '#558b2f' }}>
              {formatTimeDisplay(slot.start)} - {formatTimeDisplay(slot.end)} ({Math.floor(slot.duration / 60)}时{slot.duration % 60}分)
              {idx < freeSlots.length - 1 && ' | '}
            </span>
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        onMouseDown={handleContainerMouseDown}
        style={{
          position: 'relative',
          flex: 1,
          background: '#fff',
          borderRadius: '8px',
          border: '1px solid #e0e0e0',
          overflow: 'auto',
          minHeight: '500px',
          cursor: createState.isCreating ? 'crosshair' : 'default',
        }}
      >
        <div style={{
          position: 'relative',
          height: `${(END_HOUR - START_HOUR) * HOUR_HEIGHT}px`,
          minWidth: '600px',
        }}>
          {renderTimeLabels()}
          {renderGridLines()}

          {daySchedules.map(s => {
            const isActive = s.id === activeScheduleId;
            const conflict = conflicts.get(s.id);
            const top = isActive && previewPos ? previewPos.top : getYFromTime(s.startTime);
            const height = isActive && previewPos ? previewPos.height : getYFromTime(s.endTime) - getYFromTime(s.startTime);

            return (
              <ScheduleBlock
                key={s.id}
                schedule={s}
                top={top}
                height={height}
                isDragging={dragState.isDragging && dragState.scheduleId === s.id}
                isResizing={resizeState.isResizing && resizeState.scheduleId === s.id}
                conflict={conflict}
                onDragStart={handleDragStart}
                onResizeStart={handleResizeStart}
              />
            );
          })}

          {previewPos && (dragState.isDragging || resizeState.isResizing || createState.isCreating) && (
            <div style={{
              position: 'absolute',
              left: '50px',
              right: '8px',
              top: `${previewPos.top}px`,
              height: `${previewPos.height}px`,
              background: previewConflict?.hasConflict
                ? 'rgba(244, 67, 54, 0.2)'
                : 'rgba(76, 175, 80, 0.2)',
              border: `2px dashed ${previewConflict?.hasConflict ? '#f44336' : '#4caf50'}`,
              borderRadius: '4px',
              pointerEvents: 'none',
              zIndex: 50,
            }}>
              {createState.isCreating && createState.startTime && createState.endTime && (
                <div style={{
                  position: 'absolute',
                  bottom: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '12px',
                  color: '#666',
                  whiteSpace: 'nowrap',
                }}>
                  {formatTimeDisplay(createState.startTime)} - {formatTimeDisplay(createState.endTime)}
                  ({getDurationMinutes(createState.startTime, createState.endTime)}分钟
                </div>
              )}
              {(dragState.isDragging || resizeState.isResizing) && (
                <div style={{
                  position: 'absolute',
                  bottom: '-25px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '12px',
                  color: previewConflict?.hasConflict ? '#f44336' : '#4caf50',
                  whiteSpace: 'nowrap',
                }}>
                  {previewConflict?.hasConflict ? '⚠️ 冲突' : '✓ 可放置'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: '12px',
        padding: '10px 12px',
        background: '#fafafa',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#666',
        display: 'flex',
        gap: '20px',
        justifyContent: 'center',
      }}>
        <span>🖱️ 拖动日程块可移动时间</span>
        <span>↕️ 拖动上下边缘可调整时长</span>
        <span>➕ 在空白区域拖拽可新建日程</span>
        <span>⚡ 15分钟吸附对齐</span>
      </div>

      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowCreateModal(null)}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            width: '400px',
            maxWidth: '90vw',
            padding: '24px',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>➕ 新建日程</h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                时间：{formatTimeDisplay(showCreateModal.startTime)} - {formatTimeDisplay(showCreateModal.endTime)}
                ({getDurationMinutes(showCreateModal.startTime, showCreateModal.endTime)}分钟
              </div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                日程标题
              </label>
              <input
                autoFocus
                value={newScheduleTitle}
                onChange={e => setNewScheduleTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateSchedule()}
                placeholder="请输入日程标题"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowCreateModal(null)}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >取消</button>
              <button
                onClick={handleCreateSchedule}
                disabled={!newScheduleTitle.trim()}
                style={{
                  flex: 1,
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1a237e',
                  color: '#fff',
                  cursor: newScheduleTitle.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  opacity: newScheduleTitle.trim() ? 1 : 0.6,
                }}
              >确认创建</button>
            </div>
          </div>
        </div>
      )}

      {showRescheduleFor && (
        <RescheduleAssistant
          mode={{
            type: 'existing',
            schedule: showRescheduleFor,
            title: showRescheduleFor.title,
            durationMinutes: getDurationMinutes(showRescheduleFor.startTime, showRescheduleFor.endTime),
            priority: showRescheduleFor.priority,
            category: showRescheduleFor.category,
            preferredStartTime: showRescheduleFor.startTime,
          }}
          conflictInfo={conflicts.get(showRescheduleFor.id)}
          onClose={() => {
            setShowRescheduleFor(null);
            clearConflicts();
          }}
          onConfirmed={() => {
            setShowRescheduleFor(null);
            clearConflicts();
          }}
        />
      )}
    </div>
  );
};