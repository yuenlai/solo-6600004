# solo-6600004 - 智能日程规划与习惯追踪器

## 项目简介
构建一个智能日程规划与习惯追踪应用，支持自然语言输入创建日程、AI智能排程建议、番茄钟专注模式、习惯打卡与连续天数统计、周/月报表可视化、日历同步集成、智能提醒与冲突检测

## 技术栈
- **前端**: React + TypeScript + Material UI + Recharts
- **后端**: Python + FastAPI + Celery
- **数据库**: PostgreSQL + Redis

## 快速开始

### 服务端
```bash
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload
```

### 客户端
```bash
cd frontend && npm install && npm run dev
```

## 功能特性
- 日程管理与优先级分类
- 习惯打卡与连续天数统计
- 番茄钟专注模式
- 周/月报表可视化
- AI智能排程建议
- 智能提醒与冲突检测
