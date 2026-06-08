import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScheduleStore } from '../store/schedule';
import { FocusHistory } from './FocusHistory';

const STORAGE_KEY = 'pomodoro_local_backup';

interface LocalBackup {
  sessionId: string;
  duration: number;
  startTime: string;
  accumulatedSeconds: number;
  isPaused: boolean;
  lastTick: number;
}

export const PomodoroTimer: React.FC = () => {
  const { focusSession, startFocus, pauseFocus, resumeFocus, completeFocus, interruptFocus, loadActiveFocusSession } = useScheduleStore();
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subTab, setSubTab] = useState<'timer' | 'history'>('timer');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const accumulatedRef = useRef(0);

  const saveLocalBackup = useCallback((accumulated: number, paused: boolean) => {
    if (!focusSession) return;
    const backup: LocalBackup = {
      sessionId: focusSession.id,
      duration: focusSession.duration,
      startTime: focusSession.startTime,
      accumulatedSeconds: accumulated,
      isPaused: paused,
      lastTick: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
  }, [focusSession]);

  const clearLocalBackup = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const calculateTimeLeft = useCallback((session: { duration: number; accumulatedSeconds: number }) => {
    const totalSeconds = session.duration * 60;
    return Math.max(0, totalSeconds - session.accumulatedSeconds);
  }, []);

  const startTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current);
          completeFocus();
          clearLocalBackup();
          return 0;
        }
        accumulatedRef.current += 1;
        saveLocalBackup(accumulatedRef.current, false);
        return t - 1;
      });
    }, 1000);
  }, [completeFocus, saveLocalBackup, clearLocalBackup]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      try {
        const activeSession = await loadActiveFocusSession();
        const backupStr = localStorage.getItem(STORAGE_KEY);

        if (activeSession) {
          let finalAccumulated = activeSession.accumulatedSeconds;
          let useBackup = false;

          if (backupStr) {
            try {
              const backup: LocalBackup = JSON.parse(backupStr);
              if (backup.sessionId === activeSession.id) {
                useBackup = true;
                if (!activeSession.isPaused) {
                  const elapsedMs = Date.now() - backup.lastTick;
                  const elapsedSecs = Math.floor(elapsedMs / 1000);
                  if (elapsedSecs > 0 && elapsedSecs < 3600) {
                    finalAccumulated = Math.min(
                      activeSession.duration * 60,
                      backup.accumulatedSeconds + elapsedSecs
                    );
                  }
                }
              } else {
                clearLocalBackup();
              }
            } catch (e) {
              console.warn('Failed to parse local backup:', e);
              clearLocalBackup();
            }
          }

          if (!useBackup && activeSession.isPaused) {
            finalAccumulated = activeSession.accumulatedSeconds;
          }

          accumulatedRef.current = finalAccumulated;
          const remaining = calculateTimeLeft({
            duration: activeSession.duration,
            accumulatedSeconds: finalAccumulated
          });
          setTimeLeft(remaining);
          setIsPaused(activeSession.isPaused);

          if (remaining <= 0) {
            await completeFocus();
            clearLocalBackup();
          } else if (!activeSession.isPaused) {
            startTimer();
          }
        } else {
          if (backupStr) {
            clearLocalBackup();
          }
          setTimeLeft(25 * 60);
          setIsPaused(false);
          accumulatedRef.current = 0;
        }
      } catch (e) {
        console.error('Failed to init session:', e);
        clearLocalBackup();
        setTimeLeft(25 * 60);
        setIsPaused(false);
        accumulatedRef.current = 0;
      } finally {
        setIsLoading(false);
      }
    };
    initSession();

    return () => {
      stopTimer();
    };
  }, [loadActiveFocusSession, calculateTimeLeft, completeFocus, clearLocalBackup, startTimer, stopTimer]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;

  const handleStart = async (duration: number) => {
    setIsLoading(true);
    try {
      accumulatedRef.current = 0;
      setTimeLeft(duration * 60);
      setIsPaused(false);
      await startFocus(duration);
      saveLocalBackup(0, false);
      startTimer();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    stopTimer();
    setIsPaused(true);
    saveLocalBackup(accumulatedRef.current, true);
    await pauseFocus(accumulatedRef.current);
  };

  const handleResume = async () => {
    setIsPaused(false);
    saveLocalBackup(accumulatedRef.current, false);
    await resumeFocus();
    startTimer();
  };

  const handleStop = async () => {
    stopTimer();
    clearLocalBackup();
    await interruptFocus();
    setTimeLeft(25 * 60);
    setIsPaused(false);
    accumulatedRef.current = 0;
  };

  if (isLoading) {
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
        <div style={{ textAlign: 'center', padding: '48px', color: '#999' }}>
          加载中...
        </div>
      </div>
    );
  }

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
            color: focusSession ? (isPaused ? '#ff9800' : '#e53935') : '#333',
            marginBottom: '16px',
            transition: 'color 0.3s'
          }}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>

          {focusSession ? (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              {isPaused ? (
                <button
                  onClick={handleResume}
                  style={{
                    padding: '10px 24px', borderRadius: '24px', border: 'none',
                    background: '#4caf50', color: '#fff', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 500
                  }}
                >
                  ▶️ 继续专注
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  style={{
                    padding: '10px 24px', borderRadius: '24px', border: 'none',
                    background: '#ff9800', color: '#fff', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 500
                  }}
                >
                  ⏸️ 暂停
                </button>
              )}
              <button
                onClick={handleStop}
                style={{
                  padding: '10px 24px', borderRadius: '24px', border: 'none',
                  background: '#e53935', color: '#fff', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 500
                }}
              >
                ⏹️ 停止（标记为中断）
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {[15, 25, 45].map(d => (
                <button
                  key={d}
                  onClick={() => handleStart(d)}
                  style={{
                    padding: '10px 20px', borderRadius: '24px', border: '1px solid #e0e0e0',
                    background: '#fff', cursor: 'pointer', fontSize: '14px'
                  }}
                >
                  {d}分钟
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
            {focusSession ? (
              isPaused ? (
                <span style={{ color: '#ff9800' }}>⏸️ 已暂停，点击「继续专注」恢复计时</span>
              ) : (
                <span>🔥 专注进行中... 时间结束将自动标记为完成</span>
              )
            ) : (
              <span>选择时长开始专注，手动停止将标记为中断</span>
            )}
          </div>

          {focusSession && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: '#f5f5f5',
              borderRadius: '8px',
              maxWidth: '400px',
              margin: '20px auto 0',
              textAlign: 'left'
            }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                <strong>本次专注详情</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#888' }}>计划时长</span>
                <span>{focusSession.duration} 分钟</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                <span style={{ color: '#888' }}>已专注</span>
                <span>{Math.floor(accumulatedRef.current / 60)} 分 {accumulatedRef.current % 60} 秒</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#888' }}>状态</span>
                <span style={{ color: isPaused ? '#ff9800' : '#4caf50', fontWeight: 500 }}>
                  {isPaused ? '已暂停' : '进行中'}
                </span>
              </div>
              <div style={{
                marginTop: '12px',
                height: '6px',
                background: '#e0e0e0',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: isPaused ? '#ff9800' : '#4caf50',
                  width: `${Math.min(100, (accumulatedRef.current / (focusSession.duration * 60)) * 100)}%`,
                  transition: 'width 0.3s, background 0.3s'
                }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <FocusHistory />
      )}
    </div>
  );
};
