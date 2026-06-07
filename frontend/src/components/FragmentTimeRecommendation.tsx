import React, { useEffect, useState } from 'react';
import { useScheduleStore } from '../store/schedule';
import { FragmentRecommendation, MicroTask, Schedule } from '../types';

interface FragmentTimeRecommendationProps {
  onClose: () => void;
  onScheduleAdded?: (schedule: Schedule) => void;
}

export const FragmentTimeRecommendation: React.FC<FragmentTimeRecommendationProps> = ({
  onClose,
  onScheduleAdded,
}) => {
  const {
    selectedDate,
    fragmentRecommendations,
    fragmentRecommendationsLoading,
    loadFragmentRecommendations,
    confirmFragmentTask,
    clearFragmentRecommendations,
  } = useScheduleStore();

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    loadFragmentRecommendations(selectedDate);
    return () => clearFragmentRecommendations();
  }, [selectedDate]);

  const formatTime = (iso: string) => {
    return iso.split('T')[1]?.substring(0, 5) || '';
  };

  const handleConfirm = async (
    recommendation: FragmentRecommendation,
    microTask: MicroTask
  ) => {
    setConfirmingId(microTask.id);
    try {
      const startTime = recommendation.slot.startTime;
      const taskDuration = microTask.durationMinutes * 60 * 1000;
      const endTime = new Date(new Date(startTime).getTime() + taskDuration).toISOString();

      const schedule = await confirmFragmentTask(
        microTask.id,
        startTime,
        endTime,
        recommendation.slot.date
      );

      if (schedule) {
        setSuccessMessage(`已添加「${microTask.title}」到 ${formatTime(startTime)} - ${formatTime(endTime)}`);
        loadFragmentRecommendations(selectedDate);
        onScheduleAdded?.(schedule);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (e: any) {
      console.error('Failed to confirm task:', e);
    } finally {
      setConfirmingId(null);
    }
  };

  const currentRecommendation = fragmentRecommendations[selectedSlotIndex];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '700px',
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '20px' }}>
            ⏰ 碎片时间智能推荐
          </h2>
          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: '24px',
              color: '#999',
            }}
          >
            ×
          </button>
        </div>

        {successMessage && (
          <div
            style={{
              background: '#e8f5e9',
              color: '#2e7d32',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {fragmentRecommendationsLoading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#666',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <p>正在分析你的日程，寻找碎片时间...</p>
          </div>
        ) : fragmentRecommendations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#666',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>
              太棒了！今天没有发现碎片时间
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              你的日程安排得很紧凑，继续保持！
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginBottom: '16px',
                }}
              >
                {fragmentRecommendations.map((rec, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedSlotIndex(index)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '13px',
                      background:
                        selectedSlotIndex === index
                          ? '#1a237e'
                          : '#f0f0f0',
                      color:
                        selectedSlotIndex === index ? '#fff' : '#333',
                    }}
                  >
                    {formatTime(rec.slot.startTime)} -{' '}
                    {formatTime(rec.slot.endTime)}
                    <span
                      style={{
                        marginLeft: '6px',
                        fontSize: '11px',
                        opacity: 0.8,
                      }}
                    >
                      ({rec.slot.durationMinutes}分钟)
                    </span>
                  </button>
                ))}
              </div>

              {currentRecommendation && (
                <>
                  <div
                    style={{
                      background: '#f5f5f5',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '20px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '28px',
                          marginRight: '12px',
                        }}
                      >
                        ⏱️
                      </span>
                      <div>
                        <div
                          style={{
                            fontSize: '18px',
                            fontWeight: 500,
                            color: '#333',
                          }}
                        >
                          {formatTime(currentRecommendation.slot.startTime)} -{' '}
                          {formatTime(currentRecommendation.slot.endTime)}
                        </div>
                        <div
                          style={{ fontSize: '13px', color: '#666' }}
                        >
                          共 {currentRecommendation.slot.durationMinutes} 分钟空档
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '12px',
                        fontSize: '12px',
                        color: '#666',
                      }}
                    >
                      {currentRecommendation.slot.beforeSchedule && (
                        <div
                          style={{
                            background: '#fff',
                            padding: '6px 12px',
                            borderRadius: '4px',
                          }}
                        >
                          ↑ 之前:{' '}
                          {currentRecommendation.slot.beforeSchedule.title}
                        </div>
                      )}
                      {currentRecommendation.slot.afterSchedule && (
                        <div
                          style={{
                            background: '#fff',
                            padding: '6px 12px',
                            borderRadius: '4px',
                          }}
                        >
                          ↓ 之后:{' '}
                          {currentRecommendation.slot.afterSchedule.title}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #ddd',
                        fontSize: '13px',
                        color: '#1a237e',
                      }}
                    >
                      💡 {currentRecommendation.reason}
                    </div>
                  </div>

                  <h3
                    style={{
                      fontSize: '16px',
                      margin: '0 0 12px 0',
                      color: '#333',
                    }}
                  >
                    推荐任务：
                  </h3>

                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    {currentRecommendation.suggestions.map((task) => (
                      <div
                        key={task.id}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = task.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#eee';
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '2px solid #eee',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            background: task.color + '20',
                            flexShrink: 0,
                          }}
                        >
                          {task.icon}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '4px',
                            }}
                          >
                            <span
                              style={{
                                fontWeight: 500,
                                fontSize: '15px',
                                color: '#333',
                              }}
                            >
                              {task.title}
                            </span>
                            {task.isHabit && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  background: '#e8f5e9',
                                  color: '#2e7d32',
                                }}
                              >
                                习惯
                              </span>
                            )}
                            <span
                              style={{
                                fontSize: '11px',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                background:
                                  task.priority === 'high'
                                    ? '#ffebee'
                                    : task.priority === 'medium'
                                    ? '#fff8e1'
                                    : '#e8f5e9',
                                color:
                                  task.priority === 'high'
                                    ? '#c62828'
                                    : task.priority === 'medium'
                                    ? '#f57f17'
                                    : '#2e7d32',
                              }}
                            >
                              {task.priority === 'high'
                                ? '高优先'
                                : task.priority === 'medium'
                                ? '中优先'
                                : '低优先'}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#666',
                              marginBottom: '4px',
                            }}
                          >
                            {task.description}
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              fontSize: '12px',
                              color: '#999',
                            }}
                          >
                            <span>⏱️ {task.durationMinutes} 分钟</span>
                            <span>📂 {task.category}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleConfirm(currentRecommendation, task)}
                          disabled={confirmingId === task.id}
                          style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: task.color,
                            color: '#fff',
                            cursor:
                              confirmingId === task.id
                                ? 'not-allowed'
                                : 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            opacity: confirmingId === task.id ? 0.6 : 1,
                            flexShrink: 0,
                          }}
                        >
                          {confirmingId === task.id ? '添加中...' : '+ 添加'}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '16px',
                borderTop: '1px solid #eee',
              }}
            >
              <button
                onClick={onClose}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  color: '#666',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                关闭
              </button>
              <button
                onClick={() => loadFragmentRecommendations(selectedDate)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1a237e',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                🔄 刷新推荐
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
