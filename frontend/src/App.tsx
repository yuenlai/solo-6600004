import React, { useState, useEffect } from 'react';
import { ScheduleList } from './components/ScheduleList';
import { HabitTracker } from './components/HabitTracker';
import { PomodoroTimer } from './components/PomodoroTimer';
import { WeeklyChart } from './components/WeeklyChart';
import { NaturalLanguageInput } from './components/NaturalLanguageInput';
import { WeekTemplateSelector } from './components/WeekTemplateSelector';
import { MorningPlanner } from './components/MorningPlanner';
import { EveningReview } from './components/EveningReview';
import { MonthlyGoalPlanner } from './components/MonthlyGoalPlanner';
import { MonthlyGoalProgress } from './components/MonthlyGoalProgress';
import { ExceptionDayManager } from './components/ExceptionDayManager';
import { ShareManager } from './components/ShareManager';
import { WarningCenter } from './components/WarningCenter';
import { FragmentTimeRecommendation } from './components/FragmentTimeRecommendation';
import { useScheduleStore } from './store/schedule';
import { scheduleApi } from './services/api';
import { Schedule } from './types';
import { getWeekStartDate, addDays, formatDate } from './data/weekTemplates';

const App: React.FC = () => {
  const [tab, setTab] = useState<'schedule' | 'habits' | 'focus' | 'report' | 'goals'>('schedule');
  const [showSmartInput, setShowSmartInput] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showMorningPlanner, setShowMorningPlanner] = useState(false);
  const [showEveningReview, setShowEveningReview] = useState(false);
  const [showGoalPlanner, setShowGoalPlanner] = useState(false);
  const [showExceptionDayManager, setShowExceptionDayManager] = useState(false);
  const [showShareManager, setShowShareManager] = useState(false);
  const [showWarningCenter, setShowWarningCenter] = useState(false);
  const [showFragmentRecommendation, setShowFragmentRecommendation] = useState(false);
  const { addSchedule, selectedDate, setSelectedDate, viewMode, scheduleViewMode, setScheduleViewMode, loadSchedules, loadWeekSchedules, loadMultiDaySchedules, multiDayCount, loadChallenges, loadHabits, loadDailyPlan, morningPlan, eveningReview, loadFocusSessions, loadInterruptionStatistics, loadMonthlyGoals, loadMonthProgress, checkExceptionDay, checkedExceptionDay, loadExceptionDays, incomingShares, loadIncomingShares, loadOutgoingShares, loadAcceptedShares, loadWarningCenter, warningCenterData, loadDailyActions } = useScheduleStore();

  useEffect(() => {
    const initData = async () => {
      if (viewMode === 'week') {
        await loadWeekSchedules(selectedDate);
      } else if (viewMode === 'multiDay') {
        await loadMultiDaySchedules(selectedDate, multiDayCount);
      } else {
        await loadSchedules(selectedDate);
      }
      loadHabits();
      loadChallenges();
      loadExceptionDays();
      loadIncomingShares();
      loadOutgoingShares();
      loadAcceptedShares();
      await loadDailyPlan(selectedDate);
      await checkExceptionDay(selectedDate);
      loadDailyActions(selectedDate);
      loadWarningCenter();
    };
    initData();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (tab === 'schedule') {
        if (viewMode === 'week') {
          await loadWeekSchedules(selectedDate);
        } else if (viewMode === 'multiDay') {
          await loadMultiDaySchedules(selectedDate, multiDayCount);
        } else {
          await loadSchedules(selectedDate);
        }
      }
      if (tab === 'focus') {
        await loadFocusSessions(selectedDate);
        const weekStart = formatDate(getWeekStartDate(new Date(selectedDate)));
        const weekEnd = formatDate(addDays(getWeekStartDate(new Date(selectedDate)), 6));
        await loadInterruptionStatistics(weekStart, weekEnd);
      }
      await loadDailyPlan(selectedDate);
      await checkExceptionDay(selectedDate);
    };
    loadData();
  }, [selectedDate, tab, viewMode, multiDayCount]);

  const handleQuickAdd = async () => {
    const title = prompt('日程标题:');
    if (title) {
      try {
        const res = await scheduleApi.create({
          title, description: '', priority: 'medium',
          category: '工作',
          start_time: `${selectedDate}T09:00:00`, end_time: `${selectedDate}T10:00:00`
        });
        const s = res.data;
        addSchedule({
          id: s.id, title: s.title, description: s.description, priority: s.priority,
          category: s.category, completed: s.completed,
          startTime: s.start_time, endTime: s.end_time,
          recurring: s.recurring
        } as Schedule);
      } catch (e) {
        console.error('Failed to create schedule:', e);
        alert('创建日程失败，请稍后重试');
      }
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: '200px', background: '#1a237e', color: '#fff', padding: '20px 0', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 20px', padding: '0 16px', fontSize: '16px' }}>⏰ Smart Planner</h2>
        {[
          { key: 'schedule', label: '📅 日程' }, { key: 'habits', label: '🎯 习惯' },
          { key: 'focus', label: '🍅 专注' }, { key: 'goals', label: '🎯 目标' },
          { key: 'report', label: '📊 报表' }
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '12px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
            background: tab === t.key ? 'rgba(255,255,255,0.15)' : 'transparent', color: '#fff', fontSize: '14px'
          }}>{t.label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowWarningCenter(true)}
          style={{
            margin: '0 12px 12px',
            padding: '12px 16px',
            border: 'none',
            borderRadius: '8px',
            textAlign: 'left',
            cursor: 'pointer',
            background: warningCenterData && warningCenterData.totalCount > 0 ? '#f44336' : 'rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span>🚨 预警中心</span>
          {warningCenterData && warningCenterData.totalCount > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.3)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {warningCenterData.totalCount}
            </span>
          )}
        </button>
      </nav>
      <main style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e0e0e0' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }} />
            {checkedExceptionDay && (
              <div style={{
                padding: '6px 12px', borderRadius: '16px',
                background: checkedExceptionDay.type === 'holiday' ? '#ffebee' :
                           checkedExceptionDay.type === 'business_trip' ? '#e3f2fd' :
                           checkedExceptionDay.type === 'rest_day' ? '#e8f5e9' : '#f3e5f5',
                color: checkedExceptionDay.type === 'holiday' ? '#c62828' :
                       checkedExceptionDay.type === 'business_trip' ? '#1565c0' :
                       checkedExceptionDay.type === 'rest_day' ? '#2e7d32' : '#6a1b9a',
                fontSize: '12px', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <span>{checkedExceptionDay.type === 'holiday' ? '🎉' :
                       checkedExceptionDay.type === 'business_trip' ? '✈️' :
                       checkedExceptionDay.type === 'rest_day' ? '🌴' : '📅'}</span>
                <span>{checkedExceptionDay.name}</span>
                <button
                  onClick={() => setShowExceptionDayManager(true)}
                  style={{
                    marginLeft: '4px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: '14px',
                    color: checkedExceptionDay.type === 'holiday' ? '#c62828' :
                           checkedExceptionDay.type === 'business_trip' ? '#1565c0' :
                           checkedExceptionDay.type === 'rest_day' ? '#2e7d32' : '#6a1b9a'
                  }}
                >⚙️</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowMorningPlanner(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #ff9800',
              background: morningPlan ? '#fff3e0' : '#fff', color: '#ff9800', cursor: 'pointer'
            }}>{morningPlan ? '🌅 已规划' : '🌅 晨间规划'}</button>
            <button onClick={() => setShowEveningReview(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #7b1fa2',
              background: eveningReview ? '#f3e5f5' : '#fff', color: '#7b1fa2', cursor: 'pointer'
            }}>{eveningReview ? '🌙 已复盘' : '🌙 晚间复盘'}</button>
            <button onClick={() => setShowExceptionDayManager(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #e65100',
              background: '#fff', color: '#e65100', cursor: 'pointer'
            }}>📅 例外日</button>
            <button onClick={() => setShowShareManager(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #2196f3',
              background: incomingShares.length > 0 ? '#e3f2fd' : '#fff',
              color: '#1976d2', cursor: 'pointer',
              position: 'relative'
            }}>
              🔗 共享计划
              {incomingShares.length > 0 && (
                <span style={{
                  position: 'absolute', top: '-4px', right: '-4px',
                  background: '#f44336', color: '#fff',
                  fontSize: '10px', padding: '1px 5px',
                  borderRadius: '8px', minWidth: '16px', textAlign: 'center'
                }}>
                  {incomingShares.length}
                </span>
              )}
            </button>
            <button onClick={() => setShowTemplateSelector(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #1a237e',
              background: '#fff', color: '#1a237e', cursor: 'pointer'
            }}>📋 周计划模板</button>
            <button onClick={() => setShowFragmentRecommendation(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #4caf50',
              background: '#e8f5e9', color: '#2e7d32', cursor: 'pointer'
            }}>⏰ 碎片时间</button>
            <button onClick={() => setShowSmartInput(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #1a237e',
              background: '#fff', color: '#1a237e', cursor: 'pointer'
            }}>✨ 智能录入</button>
            <button onClick={() => setShowGoalPlanner(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #7b1fa2',
              background: '#fff', color: '#7b1fa2', cursor: 'pointer'
            }}>🎯 月度目标</button>
            <button onClick={() => setScheduleViewMode(scheduleViewMode === 'list' ? 'timeline' : 'list')} style={{
              padding: '8px 16px', borderRadius: '20px',
              border: scheduleViewMode === 'timeline' ? '1px solid #4caf50' : '1px solid #1a237e',
              background: scheduleViewMode === 'timeline' ? '#e8f5e9' : '#fff',
              color: scheduleViewMode === 'timeline' ? '#2e7d32' : '#1a237e',
              cursor: 'pointer'
            }}>{scheduleViewMode === 'timeline' ? '📋 列表视图' : '🖱️ 拖拽排程'}</button>
            <button onClick={handleQuickAdd} style={{
              padding: '8px 20px', borderRadius: '20px', border: 'none',
              background: '#1a237e', color: '#fff', cursor: 'pointer'
            }}>+ 添加日程</button>
          </div>
        </div>
        {tab === 'schedule' && <ScheduleList />}
        {tab === 'habits' && <HabitTracker />}
        {tab === 'focus' && <PomodoroTimer />}
        {tab === 'goals' && (
          <div style={{ padding: '16px' }}>
            <MonthlyGoalProgress onOpenPlanner={() => setShowGoalPlanner(true)} />
          </div>
        )}
        {tab === 'report' && <WeeklyChart />}
      </main>
      {showSmartInput && <NaturalLanguageInput onClose={() => setShowSmartInput(false)} />}
      {showTemplateSelector && <WeekTemplateSelector onClose={() => setShowTemplateSelector(false)} />}
      {showMorningPlanner && <MorningPlanner onClose={() => setShowMorningPlanner(false)} />}
      {showEveningReview && <EveningReview onClose={() => setShowEveningReview(false)} />}
      {showGoalPlanner && <MonthlyGoalPlanner onClose={() => { setShowGoalPlanner(false); loadMonthlyGoals(); loadMonthProgress(selectedDate.slice(0, 7)); }} />}
      {showExceptionDayManager && <ExceptionDayManager onClose={() => { setShowExceptionDayManager(false); checkExceptionDay(selectedDate); loadSchedules(selectedDate); }} />}
      {showShareManager && <ShareManager onClose={() => { setShowShareManager(false); loadSchedules(selectedDate); }} />}
      {showWarningCenter && (
        <WarningCenter
          onClose={() => { setShowWarningCenter(false); loadWarningCenter(); }}
          onNavigateToSchedule={(_scheduleId, _date) => { setTab('schedule'); }}
          onNavigateToHabits={() => { setTab('habits'); }}
          onNavigateToGoals={() => { setTab('goals'); }}
        />
      )}
      {showFragmentRecommendation && (
        <FragmentTimeRecommendation
          onClose={() => setShowFragmentRecommendation(false)}
          onScheduleAdded={() => {
            if (viewMode === 'week') {
              loadWeekSchedules(selectedDate);
            } else if (viewMode === 'multiDay') {
              loadMultiDaySchedules(selectedDate, multiDayCount);
            } else {
              loadSchedules(selectedDate);
            }
          }}
        />
      )}
    </div>
  );
};
export default App;
