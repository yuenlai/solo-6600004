import React, { useState } from 'react';
import { weekTemplates, WeekTemplate, getWeekStartDate, addDays, formatDate, TemplateEvent } from '../data/weekTemplates';
import { useScheduleStore } from '../store/schedule';
import { scheduleApi } from '../services/api';
import { Schedule } from '../types';

interface WeekTemplateSelectorProps {
  onClose: () => void;
}

const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export const WeekTemplateSelector: React.FC<WeekTemplateSelectorProps> = ({ onClose }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WeekTemplate | null>(null);
  const [weekStartDate, setWeekStartDate] = useState<string>(formatDate(getWeekStartDate(new Date())));
  const [applying, setApplying] = useState(false);
  const [previewDay, setPreviewDay] = useState<number>(0);
  const { addSchedules, loadSchedules, selectedDate } = useScheduleStore();

  const getWeekDates = () => {
    const start = new Date(weekStartDate);
    return dayNames.map((_, i) => formatDate(addDays(start, i)));
  };

  const weekDates = getWeekDates();

  const getEventsForDay = (dayOfWeek: number): TemplateEvent[] => {
    if (!selectedTemplate) return [];
    return selectedTemplate.events.filter(e => e.dayOfWeek === dayOfWeek);
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || applying) return;
    setApplying(true);

    try {
      const weekStart = new Date(weekStartDate);
      const schedulesData = selectedTemplate.events.map(event => {
        const eventDate = addDays(weekStart, event.dayOfWeek);
        const dateStr = formatDate(eventDate);
        return {
          title: event.title,
          description: event.description,
          start_time: `${dateStr}T${event.startTime}:00`,
          end_time: `${dateStr}T${event.endTime}:00`,
          priority: event.priority,
          category: event.category,
        };
      });

      const res = await scheduleApi.batchCreate(schedulesData);
      const createdSchedules: Schedule[] = res.data.schedules.map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        startTime: s.start_time,
        endTime: s.end_time,
        priority: s.priority,
        category: s.category,
        completed: s.completed,
        recurring: s.recurring,
      }));

      addSchedules(createdSchedules);
      await loadSchedules(selectedDate);
      alert(`成功套用「${selectedTemplate.name}」模板！共添加 ${createdSchedules.length} 个日程。`);
      onClose();
    } catch (e) {
      console.error('Failed to apply template:', e);
      alert('套用模板失败，请稍后重试');
    } finally {
      setApplying(false);
    }
  };

  const handleWeekStartChange = (direction: number) => {
    const current = new Date(weekStartDate);
    const newDate = addDays(current, direction * 7);
    setWeekStartDate(formatDate(newDate));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '900px',
        maxHeight: '85vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e0e0e0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>📋 选择周计划模板</h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#999',
            }}
          >×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {weekTemplates.map(template => (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              style={{
                flex: 1,
                minWidth: '200px',
                padding: '16px',
                borderRadius: '10px',
                border: selectedTemplate?.id === template.id
                  ? `2px solid ${template.color}`
                  : '2px solid transparent',
                background: selectedTemplate?.id === template.id
                  ? `${template.color}10`
                  : '#f5f5f5',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{template.icon}</div>
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{template.name}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>{template.description}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
                共 {template.events.length} 个日程
              </div>
            </div>
          ))}
        </div>

        {selectedTemplate && (
          <>
            <div style={{
              padding: '0 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => handleWeekStartChange(-1)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >← 上一周</button>
                <span style={{ fontWeight: 600 }}>
                  {weekDates[0]} ~ {weekDates[6]}
                </span>
                <button
                  onClick={() => handleWeekStartChange(1)}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >下一周 →</button>
              </div>
              <button
                onClick={handleApplyTemplate}
                disabled={applying}
                style={{
                  padding: '10px 24px',
                  borderRadius: '20px',
                  border: 'none',
                  background: selectedTemplate.color,
                  color: '#fff',
                  cursor: applying ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  opacity: applying ? 0.6 : 1,
                }}
              >
                {applying ? '套用中...' : `✓ 套用「${selectedTemplate.name}」`}
              </button>
            </div>

            <div style={{
              padding: '0 24px',
              display: 'flex',
              gap: '4px',
              marginBottom: '12px',
            }}>
              {dayNames.map((name, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewDay(i)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    border: 'none',
                    borderRadius: '6px',
                    background: previewDay === i
                      ? selectedTemplate.color
                      : '#f0f0f0',
                    color: previewDay === i ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>
                    {weekDates[i].substring(5)}
                  </div>
                </button>
              ))}
            </div>

            <div style={{
              padding: '0 24px 20px',
              flex: 1,
              overflowY: 'auto',
            }}>
              <div style={{
                background: '#fafafa',
                borderRadius: '8px',
                padding: '12px',
              }}>
                {getEventsForDay(previewDay).length === 0 ? (
                  <p style={{ color: '#999', textAlign: 'center', padding: '20px 0' }}>
                    当日无安排
                  </p>
                ) : (
                  getEventsForDay(previewDay).map((event, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        marginBottom: '6px',
                        borderRadius: '6px',
                        background: '#fff',
                        borderLeft: `3px solid ${selectedTemplate.color}`,
                      }}
                    >
                      <div style={{
                        fontSize: '12px',
                        color: '#666',
                        minWidth: '100px',
                        fontFamily: 'monospace',
                      }}>
                        {event.startTime} - {event.endTime}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{event.title}</div>
                        {event.description && (
                          <div style={{ fontSize: '11px', color: '#999' }}>{event.description}</div>
                        )}
                      </div>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: event.priority === 'high'
                          ? '#ffcdd2'
                          : event.priority === 'medium'
                          ? '#fff9c4'
                          : '#c8e6c9',
                      }}>
                        {event.priority === 'high' ? '高优' : event.priority === 'medium' ? '中' : '低'}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        background: '#e3f2fd',
                        color: '#1565c0',
                      }}>
                        {event.category}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {!selectedTemplate && (
          <div style={{
            padding: '40px 24px',
            textAlign: 'center',
            color: '#999',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👆</div>
            <p>请从上方选择一个周计划模板</p>
          </div>
        )}
      </div>
    </div>
  );
};
