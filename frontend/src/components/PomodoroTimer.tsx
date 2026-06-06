import React, { useState, useEffect, useRef } from 'react';
import { useScheduleStore } from '../store/schedule';

export const PomodoroTimer: React.FC = () => {
  const { focusSession, startFocus, endFocus } = useScheduleStore();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (focusSession) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) { endFocus(); clearInterval(intervalRef.current); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [focusSession]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <h3 style={{ margin: '0 0 16px' }}>🍅 番茄钟</h3>
      <div style={{
        fontSize: '48px', fontWeight: 'bold', fontFamily: 'monospace',
        color: focusSession ? '#e53935' : '#333', marginBottom: '16px'
      }}>
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      {focusSession ? (
        <button onClick={() => { endFocus(); clearInterval(intervalRef.current); setTimeLeft(25*60); }}
          style={{ padding: '10px 24px', borderRadius: '24px', border: 'none',
            background: '#e53935', color: '#fff', cursor: 'pointer' }}>停止</button>
      ) : (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
          {[15, 25, 45].map(d => (
            <button key={d} onClick={() => { startFocus(d); setTimeLeft(d * 60); }}
              style={{ padding: '10px 20px', borderRadius: '24px', border: '1px solid #e0e0e0',
                background: '#fff', cursor: 'pointer' }}>{d}分钟</button>
          ))}
        </div>
      )}
    </div>
  );
};
