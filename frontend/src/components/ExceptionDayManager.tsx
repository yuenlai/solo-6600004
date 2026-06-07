import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';
import { ExceptionDay, ExceptionDayType, ExceptionDayRule } from '../types';
import { ExceptionDayEditor } from './ExceptionDayEditor';

interface ExceptionDayManagerProps {
  onClose: () => void;
}

const typeConfig: Record<ExceptionDayType, { label: string; icon: string; color: string; bgColor: string }> = {
  holiday: { label: '节假日', icon: '🎉', color: '#e53935', bgColor: '#ffebee' },
  business_trip: { label: '出差日', icon: '✈️', color: '#1976d2', bgColor: '#e3f2fd' },
  rest_day: { label: '休息日', icon: '🌴', color: '#43a047', bgColor: '#e8f5e9' },
  custom: { label: '自定义', icon: '📅', color: '#6a1b9a', bgColor: '#f3e5f5' },
};

export const ExceptionDayManager: React.FC<ExceptionDayManagerProps> = ({ onClose }) => {
  const { exceptionDays, loadExceptionDays, deleteExceptionDay, applyExceptionDay, habits } = useScheduleStore();
  const [showEditor, setShowEditor] = useState(false);
  const [editingDay, setEditingDay] = useState<ExceptionDay | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<any>(null);

  useEffect(() => {
    loadExceptionDays();
  }, []);

  const handleEdit = (day: ExceptionDay) => {
    setEditingDay(day);
    setShowEditor(true);
  };

  const handleAdd = () => {
    setEditingDay(null);
    setShowEditor(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除这个例外日吗？')) {
      await deleteExceptionDay(id);
    }
  };

  const handleApply = async (id: string) => {
    if (!confirm('应用规则将修改当天的日程安排，确定继续吗？')) return;
    setApplyingId(id);
    const result = await applyExceptionDay(id);
    setApplyResult(result);
    setApplyingId(null);
    if (result) {
      setTimeout(() => setApplyResult(null), 5000);
    }
  };

  const handleEditorClose = () => {
    setShowEditor(false);
    setEditingDay(null);
    loadExceptionDays();
  };

  const filteredDays = filterType === 'all' 
    ? exceptionDays 
    : exceptionDays.filter(d => d.type === filterType);

  const sortedDays = [...filteredDays].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '900px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1a237e' }}>
            📅 例外日管理
          </h2>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', fontSize: '24px',
            cursor: 'pointer', color: '#666'
          }}>×</button>
        </div>

        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #e0e0e0',
          display: 'flex', gap: '12px', alignItems: 'center'
        }}>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            style={{
              padding: '8px 12px', border: '1px solid #ddd',
              borderRadius: '6px', background: '#fff'
            }}
          >
            <option value="all">全部类型</option>
            <option value="holiday">🎉 节假日</option>
            <option value="business_trip">✈️ 出差日</option>
            <option value="rest_day">🌴 休息日</option>
            <option value="custom">📅 自定义</option>
          </select>

          <div style={{ flex: 1 }} />

          <button onClick={handleAdd} style={{
            padding: '10px 20px', borderRadius: '8px', border: 'none',
            background: '#1a237e', color: '#fff', cursor: 'pointer',
            fontSize: '14px', fontWeight: 500
          }}>+ 添加例外日</button>
        </div>

        {applyResult && (
          <div style={{
            padding: '12px 24px', background: '#e8f5e9',
            borderBottom: '1px solid #c8e6c9', color: '#2e7d32'
          }}>
            ✅ 规则已应用！
            {applyResult.schedules?.rescheduled?.length > 0 && (
              <span> {applyResult.schedules.rescheduled.length} 个日程已改期到下一个工作日</span>
            )}
            {applyResult.schedules?.skipped?.length > 0 && (
              <span>，{applyResult.schedules.skipped.length} 个日程已跳过</span>
            )}
            {applyResult.habits?.skipped?.length > 0 && (
              <span>，{applyResult.habits.skipped.length} 个习惯已跳过</span>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
          {sortedDays.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '60px 20px', color: '#999'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📅</div>
              <p>暂无例外日设置</p>
              <p style={{ fontSize: '14px' }}>点击"添加例外日"来创建节假日、出差日或休息日规则</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sortedDays.map(day => {
                const config = typeConfig[day.type as ExceptionDayType];
                return (
                  <div key={day.id} style={{
                    padding: '16px', borderRadius: '10px',
                    background: config.bgColor, border: `1px solid ${config.color}20`,
                    display: 'flex', alignItems: 'center', gap: '16px'
                  }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '10px',
                      background: '#fff', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                      <div style={{ fontSize: '20px' }}>{config.icon}</div>
                      <div style={{
                        fontSize: '12px', fontWeight: 600, color: config.color
                      }}>{config.label}</div>
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '16px', fontWeight: 600, color: '#333',
                        marginBottom: '4px'
                      }}>{day.name}</div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        📆 {day.date}
                      </div>
                      {day.description && (
                        <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                          {day.description}
                        </div>
                      )}
                      <div style={{
                        display: 'flex', gap: '12px', marginTop: '8px',
                        fontSize: '12px', color: '#666', flexWrap: 'wrap'
                      }}>
                        {day.rule?.skipHabits && (
                          <span style={{
                            padding: '2px 8px', background: '#fff',
                            borderRadius: '10px', border: '1px solid #e0e0e0'
                          }}>
                            跳过习惯 {day.rule.habitIdsToSkip?.length > 0 ? `(${day.rule.habitIdsToSkip.length}个)` : '(全部)'}
                          </span>
                        )}
                        {day.rule?.skipSchedules && (
                          <span style={{
                            padding: '2px 8px', background: '#fff',
                            borderRadius: '10px', border: '1px solid #e0e0e0'
                          }}>
                            跳过日程 {day.rule.scheduleCategoriesToSkip?.length > 0 ? `(${day.rule.scheduleCategoriesToSkip.join(', ')})` : '(全部)'}
                          </span>
                        )}
                        {day.rule?.rescheduleToNextWorkingDay && (
                          <span style={{
                            padding: '2px 8px', background: '#fff',
                            borderRadius: '10px', border: '1px solid #e0e0e0'
                          }}>自动改期到下一个工作日</span>
                        )}
                        {day.rule?.adjustWorkHours && (
                          <span style={{
                            padding: '2px 8px', background: '#fff',
                            borderRadius: '10px', border: '1px solid #e0e0e0'
                          }}>工作时间: {day.rule.workStartTime || '09:00'} - {day.rule.workEndTime || '18:00'}</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => handleApply(day.id)}
                        disabled={applyingId === day.id}
                        style={{
                          padding: '8px 16px', borderRadius: '6px',
                          border: '1px solid #4caf50', background: '#fff',
                          color: '#4caf50', cursor: 'pointer', fontSize: '13px'
                        }}
                      >{applyingId === day.id ? '应用中...' : '应用规则'}</button>
                      <button
                        onClick={() => handleEdit(day)}
                        style={{
                          padding: '8px 16px', borderRadius: '6px',
                          border: '1px solid #1976d2', background: '#fff',
                          color: '#1976d2', cursor: 'pointer', fontSize: '13px'
                        }}
                      >编辑</button>
                      <button
                        onClick={() => handleDelete(day.id)}
                        style={{
                          padding: '8px 16px', borderRadius: '6px',
                          border: '1px solid #e53935', background: '#fff',
                          color: '#e53935', cursor: 'pointer', fontSize: '13px'
                        }}
                      >删除</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: '#fafafa'
        }}>
          <div style={{ fontSize: '13px', color: '#666' }}>
            共 {exceptionDays.length} 个例外日
          </div>
          <button onClick={onClose} style={{
            padding: '10px 24px', borderRadius: '8px', border: '1px solid #ddd',
            background: '#fff', cursor: 'pointer', fontSize: '14px'
          }}>关闭</button>
        </div>
      </div>

      {showEditor && (
        <ExceptionDayEditor
          onClose={handleEditorClose}
          editingDay={editingDay}
        />
      )}
    </div>
  );
};
