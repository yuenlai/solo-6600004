import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';
import { format } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

interface Props {
  onOpenPlanner: () => void;
}

export const MonthlyGoalProgress: React.FC<Props> = ({ onOpenPlanner }) => {
  const {
    monthlyGoals,
    monthProgress,
    dailyActions,
    loadMonthlyGoals,
    loadMonthProgress,
    loadDailyActions,
    updateDailyAction,
    selectedDate,
    loading
  } = useScheduleStore();

  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  useEffect(() => {
    loadMonthlyGoals(selectedMonth);
    loadMonthProgress(selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    loadDailyActions(selectedDate);
  }, [selectedDate]);

  const handleToggleDailyAction = async (actionId: string, completed: boolean) => {
    try {
      await updateDailyAction(actionId, { completed: !completed });
      await loadDailyActions(selectedDate);
      await loadMonthProgress(selectedMonth);
      await loadMonthlyGoals(selectedMonth);
    } catch (e) {
      console.error('Failed to toggle daily action:', e);
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      '工作': '#1a237e',
      '学习': '#7b1fa2',
      '生活': '#00695c',
      '健康': '#c62828',
      '其他': '#558b2f'
    };
    return colors[category] || '#666';
  };

  const progressData = monthProgress || [];
  const avgProgress = progressData.length > 0
    ? Math.round(progressData.reduce((sum, p) => sum + p.overallProgress, 0) / progressData.length)
    : 0;

  const categoryStats = monthlyGoals.reduce((acc, goal) => {
    acc[goal.category] = (acc[goal.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryStats).map(([name, value]) => ({ name, value }));
  const pieColors = Object.keys(categoryStats).map(c => getCategoryColor(c));

  const barData = progressData.map(p => ({
    name: p.goalTitle.length > 8 ? p.goalTitle.slice(0, 8) + '...' : p.goalTitle,
    周进度: Math.round(p.totalWeeklyActions > 0 ? (p.completedWeeklyActions / p.totalWeeklyActions) * 100 : 0),
    日进度: Math.round(p.totalDailyActions > 0 ? (p.completedDailyActions / p.totalDailyActions) * 100 : 0),
    综合进度: p.overallProgress
  }));

  const todayActions = dailyActions.filter(a => a.date === selectedDate);

  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>🎯 月度目标进展</h3>
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '13px' }}
          />
        </div>
        <button
          onClick={onOpenPlanner}
          style={{
            padding: '8px 16px', borderRadius: '20px', border: '1px solid #1a237e',
            background: '#fff', color: '#1a237e', cursor: 'pointer', fontSize: '13px'
          }}
        >
          📝 管理目标
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>加载中...</div>
      ) : monthlyGoals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
          <p style={{ margin: '0 0 8px' }}>本月还没有设定目标</p>
          <button
            onClick={onOpenPlanner}
            style={{
              padding: '10px 24px', borderRadius: '6px', border: 'none',
              background: '#1a237e', color: '#fff', cursor: 'pointer', fontSize: '14px'
            }}
          >
            设定月度目标
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
            <div style={{
              padding: '16px', background: 'linear-gradient(135deg, #1a237e, #3949ab)',
              borderRadius: '8px', color: '#fff'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>目标总数</div>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>{monthlyGoals.length}</div>
            </div>
            <div style={{
              padding: '16px', background: 'linear-gradient(135deg, #ff9800, #f57c00)',
              borderRadius: '8px', color: '#fff'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>平均进度</div>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>{avgProgress}%</div>
            </div>
            <div style={{
              padding: '16px', background: 'linear-gradient(135deg, #4caf50, #388e3c)',
              borderRadius: '8px', color: '#fff'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>已完成目标</div>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>
                {monthlyGoals.filter(g => g.progress >= 100).length}
              </div>
            </div>
            <div style={{
              padding: '16px', background: 'linear-gradient(135deg, #7b1fa2, #9c27b0)',
              borderRadius: '8px', color: '#fff'
            }}>
              <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>今日待办</div>
              <div style={{ fontSize: '28px', fontWeight: 600 }}>{todayActions.length}</div>
            </div>
          </div>

          {todayActions.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#333' }}>📋 今日执行项</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {todayActions.map(action => (
                  <div key={action.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', background: '#fafafa', borderRadius: '8px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <input
                      type="checkbox"
                      checked={action.completed}
                      onChange={() => handleToggleDailyAction(action.id, action.completed)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '14px',
                        textDecoration: action.completed ? 'line-through' : 'none',
                        color: action.completed ? '#999' : '#333'
                      }}>
                        {action.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                        <span style={{
                          padding: '2px 6px', borderRadius: '3px',
                          background: getCategoryColor(action.goalCategory) + '20',
                          color: getCategoryColor(action.goalCategory),
                          marginRight: '6px'
                        }}>
                          {action.goalTitle}
                        </span>
                        ← {action.weeklyTitle}
                      </div>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '12px',
                      background: '#f0f0f0', color: '#666'
                    }}>
                      {action.goalCategory}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div style={{ padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#333' }}>目标分类分布</h4>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={{ stroke: '#999', strokeWidth: 1 }}
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '13px' }}>
                  暂无数据
                </div>
              )}
            </div>

            <div style={{ padding: '16px', background: '#fafafa', borderRadius: '8px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#333' }}>各目标进度对比</h4>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="综合进度" fill="#1a237e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '13px' }}>
                  暂无数据
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 12px', fontSize: '15px', color: '#333' }}>📊 各目标详细进度</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {monthlyGoals.map(goal => {
                const progress = monthProgress?.find(p => p.goalId === goal.id);
                const isExpanded = expandedGoal === goal.id;

                return (
                  <div key={goal.id} style={{
                    border: '1px solid #e0e0e0', borderRadius: '8px',
                    overflow: 'hidden', background: '#fff'
                  }}>
                    <div
                      onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                      style={{
                        padding: '14px 16px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '12px'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{isExpanded ? '▼' : '▶'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontWeight: 500, fontSize: '14px' }}>{goal.title}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                            background: getPriorityColor(goal.priority) + '20',
                            color: getPriorityColor(goal.priority)
                          }}>
                            {goal.priority === 'high' ? '高' : goal.priority === 'medium' ? '中' : '低'}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
                            background: getCategoryColor(goal.category) + '20',
                            color: getCategoryColor(goal.category)
                          }}>
                            {goal.category}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', width: `${goal.progress}%`,
                              background: goal.progress >= 100 ? '#4caf50' : '#1a237e',
                              transition: 'width 0.3s'
                            }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 500, minWidth: '45px' }}>
                            {goal.progress}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && progress && (
                      <div style={{
                        padding: '12px 16px', background: '#fafafa',
                        borderTop: '1px solid #e0e0e0'
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '12px' }}>
                          <div style={{ padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>周执行项</div>
                            <div style={{ fontSize: '16px', fontWeight: 500 }}>
                              {progress.completedWeeklyActions} / {progress.totalWeeklyActions}
                              <span style={{ marginLeft: '8px', color: '#4caf50', fontSize: '13px' }}>
                                {progress.totalWeeklyActions > 0 ? Math.round((progress.completedWeeklyActions / progress.totalWeeklyActions) * 100) : 0}%
                              </span>
                            </div>
                          </div>
                          <div style={{ padding: '10px', background: '#fff', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '2px' }}>日执行项</div>
                            <div style={{ fontSize: '16px', fontWeight: 500 }}>
                              {progress.completedDailyActions} / {progress.totalDailyActions}
                              <span style={{ marginLeft: '8px', color: '#4caf50', fontSize: '13px' }}>
                                {progress.totalDailyActions > 0 ? Math.round((progress.completedDailyActions / progress.totalDailyActions) * 100) : 0}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>各周进度</div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {progress.weeklyBreakdown.map(wb => (
                              <div key={wb.weekNumber} style={{ flex: 1, textAlign: 'center' }}>
                                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                                  第{wb.weekNumber}周
                                </div>
                                <div style={{
                                  height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden',
                                  marginBottom: '4px'
                                }}>
                                  <div style={{
                                    height: '100%', width: `${wb.progress}%`,
                                    background: wb.progress >= 100 ? '#4caf50' : '#1a237e'
                                  }} />
                                </div>
                                <div style={{ fontSize: '11px' }}>
                                  {wb.completed}/{wb.total}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
