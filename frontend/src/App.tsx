import React, { useState, useEffect } from 'react';
import { ScheduleList } from './components/ScheduleList';
import { HabitTracker } from './components/HabitTracker';
import { PomodoroTimer } from './components/PomodoroTimer';
import { WeeklyChart } from './components/WeeklyChart';
import { NaturalLanguageInput } from './components/NaturalLanguageInput';
import { WeekTemplateSelector } from './components/WeekTemplateSelector';
import { MorningPlanner } from './components/MorningPlanner';
import { EveningReview } from './components/EveningReview';
import { useScheduleStore } from './store/schedule';
import { scheduleApi } from './services/api';
import { Schedule } from './types';

const App: React.FC = () => {
  const [tab, setTab] = useState<'schedule' | 'habits' | 'focus' | 'report'>('schedule');
  const [showSmartInput, setShowSmartInput] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showMorningPlanner, setShowMorningPlanner] = useState(false);
  const [showEveningReview, setShowEveningReview] = useState(false);
  const { addSchedule, selectedDate, setSelectedDate, viewMode, loadSchedules, loadWeekSchedules, loadChallenges, loadHabits, loadDailyPlan, morningPlan, eveningReview } = useScheduleStore();

  useEffect(() => {
    const initData = async () => {
      if (viewMode === 'week') {
        await loadWeekSchedules(selectedDate);
      } else {
        await loadSchedules(selectedDate);
      }
      loadHabits();
      loadChallenges();
      await loadDailyPlan(selectedDate);
    };
    initData();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (tab === 'schedule') {
        if (viewMode === 'week') {
          await loadWeekSchedules(selectedDate);
        } else {
          await loadSchedules(selectedDate);
        }
      }
      await loadDailyPlan(selectedDate);
    };
    loadData();
  }, [selectedDate, tab, viewMode]);

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
          { key: 'focus', label: '🍅 专注' }, { key: 'report', label: '📊 报表' }
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{
            padding: '12px 16px', border: 'none', textAlign: 'left', cursor: 'pointer',
            background: tab === t.key ? 'rgba(255,255,255,0.15)' : 'transparent', color: '#fff', fontSize: '14px'
          }}>{t.label}</button>
        ))}
      </nav>
      <main style={{ flex: 1, overflow: 'auto', background: '#f5f5f5' }}>
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e0e0e0' }}>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowMorningPlanner(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #ff9800',
              background: morningPlan ? '#fff3e0' : '#fff', color: '#ff9800', cursor: 'pointer'
            }}>{morningPlan ? '🌅 已规划' : '🌅 晨间规划'}</button>
            <button onClick={() => setShowEveningReview(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #7b1fa2',
              background: eveningReview ? '#f3e5f5' : '#fff', color: '#7b1fa2', cursor: 'pointer'
            }}>{eveningReview ? '🌙 已复盘' : '🌙 晚间复盘'}</button>
            <button onClick={() => setShowTemplateSelector(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #1a237e',
              background: '#fff', color: '#1a237e', cursor: 'pointer'
            }}>📋 周计划模板</button>
            <button onClick={() => setShowSmartInput(true)} style={{
              padding: '8px 16px', borderRadius: '20px', border: '1px solid #1a237e',
              background: '#fff', color: '#1a237e', cursor: 'pointer'
            }}>✨ 智能录入</button>
            <button onClick={handleQuickAdd} style={{
              padding: '8px 20px', borderRadius: '20px', border: 'none',
              background: '#1a237e', color: '#fff', cursor: 'pointer'
            }}>+ 添加日程</button>
          </div>
        </div>
        {tab === 'schedule' && <ScheduleList />}
        {tab === 'habits' && <HabitTracker />}
        {tab === 'focus' && <PomodoroTimer />}
        {tab === 'report' && <WeeklyChart />}
      </main>
      {showSmartInput && <NaturalLanguageInput onClose={() => setShowSmartInput(false)} />}
      {showTemplateSelector && <WeekTemplateSelector onClose={() => setShowTemplateSelector(false)} />}
      {showMorningPlanner && <MorningPlanner onClose={() => setShowMorningPlanner(false)} />}
      {showEveningReview && <EveningReview onClose={() => setShowEveningReview(false)} />}
    </div>
  );
};
export default App;
