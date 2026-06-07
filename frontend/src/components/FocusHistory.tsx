import React, { useState, useEffect } from 'react';
import { useScheduleStore } from '../store/schedule';
import { FocusSession } from '../types';

const formatTime = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (minutes: number) => {
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  if (mins > 0) {
    return `${mins}分${secs > 0 ? secs + '秒' : ''}`;
  }
  return `${secs}秒`;
};

const getActualDuration = (session: FocusSession) => {
  if (!session.endTime) return session.duration;
  const start = new Date(session.startTime).getTime();
  const end = new Date(session.endTime).getTime();
  return Math.round((end - start) / 1000 / 60 * 10) / 10;
};

const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date);
  return new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
};

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const FocusHistory: React.FC = () => {
  const { 
    selectedDate, 
    setSelectedDate, 
    focusSessions, 
    loadFocusSessions, 
    interruptionStatistics, 
    loadInterruptionStatistics 
  } = useScheduleStore();

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  useEffect(() => {
    loadFocusSessions(selectedDate);
    const weekStart = formatDate(getWeekStart(new Date(selectedDate)));
    const weekEnd = formatDate(getWeekEnd(new Date(selectedDate)));
    loadInterruptionStatistics(weekStart, weekEnd);
  }, [selectedDate]);

  const completedSessions = focusSessions.filter(s => s.completed);
  const interruptedSessions = focusSessions.filter(s => s.interrupted);
  const totalFocusMinutes = completedSessions.reduce((sum, s) => sum + getActualDuration(s), 0);

  const getMostInterruptedHours = () => {
    if (!interruptionStatistics) return [];
    const entries = Object.entries(interruptionStatistics.hourlyDistribution)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return entries;
  };

  const maxInterruptions = Math.max(
    ...(interruptionStatistics ? Object.values(interruptionStatistics.hourlyDistribution) : [0]),
    1
  );

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>📊 专注记录回放</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#e0e0e0', borderRadius: '20px', padding: '2px' }}>
            <button
              onClick={() => setViewMode('day')}
              style={{
                padding: '6px 16px',
                borderRadius: '18px',
                border: 'none',
                background: viewMode === 'day' ? '#1a237e' : 'transparent',
                color: viewMode === 'day' ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              按天查看
            </button>
            <button
              onClick={() => setViewMode('week')}
              style={{
                padding: '6px 16px',
                borderRadius: '18px',
                border: 'none',
                background: viewMode === 'week' ? '#1a237e' : 'transparent',
                color: viewMode === 'week' ? '#fff' : '#333',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              按周分析
            </button>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: '6px' }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>今日专注次数</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a237e' }}>{completedSessions.length + interruptedSessions.length}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>完成专注</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4caf50' }}>{completedSessions.length}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>被中断</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f44336' }}>{interruptedSessions.length}</div>
        </div>
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>总专注时长</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff9800' }}>{formatDuration(totalFocusMinutes)}</div>
        </div>
      </div>

      {viewMode === 'day' ? (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📋 今日专注记录</h3>
          {focusSessions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍅</div>
              <div>今天还没有专注记录</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>开始一个番茄钟，开始你的专注之旅吧！</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {focusSessions.map((session, index) => (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: '10px',
                    background: session.interrupted ? '#ffebee' : session.completed ? '#e8f5e9' : '#f5f5f5',
                    borderLeft: `4px solid ${session.interrupted ? '#f44336' : session.completed ? '#4caf50' : '#9e9e9e'}`
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: session.interrupted ? '#f44336' : session.completed ? '#4caf50' : '#9e9e9e',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    marginRight: '16px'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>
                        {session.interrupted ? '⏸️ 被中断' : session.completed ? '✅ 已完成' : '⏳ 进行中'}
                      </span>
                      <span style={{ fontSize: '14px', color: '#666' }}>
                        计划 {session.duration} 分钟
                      </span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#666' }}>
                      {formatTime(session.startTime)} - {session.endTime ? formatTime(session.endTime) : '进行中'}
                      {session.endTime && (
                        <span style={{ marginLeft: '12px' }}>
                          实际时长: <strong>{formatDuration(getActualDuration(session))}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: session.interrupted ? '#f44336' : session.completed ? '#4caf50' : '#9e9e9e',
                    color: '#fff'
                  }}>
                    {session.interrupted ? '中断' : session.completed ? '完成' : '进行中'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>📈 中断时间段分析</h3>
          {interruptionStatistics && interruptionStatistics.totalInterruptions > 0 ? (
            <>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                  本周共被中断 <strong style={{ color: '#f44336' }}>{interruptionStatistics.totalInterruptions}</strong> 次
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                  最容易被中断的时间段：
                  {getMostInterruptedHours().map((item, idx) => (
                    <span key={item.hour} style={{
                      marginLeft: '8px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      background: idx === 0 ? '#ffebee' : idx === 1 ? '#fff3e0' : '#e3f2fd',
                      color: idx === 0 ? '#f44336' : idx === 1 ? '#ff9800' : '#1976d2',
                      fontWeight: '500',
                      fontSize: '13px'
                    }}>
                      {idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : '🥉 '}
                      {item.hour}:00 - {item.hour + 1}:00 ({item.count}次)
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px' }}>每小时中断次数分布</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', padding: '0 8px' }}>
                  {Array.from({ length: 24 }, (_, i) => {
                    const count = interruptionStatistics.hourlyDistribution[i] || 0;
                    const height = count > 0 ? Math.max((count / maxInterruptions) * 100, 10) : 2;
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <div style={{ fontSize: '10px', color: count > 0 ? '#f44336' : '#999', fontWeight: '500' }}>
                          {count > 0 ? count : ''}
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: `${height}%`,
                            background: count > 0 
                              ? (count === maxInterruptions ? '#f44336' : count >= maxInterruptions * 0.6 ? '#ff9800' : '#ffcdd2')
                              : '#e0e0e0',
                            borderRadius: '3px 3px 0 0',
                            minHeight: '4px'
                          }}
                        />
                        <div style={{ fontSize: '10px', color: '#999' }}>{i}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {getMostInterruptedHours().length > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#fff3e0', borderRadius: '8px', borderLeft: '4px solid #ff9800' }}>
                  <div style={{ fontWeight: '500', marginBottom: '8px' }}>💡 建议</div>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    你在 <strong>{getMostInterruptedHours()[0].hour}:00 - {getMostInterruptedHours()[0].hour + 1}:00</strong> 最容易被中断。
                    建议在这个时间段：
                    <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                      <li>关闭不必要的通知</li>
                      <li>告知同事你正在专注</li>
                      <li>安排需要较少注意力的任务</li>
                    </ul>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
              <div>本周没有被中断的记录！</div>
              <div style={{ fontSize: '14px', marginTop: '8px' }}>继续保持你的专注习惯！</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
