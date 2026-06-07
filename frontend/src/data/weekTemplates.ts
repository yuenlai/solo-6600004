export interface TemplateEvent {
  title: string;
  description: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
}

export interface WeekTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  events: TemplateEvent[];
}

export const weekTemplates: WeekTemplate[] = [
  {
    id: 'work-week',
    name: '工作周',
    description: '标准高效工作周安排，适合职场人士',
    icon: '💼',
    color: '#1a237e',
    events: [
      { dayOfWeek: 0, title: '晨会', description: '团队周会，同步本周目标', startTime: '09:00', endTime: '10:00', priority: 'high', category: '工作' },
      { dayOfWeek: 0, title: '邮件处理', description: '回复重要邮件', startTime: '10:00', endTime: '11:00', priority: 'medium', category: '工作' },
      { dayOfWeek: 0, title: '深度工作', description: '专注处理核心任务', startTime: '11:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 0, title: '午休', description: '休息放松', startTime: '12:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 0, title: '项目跟进', description: '跟进项目进度', startTime: '13:30', endTime: '15:30', priority: 'high', category: '工作' },
      { dayOfWeek: 0, title: '会议', description: '跨部门协作会议', startTime: '15:30', endTime: '17:00', priority: 'medium', category: '工作' },
      { dayOfWeek: 0, title: '复盘整理', description: '整理今日工作，规划明日', startTime: '17:00', endTime: '18:00', priority: 'medium', category: '工作' },

      { dayOfWeek: 1, title: '深度工作', description: '专注核心任务', startTime: '09:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 1, title: '午休', description: '休息放松', startTime: '12:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 1, title: '代码评审', description: '团队代码评审', startTime: '13:30', endTime: '15:00', priority: 'medium', category: '工作' },
      { dayOfWeek: 1, title: '技术学习', description: '学习新技术', startTime: '15:00', endTime: '17:00', priority: 'medium', category: '学习' },
      { dayOfWeek: 1, title: '复盘整理', description: '整理今日工作', startTime: '17:00', endTime: '18:00', priority: 'medium', category: '工作' },

      { dayOfWeek: 2, title: '站会', description: '每日站会', startTime: '09:00', endTime: '09:30', priority: 'medium', category: '工作' },
      { dayOfWeek: 2, title: '深度工作', description: '专注处理核心任务', startTime: '09:30', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 2, title: '午休', description: '休息放松', startTime: '12:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 2, title: '客户沟通', description: '客户需求沟通', startTime: '13:30', endTime: '15:00', priority: 'high', category: '工作' },
      { dayOfWeek: 2, title: '文档整理', description: '整理项目文档', startTime: '15:00', endTime: '17:00', priority: 'medium', category: '工作' },
      { dayOfWeek: 2, title: '复盘', description: '周三复盘', startTime: '17:00', endTime: '18:00', priority: 'medium', category: '工作' },

      { dayOfWeek: 3, title: '深度工作', description: '专注核心任务', startTime: '09:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 3, title: '午休', description: '休息放松', startTime: '12:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 3, title: '团队讨论', description: '方案讨论', startTime: '13:30', endTime: '15:00', priority: 'medium', category: '工作' },
      { dayOfWeek: 3, title: '技术分享', description: '团队技术分享', startTime: '15:00', endTime: '16:30', priority: 'medium', category: '学习' },
      { dayOfWeek: 3, title: '任务收尾', description: '本周任务收尾', startTime: '16:30', endTime: '18:00', priority: 'high', category: '工作' },

      { dayOfWeek: 4, title: '周会', description: '周五周会', startTime: '09:00', endTime: '10:00', priority: 'high', category: '工作' },
      { dayOfWeek: 4, title: '本周总结', description: '总结本周工作', startTime: '10:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 4, title: '午休', description: '休息放松', startTime: '12:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 4, title: '下周规划', description: '规划下周工作', startTime: '13:30', endTime: '15:30', priority: 'high', category: '工作' },
      { dayOfWeek: 4, title: '轻松周五', description: '整理桌面，放松心情', startTime: '15:30', endTime: '18:00', priority: 'low', category: '生活' },

      { dayOfWeek: 5, title: '运动健身', description: '周末运动', startTime: '09:00', endTime: '10:30', priority: 'medium', category: '生活' },
      { dayOfWeek: 5, title: '阅读学习', description: '阅读书籍', startTime: '14:00', endTime: '16:00', priority: 'medium', category: '学习' },
      { dayOfWeek: 5, title: '休闲娱乐', description: '放松休息', startTime: '19:00', endTime: '22:00', priority: 'low', category: '生活' },

      { dayOfWeek: 6, title: '家庭时间', description: '陪伴家人', startTime: '10:00', endTime: '12:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 6, title: '下周准备', description: '准备下周工作', startTime: '16:00', endTime: '18:00', priority: 'medium', category: '工作' },
    ]
  },
  {
    id: 'exam-week',
    name: '考试周',
    description: '高强度复习备考安排，适合学生党',
    icon: '📚',
    color: '#e65100',
    events: [
      { dayOfWeek: 0, title: '早起晨读', description: '背诵重要知识点', startTime: '06:30', endTime: '08:00', priority: 'high', category: '学习' },
      { dayOfWeek: 0, title: '早餐休息', description: '吃早餐，准备开始', startTime: '08:00', endTime: '08:30', priority: 'low', category: '生活' },
      { dayOfWeek: 0, title: '科目一复习', description: '主攻薄弱科目', startTime: '08:30', endTime: '11:30', priority: 'high', category: '学习' },
      { dayOfWeek: 0, title: '午餐休息', description: '午餐+午休', startTime: '11:30', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 0, title: '科目二复习', description: '第二科目复习', startTime: '13:30', endTime: '16:30', priority: 'high', category: '学习' },
      { dayOfWeek: 0, title: '运动放松', description: '适当运动，劳逸结合', startTime: '16:30', endTime: '17:30', priority: 'medium', category: '生活' },
      { dayOfWeek: 0, title: '晚餐', description: '晚餐休息', startTime: '17:30', endTime: '18:30', priority: 'low', category: '生活' },
      { dayOfWeek: 0, title: '晚间复习', description: '回顾今日内容，做题', startTime: '18:30', endTime: '21:30', priority: 'high', category: '学习' },
      { dayOfWeek: 0, title: '洗漱休息', description: '准备睡觉', startTime: '22:00', endTime: '22:30', priority: 'low', category: '生活' },

      { dayOfWeek: 1, title: '早起晨读', description: '背诵重要知识点', startTime: '06:30', endTime: '08:00', priority: 'high', category: '学习' },
      { dayOfWeek: 1, title: '早餐休息', description: '吃早餐', startTime: '08:00', endTime: '08:30', priority: 'low', category: '生活' },
      { dayOfWeek: 1, title: '科目一复习', description: '模拟考试', startTime: '08:30', endTime: '11:30', priority: 'high', category: '学习' },
      { dayOfWeek: 1, title: '午餐休息', description: '午餐+午休', startTime: '11:30', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 1, title: '科目二复习', description: '错题回顾', startTime: '13:30', endTime: '16:30', priority: 'high', category: '学习' },
      { dayOfWeek: 1, title: '运动放松', description: '适当运动', startTime: '16:30', endTime: '17:30', priority: 'medium', category: '生活' },
      { dayOfWeek: 1, title: '晚餐', description: '晚餐休息', startTime: '17:30', endTime: '18:30', priority: 'low', category: '生活' },
      { dayOfWeek: 1, title: '晚间复习', description: '查漏补缺', startTime: '18:30', endTime: '21:30', priority: 'high', category: '学习' },
      { dayOfWeek: 1, title: '洗漱休息', description: '准备睡觉', startTime: '22:00', endTime: '22:30', priority: 'low', category: '生活' },

      { dayOfWeek: 2, title: '早起晨读', description: '背诵重要知识点', startTime: '06:30', endTime: '08:00', priority: 'high', category: '学习' },
      { dayOfWeek: 2, title: '早餐', description: '吃早餐', startTime: '08:00', endTime: '08:30', priority: 'low', category: '生活' },
      { dayOfWeek: 2, title: '科目一考试', description: '第一天考试', startTime: '09:00', endTime: '11:30', priority: 'high', category: '学习' },
      { dayOfWeek: 2, title: '午餐休息', description: '午餐+休息', startTime: '11:30', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 2, title: '科目二复习', description: '为明天考试准备', startTime: '13:30', endTime: '17:30', priority: 'high', category: '学习' },
      { dayOfWeek: 2, title: '晚餐', description: '晚餐休息', startTime: '17:30', endTime: '18:30', priority: 'low', category: '生活' },
      { dayOfWeek: 2, title: '晚间回顾', description: '快速回顾重点', startTime: '18:30', endTime: '20:30', priority: 'high', category: '学习' },
      { dayOfWeek: 2, title: '早点休息', description: '保证睡眠', startTime: '21:00', endTime: '22:30', priority: 'medium', category: '生活' },

      { dayOfWeek: 3, title: '早起复习', description: '考前快速浏览', startTime: '06:30', endTime: '08:00', priority: 'high', category: '学习' },
      { dayOfWeek: 3, title: '早餐', description: '吃早餐', startTime: '08:00', endTime: '08:30', priority: 'low', category: '生活' },
      { dayOfWeek: 3, title: '科目二考试', description: '第二天考试', startTime: '09:00', endTime: '11:30', priority: 'high', category: '学习' },
      { dayOfWeek: 3, title: '午餐休息', description: '午餐+休息', startTime: '11:30', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 3, title: '科目三复习', description: '为后天考试准备', startTime: '13:30', endTime: '17:30', priority: 'high', category: '学习' },
      { dayOfWeek: 3, title: '晚餐', description: '晚餐休息', startTime: '17:30', endTime: '18:30', priority: 'low', category: '生活' },
      { dayOfWeek: 3, title: '晚间回顾', description: '快速回顾重点', startTime: '18:30', endTime: '20:30', priority: 'high', category: '学习' },
      { dayOfWeek: 3, title: '早点休息', description: '保证睡眠', startTime: '21:00', endTime: '22:30', priority: 'medium', category: '生活' },

      { dayOfWeek: 4, title: '早起复习', description: '考前快速浏览', startTime: '06:30', endTime: '08:00', priority: 'high', category: '学习' },
      { dayOfWeek: 4, title: '早餐', description: '吃早餐', startTime: '08:00', endTime: '08:30', priority: 'low', category: '生活' },
      { dayOfWeek: 4, title: '科目三考试', description: '第三天考试', startTime: '09:00', endTime: '11:30', priority: 'high', category: '学习' },
      { dayOfWeek: 4, title: '午餐休息', description: '考完放松', startTime: '11:30', endTime: '14:00', priority: 'low', category: '生活' },
      { dayOfWeek: 4, title: '科目四复习', description: '最后一门冲刺', startTime: '14:00', endTime: '17:30', priority: 'high', category: '学习' },
      { dayOfWeek: 4, title: '晚餐', description: '晚餐休息', startTime: '17:30', endTime: '18:30', priority: 'low', category: '生活' },
      { dayOfWeek: 4, title: '晚间回顾', description: '最后冲刺', startTime: '18:30', endTime: '20:30', priority: 'high', category: '学习' },
      { dayOfWeek: 4, title: '早点休息', description: '保证睡眠', startTime: '21:00', endTime: '22:30', priority: 'medium', category: '生活' },

      { dayOfWeek: 5, title: '早起复习', description: '考前快速浏览', startTime: '06:30', endTime: '08:00', priority: 'high', category: '学习' },
      { dayOfWeek: 5, title: '早餐', description: '吃早餐', startTime: '08:00', endTime: '08:30', priority: 'low', category: '生活' },
      { dayOfWeek: 5, title: '科目四考试', description: '最后一门考试', startTime: '09:00', endTime: '11:30', priority: 'high', category: '学习' },
      { dayOfWeek: 5, title: '庆祝放松', description: '考试结束，好好放松', startTime: '12:00', endTime: '22:00', priority: 'low', category: '生活' },

      { dayOfWeek: 6, title: '休息调整', description: '睡到自然醒', startTime: '10:00', endTime: '12:00', priority: 'low', category: '生活' },
      { dayOfWeek: 6, title: '假期规划', description: '规划假期安排', startTime: '14:00', endTime: '16:00', priority: 'medium', category: '生活' },
    ]
  },
  {
    id: 'fitness-week',
    name: '健身周',
    description: '科学健身训练计划，增肌减脂塑形',
    icon: '💪',
    color: '#2e7d32',
    events: [
      { dayOfWeek: 0, title: '晨起拉伸', description: '唤醒身体', startTime: '06:30', endTime: '07:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 0, title: '胸部训练', description: '卧推、飞鸟、俯卧撑', startTime: '07:00', endTime: '08:30', priority: 'high', category: '生活' },
      { dayOfWeek: 0, title: '早餐', description: '高蛋白早餐', startTime: '08:30', endTime: '09:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 0, title: '工作/学习', description: '上午工作', startTime: '09:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 0, title: '午餐', description: '均衡营养午餐', startTime: '12:00', endTime: '13:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 0, title: '午休', description: '短暂休息', startTime: '13:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 0, title: '工作/学习', description: '下午工作', startTime: '13:30', endTime: '17:30', priority: 'high', category: '工作' },
      { dayOfWeek: 0, title: '有氧训练', description: '慢跑30分钟', startTime: '18:00', endTime: '18:30', priority: 'medium', category: '生活' },
      { dayOfWeek: 0, title: '晚餐', description: '健康晚餐', startTime: '19:00', endTime: '19:30', priority: 'medium', category: '生活' },
      { dayOfWeek: 0, title: '放松拉伸', description: '睡前拉伸', startTime: '21:30', endTime: '22:00', priority: 'low', category: '生活' },

      { dayOfWeek: 1, title: '晨起拉伸', description: '唤醒身体', startTime: '06:30', endTime: '07:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 1, title: '背部训练', description: '引体向上、划船、硬拉', startTime: '07:00', endTime: '08:30', priority: 'high', category: '生活' },
      { dayOfWeek: 1, title: '早餐', description: '高蛋白早餐', startTime: '08:30', endTime: '09:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 1, title: '工作/学习', description: '上午工作', startTime: '09:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 1, title: '午餐', description: '均衡营养午餐', startTime: '12:00', endTime: '13:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 1, title: '午休', description: '短暂休息', startTime: '13:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 1, title: '工作/学习', description: '下午工作', startTime: '13:30', endTime: '17:30', priority: 'high', category: '工作' },
      { dayOfWeek: 1, title: '核心训练', description: '平板支撑、卷腹', startTime: '18:00', endTime: '18:30', priority: 'medium', category: '生活' },
      { dayOfWeek: 1, title: '晚餐', description: '健康晚餐', startTime: '19:00', endTime: '19:30', priority: 'medium', category: '生活' },

      { dayOfWeek: 2, title: '晨起拉伸', description: '唤醒身体', startTime: '06:30', endTime: '07:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 2, title: '腿部训练', description: '深蹲、腿举、箭步蹲', startTime: '07:00', endTime: '08:30', priority: 'high', category: '生活' },
      { dayOfWeek: 2, title: '早餐', description: '高蛋白早餐', startTime: '08:30', endTime: '09:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 2, title: '工作/学习', description: '上午工作', startTime: '09:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 2, title: '午餐', description: '均衡营养午餐', startTime: '12:00', endTime: '13:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 2, title: '午休', description: '短暂休息', startTime: '13:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 2, title: '工作/学习', description: '下午工作', startTime: '13:30', endTime: '17:30', priority: 'high', category: '工作' },
      { dayOfWeek: 2, title: '有氧训练', description: '游泳或骑车', startTime: '18:00', endTime: '19:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 2, title: '晚餐', description: '健康晚餐', startTime: '19:30', endTime: '20:00', priority: 'medium', category: '生活' },

      { dayOfWeek: 3, title: '晨起拉伸', description: '唤醒身体', startTime: '06:30', endTime: '07:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 3, title: '肩部训练', description: '推举、侧平举、面拉', startTime: '07:00', endTime: '08:30', priority: 'high', category: '生活' },
      { dayOfWeek: 3, title: '早餐', description: '高蛋白早餐', startTime: '08:30', endTime: '09:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 3, title: '工作/学习', description: '上午工作', startTime: '09:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 3, title: '午餐', description: '均衡营养午餐', startTime: '12:00', endTime: '13:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 3, title: '午休', description: '短暂休息', startTime: '13:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 3, title: '工作/学习', description: '下午工作', startTime: '13:30', endTime: '17:30', priority: 'high', category: '工作' },
      { dayOfWeek: 3, title: '核心训练', description: '腹斜肌、下背训练', startTime: '18:00', endTime: '18:30', priority: 'medium', category: '生活' },
      { dayOfWeek: 3, title: '晚餐', description: '健康晚餐', startTime: '19:00', endTime: '19:30', priority: 'medium', category: '生活' },

      { dayOfWeek: 4, title: '晨起拉伸', description: '唤醒身体', startTime: '06:30', endTime: '07:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 4, title: '手臂训练', description: '二头、三头、小臂', startTime: '07:00', endTime: '08:30', priority: 'high', category: '生活' },
      { dayOfWeek: 4, title: '早餐', description: '高蛋白早餐', startTime: '08:30', endTime: '09:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 4, title: '工作/学习', description: '上午工作', startTime: '09:00', endTime: '12:00', priority: 'high', category: '工作' },
      { dayOfWeek: 4, title: '午餐', description: '均衡营养午餐', startTime: '12:00', endTime: '13:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 4, title: '午休', description: '短暂休息', startTime: '13:00', endTime: '13:30', priority: 'low', category: '生活' },
      { dayOfWeek: 4, title: '工作/学习', description: '下午工作', startTime: '13:30', endTime: '17:30', priority: 'high', category: '工作' },
      { dayOfWeek: 4, title: '有氧训练', description: 'HIIT高强度间歇', startTime: '18:00', endTime: '18:45', priority: 'high', category: '生活' },
      { dayOfWeek: 4, title: '晚餐', description: '健康晚餐', startTime: '19:00', endTime: '19:30', priority: 'medium', category: '生活' },

      { dayOfWeek: 5, title: '晨起运动', description: '户外晨跑', startTime: '07:00', endTime: '08:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 5, title: '早餐', description: '营养早餐', startTime: '08:00', endTime: '08:30', priority: 'medium', category: '生活' },
      { dayOfWeek: 5, title: '全身训练', description: '综合体能训练', startTime: '09:00', endTime: '11:00', priority: 'high', category: '生活' },
      { dayOfWeek: 5, title: '午餐', description: '补充蛋白质', startTime: '12:00', endTime: '13:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 5, title: '午休', description: '好好休息', startTime: '13:00', endTime: '15:00', priority: 'low', category: '生活' },
      { dayOfWeek: 5, title: '户外活动', description: '打球或爬山', startTime: '15:00', endTime: '18:00', priority: 'medium', category: '生活' },
      { dayOfWeek: 5, title: '晚餐', description: '健康晚餐', startTime: '19:00', endTime: '20:00', priority: 'medium', category: '生活' },

      { dayOfWeek: 6, title: '休息日', description: '完全休息恢复', startTime: '10:00', endTime: '12:00', priority: 'low', category: '生活' },
      { dayOfWeek: 6, title: '轻量活动', description: '散步或瑜伽', startTime: '15:00', endTime: '16:00', priority: 'low', category: '生活' },
      { dayOfWeek: 6, title: '下周计划', description: '规划下周训练', startTime: '20:00', endTime: '21:00', priority: 'medium', category: '生活' },
    ]
  }
];

export function getWeekStartDate(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
