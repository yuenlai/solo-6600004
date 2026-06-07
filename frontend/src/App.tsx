import React, { useState } from 'react';
import { ScheduleList } from './components/ScheduleList';
import { HabitTracker } from './components/HabitTracker';
import { PomodoroTimer } from './components/PomodoroTimer';
import { WeeklyChart } from './components/WeeklyChart';
import { NaturalLanguageInput } from './components/NaturalLanguageInput';
import { useScheduleStore } from './store/schedule';
import { Schedule } from './types';

const App: React.FC = () => {
  const [tab, setTab] = useState<'schedule' | 'habits' | 'focus' | 'report'>('schedule');
  const [showSmartInput, setShowSmartInput] = useState(false);
  const { addSchedule, selectedDate, setSelectedDate } = useScheduleStore();

  const handleQuickAdd = () => {
    const title = prompt('日程标题:');
    if (title) {
      addSchedule({
        id: Date.now().toString(), title, description: '', priority: 'medium',
        category: '工作', completed: false,
        startTime: `${selectedDate}T09:00:00`, endTime: `${selectedDate}T10:00:00`
      } as Schedule);
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
    </div>
  );
};
export default App;
