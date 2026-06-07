import React, { useState, useEffect, useRef } from 'react';
import { useScheduleStore } from '../store/schedule';
import { FocusHistory } from './FocusHistory';

export const PomodoroTimer: React.FC = () => {
  const { focusSession, startFocus, completeFocus, interruptFocus } = useScheduleStore();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const [subTab, setSubTab] = useState<'timer' | 'history'>('timer');

  useEffect(() => {
    if (focusSession) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            completeFocus();
            clearInterval(intervalRef.current);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [focusSession]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const handleStart = async (duration: number) => {
    setTimeLeft(duration * 60);
    await startFocus(duration);
  };

  const handleStop = async () => {
    clearInterval(intervalRef.current);
    await interruptFocus();
    setTimeLeft(25 * 60);
  };

  return (
    <div>
      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '16px 24px 0',
        borderBottom: '1px solid #e0e0e0',
        background: '#fff'
      }}>
        <button
          onClick={() => setSubTab('timer')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: subTab === 'timer' ? '2px solid #1a237e' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'timer' ? '#1a237e' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: subTab === 'timer' ? '500' : 'normal'
          }}
        >
          🍅 番茄钟
        </button>
        <button
          onClick={() => setSubTab('history')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: subTab === 'history' ? '2px solid #1a237e' : '2px solid transparent',
            background: 'transparent',
            color: subTab === 'history' ? '#1a237e' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: subTab === 'history' ? '500' : 'normal'
          }}
        >
          📊 专注记录
        </button>
      </div>

      {subTab === 'timer' ? (
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px' }}>🍅 番茄钟</h3>
          <div style={{
            fontSize: '48px', fontWeight: 'bold', fontFamily: 'monospace',
            color: focusSession ? '#e53935' : '#333', marginBottom: '16px'
          }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          {focusSession ? (
            <button
              onClick={handleStop}
              style={{
                padding: '10px 24px', borderRadius: '24px', border: 'none',
                background: '#e53935', color: '#fff', cursor: 'pointer'
              }}
            >
              停止（标记为中断）
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[15, 25, 45].map(d => (
                <button
                  key={d}
                  onClick={() => handleStart(d)}
                  style={{
                    padding: '10px 20px', borderRadius: '24px', border: '1px solid #e0e0e0',
                    background: '#fff', cursor: 'pointer'
                  }}
                >
                  {d}分钟
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
            {focusSession ? (
              <span>专注进行中... 时间结束将自动标记为完成</span>
            ) : (
              <span>选择时长开始专注，手动停止将标记为中断</span>
            )}
          </div>
        </div>
      ) : (
        <FocusHistory />
      )}
    </div>
  );
};
