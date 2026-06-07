import React, { useState, useEffect } from 'react';
import { ScheduleShare } from '../types';
import { useScheduleStore } from '../store/schedule';

interface ShareManagerProps {
  onClose: () => void;
}

type TabType = 'incoming' | 'outgoing' | 'accepted';

export const ShareManager: React.FC<ShareManagerProps> = ({ onClose }) => {
  const {
    currentUser,
    setCurrentUser,
    outgoingShares,
    incomingShares,
    acceptedShares,
    loadOutgoingShares,
    loadIncomingShares,
    loadAcceptedShares,
    acceptShare,
    rejectShare,
    cancelShare,
    syncSharedSchedules,
    loadSchedules
  } = useScheduleStore();

  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [editingUser, setEditingUser] = useState(false);
  const [newUserName, setNewUserName] = useState(currentUser);
  const [syncing, setSyncing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadOutgoingShares();
    loadIncomingShares();
    loadAcceptedShares();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const updated = await syncSharedSchedules();
      if (updated > 0) {
        alert(`已同步 ${updated} 条共享日程更新`);
      } else {
        alert('所有共享日程已是最新');
      }
      await loadSchedules();
    } finally {
      setSyncing(false);
    }
  };

  const handleAccept = async (token: string) => {
    setActionLoading(token);
    try {
      const success = await acceptShare(token);
      if (success) {
        alert('已接受分享，日程已同步到您的计划中');
      } else {
        alert('接受失败，请稍后重试');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (token: string) => {
    setActionLoading(token);
    try {
      const success = await rejectShare(token);
      if (success) {
        alert('已拒绝分享');
      } else {
        alert('操作失败，请稍后重试');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (shareId: string) => {
    if (!confirm('确定要取消这个分享吗？')) return;
    setActionLoading(shareId);
    try {
      const success = await cancelShare(shareId);
      if (success) {
        alert('已取消分享');
      } else {
        alert('操作失败，请稍后重试');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveUserName = () => {
    if (newUserName.trim()) {
      setCurrentUser(newUserName.trim());
      setEditingUser(false);
      loadOutgoingShares();
      loadIncomingShares();
      loadAcceptedShares();
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      pending: { bg: '#fff3e0', color: '#e65100', label: '待确认' },
      accepted: { bg: '#e8f5e9', color: '#2e7d32', label: '已接受' },
      rejected: { bg: '#ffebee', color: '#c62828', label: '已拒绝' }
    };
    const style = styles[status] || styles.pending;
    return (
      <span style={{
        padding: '2px 8px', borderRadius: '10px',
        background: style.bg, color: style.color,
        fontSize: '11px', fontWeight: 500
      }}>
        {style.label}
      </span>
    );
  };

  const renderShareCard = (share: ScheduleShare, actions: React.ReactNode) => (
    <div key={share.id} style={{
      background: '#fff', border: '1px solid #e0e0e0',
      borderRadius: '8px', padding: '12px', marginBottom: '10px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          {share.schedule && (
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1a237e', marginBottom: '4px' }}>
              {share.schedule.title}
            </div>
          )}
          <div style={{ fontSize: '12px', color: '#666' }}>
            {share.ownerName} → {share.sharedWith}
          </div>
          {share.message && (
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', fontStyle: 'italic' }}>
              留言: {share.message}
            </div>
          )}
        </div>
        <div style={{ marginLeft: '12px' }}>
          {getStatusBadge(share.status)}
        </div>
      </div>
      {share.schedule && (
        <div style={{
          fontSize: '12px', color: '#666', background: '#f5f5f5',
          padding: '6px 8px', borderRadius: '4px', marginBottom: '8px'
        }}>
          📅 {new Date(share.schedule.startTime).toLocaleString()} - {new Date(share.schedule.endTime).toLocaleTimeString()}
          <span style={{ marginLeft: '8px' }}>
            {share.schedule.category} · {share.schedule.priority === 'high' ? '🔴' : share.schedule.priority === 'medium' ? '🟡' : '🟢'}
          </span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', color: '#999' }}>
          {new Date(share.createdAt).toLocaleString()}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {actions}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: '#f5f5f5', borderRadius: '12px', width: '640px',
        maxWidth: '95vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          padding: '16px 20px', background: '#fff', borderRadius: '12px 12px 0 0',
          borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#1a237e' }}>🔗 共享计划管理</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer',
            color: '#999'
          }}>×</button>
        </div>

        <div style={{
          padding: '12px 20px', background: '#fff', borderBottom: '1px solid #e0e0e0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>当前身份:</span>
            {editingUser ? (
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  style={{
                    padding: '4px 8px', border: '1px solid #ddd',
                    borderRadius: '4px', fontSize: '13px', width: '120px'
                  }}
                />
                <button onClick={handleSaveUserName} style={{
                  padding: '4px 10px', background: '#1a237e', color: '#fff',
                  border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
                }}>保存</button>
                <button onClick={() => { setEditingUser(false); setNewUserName(currentUser); }} style={{
                  padding: '4px 10px', background: '#eee', color: '#333',
                  border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'
                }}>取消</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#1a237e' }}>
                  {currentUser}
                </span>
                <button onClick={() => setEditingUser(true)} style={{
                  fontSize: '11px', color: '#999', background: 'none',
                  border: 'none', cursor: 'pointer'
                }}>✏️ 修改</button>
              </div>
            )}
          </div>
          <button onClick={handleSync} disabled={syncing} style={{
            padding: '8px 16px', background: syncing ? '#9fa8da' : '#4caf50',
            color: '#fff', border: 'none', borderRadius: '6px',
            fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer'
          }}>
            {syncing ? '同步中...' : '🔄 同步更新'}
          </button>
        </div>

        <div style={{
          display: 'flex', borderBottom: '1px solid #e0e0e0', background: '#fff'
        }}>
          {[
            { key: 'incoming' as TabType, label: '收到的分享', count: incomingShares.length },
            { key: 'outgoing' as TabType, label: '发出的分享', count: outgoingShares.length },
            { key: 'accepted' as TabType, label: '已共享', count: acceptedShares.length }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '12px', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: '14px',
                color: activeTab === tab.key ? '#1a237e' : '#666',
                fontWeight: activeTab === tab.key ? 600 : 400,
                borderBottom: activeTab === tab.key ? '2px solid #1a237e' : '2px solid transparent'
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span style={{
                  marginLeft: '6px', background: activeTab === tab.key ? '#1a237e' : '#e0e0e0',
                  color: activeTab === tab.key ? '#fff' : '#666',
                  padding: '1px 6px', borderRadius: '10px', fontSize: '11px'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          {activeTab === 'incoming' && (
            incomingShares.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
                <div>暂无收到的分享</div>
              </div>
            ) : (
              incomingShares.map(share => renderShareCard(share, (
                <>
                  <button
                    onClick={() => handleReject(share.shareToken)}
                    disabled={actionLoading === share.shareToken}
                    style={{
                      padding: '6px 12px', background: '#fff', color: '#666',
                      border: '1px solid #ddd', borderRadius: '4px',
                      fontSize: '12px', cursor: 'pointer'
                    }}
                  >
                    拒绝
                  </button>
                  <button
                    onClick={() => handleAccept(share.shareToken)}
                    disabled={actionLoading === share.shareToken}
                    style={{
                      padding: '6px 12px', background: '#4caf50', color: '#fff',
                      border: 'none', borderRadius: '4px',
                      fontSize: '12px', cursor: 'pointer'
                    }}
                  >
                    {actionLoading === share.shareToken ? '处理中...' : '接受'}
                  </button>
                </>
              )))
            )
          )}

          {activeTab === 'outgoing' && (
            outgoingShares.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>📤</div>
                <div>暂无发出的分享</div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>
                  点击日程卡片的分享按钮开始分享
                </div>
              </div>
            ) : (
              outgoingShares.map(share => renderShareCard(share, (
                <button
                  onClick={() => handleCancel(share.id)}
                  disabled={actionLoading === share.id}
                  style={{
                    padding: '6px 12px', background: '#ffebee', color: '#c62828',
                    border: 'none', borderRadius: '4px',
                    fontSize: '12px', cursor: 'pointer'
                  }}
                >
                  {actionLoading === share.id ? '处理中...' : '取消分享'}
                </button>
              )))
            )
          )}

          {activeTab === 'accepted' && (
            acceptedShares.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤝</div>
                <div>暂无已共享的日程</div>
                <div style={{ fontSize: '12px', marginTop: '6px' }}>
                  接受分享后双方的日程将保持同步
                </div>
              </div>
            ) : (
              acceptedShares.map(share => renderShareCard(share, (
                <div style={{ fontSize: '11px', color: '#4caf50', padding: '6px 0' }}>
                  ✅ 已同步
                </div>
              )))
            )
          )}
        </div>
      </div>
    </div>
  );
};
