import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';
import { MonthlyGoal, WeeklyAction, DailyAction } from '../types';
import { format } from 'date-fns';

interface Props {
  onClose: () => void;
}

type ViewMode = 'list' | 'create' | 'detail';

export const MonthlyGoalPlanner: React.FC<Props> = ({ onClose }) => {
  const {
    monthlyGoals,
    currentGoalDetails,
    loadMonthlyGoals,
    loadGoalDetails,
    createMonthlyGoal,
    deleteMonthlyGoal,
    getMonthWeeks,
    createWeeklyAction,
    updateWeeklyAction,
    deleteWeeklyAction,
    createDailyAction,
    updateDailyAction,
    deleteDailyAction,
    setCurrentGoalDetails,
    loading
  } = useScheduleStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedGoal, setSelectedGoal] = useState<MonthlyGoal | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('工作');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [monthWeeks, setMonthWeeks] = useState<Array<{ week_number: number; start_date: string; end_date: string }>>([]);



  const [selectedWeekForDaily, setSelectedWeekForDaily] = useState<number | null>(null);
  const [newDailyTitle, setNewDailyTitle] = useState('');
  const [newDailyDate, setNewDailyDate] = useState('');

  useEffect(() => {
    loadMonthlyGoals(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    const fetchWeeks = async () => {
      const weeks = await getMonthWeeks(selectedMonth);
      setMonthWeeks(weeks);
    };
    fetchWeeks();
  }, [selectedMonth]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const goal = await createMonthlyGoal({
        title,
        description,
        month: selectedMonth,
        category,
        priority
      });
      setSelectedGoal(goal);
      setViewMode('detail');
      resetForm();
      await loadGoalDetails(goal.id);
    } catch (err) {
      console.error('Failed to create goal:', err);
      alert('创建月度目标失败，请稍后重试');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('工作');
    setPriority('medium');
  };

  const handleSelectGoal = async (goal: MonthlyGoal) => {
    setSelectedGoal(goal);
    await loadGoalDetails(goal.id);
    setViewMode('detail');
  };



  const handleAddWeeklyActionForWeek = async (week: { week_number: number; start_date: string; end_date: string }, title: string) => {
    if (!selectedGoal || !title.trim()) return;

    try {
      await createWeeklyAction({
        monthly_goal_id: selectedGoal.id,
        title,
        description: '',
        week_number: week.week_number,
        start_date: week.start_date,
        end_date: week.end_date
      });
      await loadGoalDetails(selectedGoal.id);
    } catch (err) {
      console.error('Failed to add weekly action:', err);
      alert('添加周执行项失败');
    }
  };

  const handleAddDailyAction = async (weeklyAction: WeeklyAction) => {
    if (!selectedGoal || !newDailyTitle.trim() || !newDailyDate) return;

    try {
      await createDailyAction({
        weekly_action_id: weeklyAction.id,
        monthly_goal_id: selectedGoal.id,
        title: newDailyTitle,
        description: '',
        date: newDailyDate
      });
      setNewDailyTitle('');
      setNewDailyDate('');
      setSelectedWeekForDaily(null);
      await loadGoalDetails(selectedGoal.id);
    } catch (err) {
      console.error('Failed to add daily action:', err);
      alert('添加日执行项失败');
    }
  };

  const handleToggleWeeklyComplete = async (action: WeeklyAction) => {
    if (!selectedGoal) return;
    try {
      await updateWeeklyAction(action.id, { completed: !action.completed });
      await loadGoalDetails(selectedGoal.id);
    } catch (err) {
      console.error('Failed to update weekly action:', err);
    }
  };

  const handleToggleDailyComplete = async (action: DailyAction) => {
    if (!selectedGoal) return;
    try {
      await updateDailyAction(action.id, { completed: !action.completed });
      await loadGoalDetails(selectedGoal.id);
    } catch (err) {
      console.error('Failed to update daily action:', err);
    }
  };

  const handleDeleteWeekly = async (actionId: string) => {
    if (!selectedGoal || !confirm('确定删除此周执行项吗？相关的日执行项也会被删除。')) return;
    try {
      await deleteWeeklyAction(actionId);
      await loadGoalDetails(selectedGoal.id);
    } catch (err) {
      console.error('Failed to delete weekly action:', err);
    }
  };

  const handleDeleteDaily = async (actionId: string) => {
    if (!selectedGoal || !confirm('确定删除此日执行项吗？')) return;
    try {
      await deleteDailyAction(actionId);
      await loadGoalDetails(selectedGoal.id);
    } catch (err) {
      console.error('Failed to delete daily action:', err);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('确定删除此月度目标吗？相关的周和日执行项也会被删除。')) return;
    try {
      await deleteMonthlyGoal(goalId);
      setViewMode('list');
      setSelectedGoal(null);
      setCurrentGoalDetails(null);
    } catch (err) {
      console.error('Failed to delete goal:', err);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return '#f44336';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#999';
    }
  };

  const getPriorityLabel = (p: string) => {
    switch (p) {
      case 'high': return '高';
      case 'medium': return '中';
      case 'low': return '低';
      default: return p;
    }
  };

  const renderList = () => (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>🎯 月度目标</h3>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}
          />
        </div>
        <button
          onClick={() => setViewMode('create')}
          style={{
            padding: '8px 20px', borderRadius: '6px', border: 'none',
            background: '#1a237e', color: '#fff', cursor: 'pointer', fontSize: '14px'
          }}
        >
          + 新建目标
        </button>
      </div>

      {loading && monthlyGoals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>加载中...</div>
      ) : monthlyGoals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
          <p>本月还没有设定目标，点击上方按钮创建第一个目标吧！</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
          {monthlyGoals.map(goal => (
            <div
              key={goal.id}
              onClick={() => handleSelectGoal(goal)}
              style={{
                padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px',
                cursor: 'pointer', transition: 'all 0.2s',
                background: '#fff'
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '16px' }}>{goal.title}</h4>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                    background: getPriorityColor(goal.priority) + '20',
                    color: getPriorityColor(goal.priority)
                  }}>
                    {getPriorityLabel(goal.priority)}优先级
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                    background: '#f0f0f0', color: '#666'
                  }}>
                    {goal.category}
                  </span>
                </div>
              </div>
              {goal.description && (
                <p style={{ margin: '0 0 8px', color: '#666', fontSize: '14px' }}>{goal.description}</p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%', width: `${goal.progress}%`,
                      background: goal.progress >= 100 ? '#4caf50' : '#1a237e',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, minWidth: '50px', textAlign: 'right' }}>
                  {goal.progress}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCreateForm = () => (
    <div style={{ width: '100%' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>📝 新建月度目标</h3>
      <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
            目标名称 *
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="如：完成产品需求文档"
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #ddd',
              borderRadius: '6px', fontSize: '14px'
            }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
            目标月份
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', border: '1px solid #ddd',
              borderRadius: '6px', fontSize: '14px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
              分类
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px'
              }}
            >
              <option value="工作">工作</option>
              <option value="学习">学习</option>
              <option value="生活">生活</option>
              <option value="健康">健康</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
              优先级
            </label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: '6px', fontSize: '14px'
              }}
            >
              <option value="low">低优先级</option>
              <option value="medium">中优先级</option>
              <option value="high">高优先级</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500 }}>
            目标描述（可选）
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="详细描述你的月度目标..."
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
            onClick={() => { setViewMode('list'); resetForm(); }}
            style={{
              padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd',
              background: '#fff', cursor: 'pointer', fontSize: '14px'
            }}
          >
            返回
          </button>
          <button
            type="submit"
            style={{
              padding: '10px 24px', borderRadius: '6px', border: 'none',
              background: '#1a237e', color: '#fff', cursor: 'pointer', fontSize: '14px',
              fontWeight: 500
            }}
          >
            创建目标
          </button>
        </div>
      </form>
    </div>
  );

  const renderDetail = () => {
    if (!selectedGoal || !currentGoalDetails) return null;

    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <button
              onClick={() => { setViewMode('list'); setSelectedGoal(null); setCurrentGoalDetails(null); }}
              style={{
                padding: '4px 12px', borderRadius: '4px', border: '1px solid #ddd',
                background: '#fff', cursor: 'pointer', fontSize: '13px', marginBottom: '8px'
              }}
            >
              ← 返回列表
            </button>
            <h3 style={{ margin: 0, fontSize: '20px' }}>{selectedGoal.title}</h3>
            {selectedGoal.description && (
              <p style={{ margin: '8px 0', color: '#666' }}>{selectedGoal.description}</p>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <span style={{
                padding: '4px 10px', borderRadius: '4px', fontSize: '12px',
                background: getPriorityColor(selectedGoal.priority) + '20',
                color: getPriorityColor(selectedGoal.priority)
              }}>
                {getPriorityLabel(selectedGoal.priority)}优先级
              </span>
              <span style={{
                padding: '4px 10px', borderRadius: '4px', fontSize: '12px',
                background: '#f0f0f0', color: '#666'
              }}>
                {selectedGoal.category}
              </span>
              <span style={{
                padding: '4px 10px', borderRadius: '4px', fontSize: '12px',
                background: '#e3f2fd', color: '#1976d2'
              }}>
                进度: {currentGoalDetails.progress}%
              </span>
            </div>
          </div>
          <button
            onClick={() => handleDeleteGoal(selectedGoal.id)}
            style={{
              padding: '6px 12px', borderRadius: '4px', border: '1px solid #f44336',
              background: '#fff', color: '#f44336', cursor: 'pointer', fontSize: '13px'
            }}
          >
            删除目标
          </button>
        </div>

        <div style={{
          padding: '16px', background: '#f5f5f5', borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontWeight: 500, fontSize: '14px' }}>总体进度</span>
            <span style={{ fontSize: '14px' }}>{currentGoalDetails.progress}%</span>
          </div>
          <div style={{
            height: '12px', background: '#e0e0e0', borderRadius: '6px', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', width: `${currentGoalDetails.progress}%`,
              background: currentGoalDetails.progress >= 100 ? '#4caf50' : '#1a237e',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }}>
          <h4 style={{ margin: '16px 0 12px', fontSize: '16px' }}>📅 周执行项</h4>
          
          {monthWeeks.map((week) => {
            const weekActions = currentGoalDetails.weeklyActions.filter(
              wa => wa.weekNumber === week.week_number
            );
            const weekStart = new Date(week.start_date);
            const weekEnd = new Date(week.end_date);

            return (
              <div key={week.week_number} style={{
                marginBottom: '16px', border: '1px solid #e0e0e0',
                borderRadius: '8px', padding: '12px', background: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: '14px' }}>
                      第 {week.week_number} 周
                    </span>
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#888' }}>
                      {format(weekStart, 'MM/dd')} - {format(weekEnd, 'MM/dd')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="添加周执行项..."
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const target = e.target as HTMLInputElement;
                          if (target.value.trim()) {
                            await handleAddWeeklyActionForWeek(week, target.value);
                            target.value = '';
                          }
                        }
                      }}
                      style={{
                        padding: '6px 10px', border: '1px solid #ddd',
                        borderRadius: '4px', fontSize: '13px', width: '180px'
                      }}
                    />
                  </div>
                </div>

                {weekActions.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                    本周暂无执行项，在右侧输入框添加
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {weekActions.map(wa => {
                      const completedDaily = wa.dailyActions.filter(d => d.completed).length;
                      const totalDaily = wa.dailyActions.length;
                      const dailyProgress = totalDaily > 0 ? Math.round((completedDaily / totalDaily) * 100) : (wa.completed ? 100 : 0);

                      return (
                        <div key={wa.id} style={{
                          padding: '12px', background: '#fff', borderRadius: '6px',
                          border: '1px solid #e0e0e0'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <input
                              type="checkbox"
                              checked={wa.completed}
                              onChange={() => handleToggleWeeklyComplete(wa)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                            />
                            <span style={{
                              flex: 1,
                              textDecoration: wa.completed ? 'line-through' : 'none',
                              color: wa.completed ? '#999' : '#333',
                              fontSize: '14px'
                            }}>
                              {wa.title}
                            </span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              {dailyProgress}%
                            </span>
                            <button
                              onClick={() => setSelectedWeekForDaily(selectedWeekForDaily === wa.weekNumber ? null : wa.weekNumber)}
                              style={{
                                padding: '4px 10px', borderRadius: '4px', border: '1px solid #1a237e',
                                background: '#fff', color: '#1a237e', cursor: 'pointer', fontSize: '12px'
                              }}
                            >
                              + 日执行项
                            </button>
                            <button
                              onClick={() => handleDeleteWeekly(wa.id)}
                              style={{
                                padding: '4px 10px', borderRadius: '4px', border: 'none',
                                background: '#ffebee', color: '#f44336', cursor: 'pointer', fontSize: '12px'
                              }}
                            >
                              删除
                            </button>
                          </div>

                          {totalDaily > 0 && (
                            <div style={{ height: '4px', background: '#e0e0e0', borderRadius: '2px', overflow: 'hidden', marginBottom: '8px' }}>
                              <div style={{
                                height: '100%', width: `${dailyProgress}%`,
                                background: dailyProgress >= 100 ? '#4caf50' : '#1a237e'
                              }} />
                            </div>
                          )}

                          {selectedWeekForDaily === wa.weekNumber && (
                            <div style={{
                              marginTop: '8px', padding: '12px', background: '#f5f5f5',
                              borderRadius: '4px', display: 'flex', gap: '8px', alignItems: 'center'
                            }}>
                              <input
                                type="text"
                                value={newDailyTitle}
                                onChange={e => setNewDailyTitle(e.target.value)}
                                placeholder="日执行项内容"
                                style={{
                                  flex: 1, padding: '6px 10px', border: '1px solid #ddd',
                                  borderRadius: '4px', fontSize: '13px'
                                }}
                              />
                              <input
                                type="date"
                                value={newDailyDate}
                                onChange={e => setNewDailyDate(e.target.value)}
                                min={week.start_date}
                                max={week.end_date}
                                style={{
                                  padding: '6px 10px', border: '1px solid #ddd',
                                  borderRadius: '4px', fontSize: '13px'
                                }}
                              />
                              <button
                                onClick={() => handleAddDailyAction(wa)}
                                style={{
                                  padding: '6px 14px', borderRadius: '4px', border: 'none',
                                  background: '#1a237e', color: '#fff', cursor: 'pointer', fontSize: '13px'
                                }}
                              >
                                添加
                              </button>
                            </div>
                          )}

                          {wa.dailyActions.length > 0 && (
                            <div style={{ marginLeft: '28px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {wa.dailyActions.map(da => (
                                <div key={da.id} style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  padding: '6px 8px', background: '#fafafa', borderRadius: '4px'
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={da.completed}
                                    onChange={() => handleToggleDailyComplete(da)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                  />
                                  <span style={{
                                    flex: 1, fontSize: '13px',
                                    textDecoration: da.completed ? 'line-through' : 'none',
                                    color: da.completed ? '#999' : '#555'
                                  }}>
                                    {da.title}
                                  </span>
                                  <span style={{ fontSize: '12px', color: '#888' }}>{da.date}</span>
                                  <button
                                    onClick={() => handleDeleteDaily(da.id)}
                                    style={{
                                      padding: '2px 8px', borderRadius: '3px', border: 'none',
                                      background: 'transparent', color: '#f44336', cursor: 'pointer', fontSize: '12px'
                                    }}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '24px',
        width: '90%', maxWidth: '800px', maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        {viewMode === 'list' && renderList()}
        {viewMode === 'create' && renderCreateForm()}
        {viewMode === 'detail' && renderDetail()}
      </div>
    </div>
  );
};
