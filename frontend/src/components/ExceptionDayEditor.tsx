import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';
import { ExceptionDay, ExceptionDayType, ExceptionDayRule } from '../types';

interface ExceptionDayEditorProps {
  onClose: () => void;
  editingDay: ExceptionDay | null;
}

const typeOptions: { value: ExceptionDayType; label: string; icon: string }[] = [
  { value: 'holiday', label: '节假日', icon: '🎉' },
  { value: 'business_trip', label: '出差日', icon: '✈️' },
  { value: 'rest_day', label: '休息日', icon: '🌴' },
  { value: 'custom', label: '自定义', icon: '📅' },
];

const categoryOptions = ['工作', '学习', '生活', '娱乐', '家庭', '健康', '其他'];

const defaultRule: ExceptionDayRule = {
  skipHabits: false,
  habitIdsToSkip: [],
  skipSchedules: false,
  scheduleCategoriesToSkip: [],
  rescheduleToNextWorkingDay: false,
  adjustWorkHours: false,
  workStartTime: '09:00',
  workEndTime: '18:00',
  note: '',
};

export const ExceptionDayEditor: React.FC<ExceptionDayEditorProps> = ({ onClose, editingDay }) => {
  const { habits, createExceptionDay, updateExceptionDay } = useScheduleStore();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    date: editingDay?.date || new Date().toISOString().split('T')[0],
    type: (editingDay?.type as ExceptionDayType) || 'holiday',
    name: editingDay?.name || '',
    description: editingDay?.description || '',
    rule: editingDay?.rule || defaultRule,
  });

  useEffect(() => {
    if (editingDay) {
      setFormData({
        date: editingDay.date,
        type: editingDay.type as ExceptionDayType,
        name: editingDay.name,
        description: editingDay.description || '',
        rule: editingDay.rule || defaultRule,
      });
    }
  }, [editingDay]);

  const handleRuleChange = (key: keyof ExceptionDayRule, value: any) => {
    setFormData(prev => ({
      ...prev,
      rule: {
        ...prev.rule,
        [key]: value,
      },
    }));
  };

  const handleHabitToggle = (habitId: string) => {
    const current = formData.rule.habitIdsToSkip;
    const next = current.includes(habitId)
      ? current.filter(id => id !== habitId)
      : [...current, habitId];
    handleRuleChange('habitIdsToSkip', next);
  };

  const handleCategoryToggle = (category: string) => {
    const current = formData.rule.scheduleCategoriesToSkip;
    const next = current.includes(category)
      ? current.filter(c => c !== category)
      : [...current, category];
    handleRuleChange('scheduleCategoriesToSkip', next);
  };

  const handleSave = async () => {
    if (!formData.date || !formData.name.trim()) {
      alert('请填写日期和名称');
      return;
    }

    setSaving(true);
    try {
      if (editingDay) {
        await updateExceptionDay(editingDay.id, formData);
      } else {
        await createExceptionDay(formData);
      }
      onClose();
    } catch (e: any) {
      console.error('Failed to save exception day:', e);
      if (e.response?.data?.detail?.includes('already exists')) {
        alert('该日期已存在例外日设置');
      } else {
        alert('保存失败，请稍后重试');
      }
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: 'holiday' | 'business_trip' | 'rest_day') => {
    const presets: Record<string, Partial<ExceptionDayRule>> = {
      holiday: {
        skipHabits: true,
        habitIdsToSkip: [],
        skipSchedules: true,
        scheduleCategoriesToSkip: ['工作', '学习'],
        rescheduleToNextWorkingDay: true,
        adjustWorkHours: false,
      },
      business_trip: {
        skipHabits: false,
        habitIdsToSkip: [],
        skipSchedules: true,
        scheduleCategoriesToSkip: ['工作'],
        rescheduleToNextWorkingDay: true,
        adjustWorkHours: true,
        workStartTime: '09:00',
        workEndTime: '18:00',
      },
      rest_day: {
        skipHabits: false,
        habitIdsToSkip: [],
        skipSchedules: true,
        scheduleCategoriesToSkip: ['工作'],
        rescheduleToNextWorkingDay: false,
        adjustWorkHours: false,
      },
    };

    const presetRule = presets[preset];
    setFormData(prev => ({
      ...prev,
      type: preset,
      rule: {
        ...prev.rule,
        ...presetRule,
      },
    }));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '650px',
        maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1a237e' }}>
            {editingDay ? '📝 编辑例外日' : '➕ 添加例外日'}
          </h2>
          <button onClick={onClose} style={{
            border: 'none', background: 'none', fontSize: '24px',
            cursor: 'pointer', color: '#666'
          }}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: '#333', marginBottom: '8px'
            }}>快速预设</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { key: 'holiday', label: '🎉 节假日', desc: '跳过工作学习日程，自动改期' },
                { key: 'business_trip', label: '✈️ 出差日', desc: '跳过工作日程，调整工作时间' },
                { key: 'rest_day', label: '🌴 休息日', desc: '跳过工作日程，不自动改期' },
              ].map(p => (
                <button
                  key={p.key}
                  onClick={() => applyPreset(p.key as any)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '8px',
                    border: '1px solid #e0e0e0', background: formData.type === p.key ? '#e8eaf6' : '#fff',
                    cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>{p.label}</div>
                  <div style={{ fontSize: '11px', color: '#888' }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 600,
                color: '#333', marginBottom: '8px'
              }}>日期 *</label>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                  borderRadius: '6px', fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block', fontSize: '13px', fontWeight: 600,
                color: '#333', marginBottom: '8px'
              }}>类型</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as ExceptionDayType }))}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                  borderRadius: '6px', fontSize: '14px', background: '#fff'
                }}
              >
                {typeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: '#333', marginBottom: '8px'
            }}>名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例如：春节假期、上海出差、周末休息"
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: '#333', marginBottom: '8px'
            }}>描述</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="可选：添加详细说明"
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px', resize: 'vertical'
              }}
            />
          </div>

          <div style={{
            padding: '16px', background: '#f5f5f5', borderRadius: '10px',
            marginBottom: '16px'
          }}>
            <h3 style={{
              margin: '0 0 12px', fontSize: '15px', color: '#1a237e',
              fontWeight: 600
            }}>⚙️ 规则设置</h3>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '14px', color: '#333', cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.rule.skipSchedules}
                  onChange={e => handleRuleChange('skipSchedules', e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>跳过日程</span>
              </label>
              {formData.rule.skipSchedules && (
                <div style={{
                  marginTop: '10px', padding: '12px', background: '#fff',
                  borderRadius: '6px', border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    选择要跳过的日程分类（不选则跳过全部）：
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {categoryOptions.map(cat => (
                      <label key={cat} style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', background: formData.rule.scheduleCategoriesToSkip.includes(cat) ? '#e8eaf6' : '#f5f5f5',
                        borderRadius: '16px', fontSize: '12px', cursor: 'pointer',
                        border: formData.rule.scheduleCategoriesToSkip.includes(cat) ? '1px solid #3f51b5' : '1px solid transparent'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.rule.scheduleCategoriesToSkip.includes(cat)}
                          onChange={() => handleCategoryToggle(cat)}
                        />
                        {cat}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '14px', color: '#333', cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.rule.rescheduleToNextWorkingDay}
                  onChange={e => handleRuleChange('rescheduleToNextWorkingDay', e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>未跳过的日程自动改期到下一个工作日</span>
              </label>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '14px', color: '#333', cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.rule.skipHabits}
                  onChange={e => handleRuleChange('skipHabits', e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>跳过习惯打卡</span>
              </label>
              {formData.rule.skipHabits && habits.length > 0 && (
                <div style={{
                  marginTop: '10px', padding: '12px', background: '#fff',
                  borderRadius: '6px', border: '1px solid #e0e0e0'
                }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    选择要跳过的习惯（不选则跳过全部）：
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {habits.map(habit => (
                      <label key={habit.id} style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '4px 10px', background: formData.rule.habitIdsToSkip.includes(habit.id) ? '#e8f5e9' : '#f5f5f5',
                        borderRadius: '16px', fontSize: '12px', cursor: 'pointer',
                        border: formData.rule.habitIdsToSkip.includes(habit.id) ? `1px solid ${habit.color}` : '1px solid transparent'
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.rule.habitIdsToSkip.includes(habit.id)}
                          onChange={() => handleHabitToggle(habit.id)}
                        />
                        {habit.icon} {habit.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '14px', color: '#333', cursor: 'pointer'
              }}>
                <input
                  type="checkbox"
                  checked={formData.rule.adjustWorkHours}
                  onChange={e => handleRuleChange('adjustWorkHours', e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>调整工作时间</span>
              </label>
              {formData.rule.adjustWorkHours && (
                <div style={{
                  marginTop: '10px', padding: '12px', background: '#fff',
                  borderRadius: '6px', border: '1px solid #e0e0e0',
                  display: 'flex', gap: '16px', alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>开始时间</label>
                    <input
                      type="time"
                      value={formData.rule.workStartTime || '09:00'}
                      onChange={e => handleRuleChange('workStartTime', e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                        borderRadius: '6px', fontSize: '14px'
                      }}
                    />
                  </div>
                  <span style={{ color: '#666' }}>-</span>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '12px', color: '#666', display: 'block', marginBottom: '4px' }}>结束时间</label>
                    <input
                      type="time"
                      value={formData.rule.workEndTime || '18:00'}
                      onChange={e => handleRuleChange('workEndTime', e.target.value)}
                      style={{
                        width: '100%', padding: '8px 10px', border: '1px solid #ddd',
                        borderRadius: '6px', fontSize: '14px'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: 600,
              color: '#333', marginBottom: '8px'
            }}>备注</label>
            <textarea
              value={formData.rule.note || ''}
              onChange={e => handleRuleChange('note', e.target.value)}
              placeholder="可选：添加备注信息"
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px', resize: 'vertical'
              }}
            />
          </div>
        </div>

        <div style={{
          padding: '16px 24px', borderTop: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'flex-end', gap: '12px',
          background: '#fafafa'
        }}>
          <button onClick={onClose} style={{
            padding: '10px 24px', borderRadius: '8px', border: '1px solid #ddd',
            background: '#fff', cursor: 'pointer', fontSize: '14px'
          }}>取消</button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: '#1a237e', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 500, opacity: saving ? 0.7 : 1
            }}
          >{saving ? '保存中...' : (editingDay ? '保存修改' : '添加')}</button>
        </div>
      </div>
    </div>
  );
};
