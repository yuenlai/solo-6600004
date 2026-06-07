import React, { useState } from 'react';
import { Schedule } from '../types';
import { useScheduleStore } from '../store/schedule';

interface ShareScheduleDialogProps {
  schedule: Schedule;
  onClose: () => void;
  onShared?: (shareToken: string) => void;
}

export const ShareScheduleDialog: React.FC<ShareScheduleDialogProps> = ({
  schedule,
  onClose,
  onShared
}) => {
  const { shareSchedule, currentUser } = useScheduleStore();
  const [sharedWith, setSharedWith] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareResult, setShareResult] = useState<{ token: string; sharedWith: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharedWith.trim()) {
      setError('请输入对方名称');
      return;
    }
    if (sharedWith.trim() === currentUser) {
      setError('不能分享给自己');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await shareSchedule(schedule.id, sharedWith.trim(), message.trim());
      if (result) {
        setShareResult({ token: result.shareToken, sharedWith: sharedWith.trim() });
        onShared?.(result.shareToken);
      } else {
        setError('分享失败，请稍后重试');
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || '分享失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (shareResult) {
      const shareLink = `${window.location.origin}/share/${shareResult.token}`;
      navigator.clipboard.writeText(shareLink);
      alert('分享链接已复制到剪贴板');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '24px', width: '480px',
        maxWidth: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1a237e' }}>📤 分享日程</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
            color: '#999'
          }}>×</button>
        </div>

        {!shareResult ? (
          <form onSubmit={handleSubmit}>
            <div style={{
              background: '#f5f7ff', padding: '12px', borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '14px', color: '#1a237e', fontWeight: 500, marginBottom: '4px' }}>
                {schedule.title}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {new Date(schedule.startTime).toLocaleString()} - {new Date(schedule.endTime).toLocaleTimeString()}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                分享者: {currentUser}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                分享给 <span style={{ color: '#e53935' }}>*</span>
              </label>
              <input
                type="text"
                value={sharedWith}
                onChange={e => setSharedWith(e.target.value)}
                placeholder="请输入对方名称（如：张三、妈妈、同事）"
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                  borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: '#333', marginBottom: '6px' }}>
                留言（可选）
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="添加留言..."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                  borderRadius: '6px', fontSize: '14px', resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {error && (
              <div style={{
                background: '#ffebee', color: '#c62828', padding: '10px 12px',
                borderRadius: '6px', fontSize: '13px', marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} style={{
                padding: '10px 20px', borderRadius: '6px', border: '1px solid #ddd',
                background: '#fff', cursor: 'pointer', fontSize: '14px'
              }}>取消</button>
              <button type="submit" disabled={loading} style={{
                padding: '10px 24px', borderRadius: '6px', border: 'none',
                background: loading ? '#9fa8da' : '#1a237e', color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px'
              }}>
                {loading ? '分享中...' : '确认分享'}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <div style={{
              background: '#e8f5e9', padding: '16px', borderRadius: '8px',
              marginBottom: '16px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '16px', color: '#2e7d32', fontWeight: 500 }}>
                分享成功！
              </div>
              <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                已向 <strong>{shareResult.sharedWith}</strong> 发送分享邀请
              </div>
            </div>

            <div style={{
              background: '#f5f7ff', padding: '12px', borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                分享链接：
              </div>
              <div style={{
                display: 'flex', gap: '8px', alignItems: 'center'
              }}>
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/share/${shareResult.token}`}
                  style={{
                    flex: 1, padding: '8px 10px', border: '1px solid #ddd',
                    borderRadius: '4px', fontSize: '12px', background: '#fafafa'
                  }}
                />
                <button onClick={copyToken} style={{
                  padding: '8px 16px', borderRadius: '4px', border: 'none',
                  background: '#ff9800', color: '#fff', cursor: 'pointer',
                  fontSize: '13px', whiteSpace: 'nowrap'
                }}>复制链接</button>
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
              提示：将链接发送给对方，TA 打开后输入自己的名称即可接受分享
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '10px 24px', borderRadius: '6px', border: 'none',
                background: '#1a237e', color: '#fff', cursor: 'pointer', fontSize: '14px'
              }}>完成</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
