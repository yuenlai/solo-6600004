import React from 'react';
import { useScheduleStore } from '../store/schedule';
import { GroupBy, ScheduleFilter, TimeRange } from '../types';

const priorityOptions = [
  { value: 'high', label: '🔴 高', color: '#ffcdd2' },
  { value: 'medium', label: '🟡 中', color: '#fff9c4' },
  { value: 'low', label: '🟢 低', color: '#c8e6c9' }
] as const;

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'morning', label: '🌅 上午' },
  { value: 'afternoon', label: '☀️ 下午' },
  { value: 'evening', label: '🌆 傍晚' },
  { value: 'night', label: '🌙 夜间' }
];

const completedOptions = [
  { value: 'all', label: '全部' },
  { value: 'incomplete', label: '⏳ 待完成' },
  { value: 'completed', label: '✅ 已完成' }
];

const groupByOptions: { value: GroupBy; label: string }[] = [
  { value: 'none', label: '不分组' },
  { value: 'category', label: '按分类' },
  { value: 'priority', label: '按优先级' },
  { value: 'time', label: '按时间段' },
  { value: 'completed', label: '按完成状态' }
];

export const FilterPanel: React.FC = () => {
  const {
    filter,
    groupBy,
    setFilter,
    setGroupBy,
    resetFilters,
    getUniqueCategories,
    schedules,
    selectedDate,
    getFilteredSchedules
  } = useScheduleStore();

  const categories = getUniqueCategories();
  const daySchedules = schedules.filter(s => s.startTime.startsWith(selectedDate));
  const filteredCount = getFilteredSchedules(schedules, selectedDate).length;
  const totalCount = daySchedules.length;

  const toggleCategory = (category: string) => {
    const newCategories = filter.categories.includes(category)
      ? filter.categories.filter(c => c !== category)
      : [...filter.categories, category];
    setFilter({ categories: newCategories });
  };

  const togglePriority = (priority: 'low' | 'medium' | 'high') => {
    const newPriorities = filter.priorities.includes(priority)
      ? filter.priorities.filter(p => p !== priority)
      : [...filter.priorities, priority];
    setFilter({ priorities: newPriorities });
  };

  const hasActiveFilters = filter.categories.length > 0 || 
    filter.priorities.length > 0 || 
    filter.completed !== 'all' || 
    filter.timeRange !== 'all' ||
    groupBy !== 'none';

  return (
    <div style={{
      background: '#fff',
      borderBottom: '1px solid #e0e0e0',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#333' }}>
            🔍 筛选与分组
          </span>
          <span style={{
            fontSize: '12px',
            color: '#666',
            background: '#f5f5f5',
            padding: '2px 10px',
            borderRadius: '12px'
          }}>
            显示 {filteredCount} / {totalCount} 条
          </span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            style={{
              padding: '6px 14px',
              borderRadius: '16px',
              border: '1px solid #ddd',
              background: '#fff',
              color: '#666',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            重置筛选
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              分类
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {categories.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#999' }}>暂无分类</span>
              ) : categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '14px',
                    border: `1px solid ${filter.categories.includes(cat) ? '#1a237e' : '#ddd'}`,
                    background: filter.categories.includes(cat) ? '#1a237e' : '#fff',
                    color: filter.categories.includes(cat) ? '#fff' : '#333',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              优先级
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {priorityOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => togglePriority(opt.value)}
                  style={{
                    padding: '4px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${filter.priorities.includes(opt.value) ? '#1a237e' : '#ddd'}`,
                    background: filter.priorities.includes(opt.value) ? opt.color : '#fff',
                    color: filter.priorities.includes(opt.value) ? '#333' : '#666',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              完成状态
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {completedOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter({ completed: opt.value as ScheduleFilter['completed'] })}
                  style={{
                    padding: '4px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${filter.completed === opt.value ? '#1a237e' : '#ddd'}`,
                    background: filter.completed === opt.value ? '#1a237e' : '#fff',
                    color: filter.completed === opt.value ? '#fff' : '#666',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
              时间段
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {timeRangeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter({ timeRange: opt.value })}
                  style={{
                    padding: '4px 14px',
                    borderRadius: '14px',
                    border: `1px solid ${filter.timeRange === opt.value ? '#1a237e' : '#ddd'}`,
                    background: filter.timeRange === opt.value ? '#1a237e' : '#fff',
                    color: filter.timeRange === opt.value ? '#fff' : '#666',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            分组方式
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {groupByOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setGroupBy(opt.value)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '16px',
                  border: `1px solid ${groupBy === opt.value ? '#4caf50' : '#ddd'}`,
                  background: groupBy === opt.value ? '#4caf50' : '#fff',
                  color: groupBy === opt.value ? '#fff' : '#666',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {groupBy !== 'none' && groupBy === opt.value && '✓ '}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
