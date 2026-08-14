# AGENTS.md — JobRadar 项目指令

## 项目概述

JobRadar 是一个个人使用的全网岗位监控系统。从 8 大招聘渠道定时采集新增岗位，经数据清洗后入库，基于 AI 计算用户简历与岗位 JD 的匹配度评分，对高匹配新岗位实时推送通知。

## 技术栈

- **后端**: Python 3.11+ / FastAPI / Uvicorn
- **爬虫**: httpx (异步HTTP) / Playwright (JS渲染页面)
- **数据库**: SQLAlchemy ORM + SQLite (初期) / MySQL (扩展)
- **AI**: OpenAI API (text-embedding-3-small + gpt-4o-mini) / ChromaDB (向量存储)
- **调度**: APScheduler
- **前端**: Vue3 + Vite + Element Plus + AG Grid
- **部署**: Docker Compose
- **包管理**: pip (后端) / pnpm (前端)

## 项目目录结构

```
job-radar/
├── AGENTS.md                    # 本文件 — Codex 项目指令
├── 全网岗位监控系统-任务书.md      # 完整任务书（设计参考）
├── prompts/                      # Codex 分阶段提示词
│   ├── 1-阶段一-MVP.md
│   ├── 2-阶段二-AI匹配与推送.md
│   ├── 3-阶段三-全渠道与前端.md
│   └── 4-阶段四-稳定性与运维.md
├── docker-compose.yml
├── .gitignore
├── .env.example
├── requirements.txt
│
├── crawlers/                    # 采集引擎层
│   ├── __init__.py
│   ├── base/
│   │   ├── __init__.py
│   │   ├── base_crawler.py      # 爬虫基类
│   │   ├── anti_detect.py       # 反爬工具
│   │   └── models.py            # RawJobItem 数据模型
│   ├── sources/
│   │   ├── __init__.py
│   │   ├── sasac_crawler.py     # 国资委
│   │   ├── mohrss_crawler.py    # 人社部
│   │   ├── official_crawler.py  # 企业官网
│   │   ├── wechat_crawler.py    # 微信公众号
│   │   ├── iguopin_crawler.py   # 国聘网
│   │   ├── boss_crawler.py      # Boss直聘
│   │   ├── job51_crawler.py     # 前程无忧
│   │   └── zhaopin_crawler.py   # 智联招聘
│   ├── scheduler.py             # APScheduler 调度器
│   └── incremental.py           # 增量检测器
│
├── pipeline/                    # 数据处理层
│   ├── __init__.py
│   ├── cleaner.py               # 数据清洗
│   ├── deduplicator.py          # 去重
│   ├── normalizer.py            # 字段标准化
│   ├── tagger.py                # 打标签
│   └── storage.py               # 入库
│
├── matching/                    # AI 匹配层
│   ├── __init__.py
│   ├── resume_parser.py         # 简历解析
│   ├── jd_parser.py             # JD 解析
│   ├── embedding_engine.py      # 向量化引擎
│   ├── similarity_scorer.py     # 向量相似度粗筛
│   ├── llm_scorer.py            # LLM 精细评分
│   └── match_engine.py          # 匹配调度入口
│
├── api/                         # API 服务层
│   ├── __init__.py
│   ├── main.py                  # FastAPI 入口
│   ├── deps.py                  # 依赖注入
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── jobs.py              # 岗位接口
│   │   ├── resume.py            # 简历接口
│   │   ├── matching.py          # 匹配接口
│   │   ├── subscription.py      # 订阅接口
│   │   └── notification.py     # 通知接口
│   └── websocket.py             # WebSocket 推送
│
├── push/                        # 推送层
│   ├── __init__.py
│   ├── email_pusher.py
│   ├── wechat_pusher.py
│   ├── dingtalk_pusher.py
│   └── push_manager.py
│
├── web/                         # 前端 Vue3
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── App.vue
│       ├── main.ts
│       ├── router/index.ts
│       ├── stores/
│       ├── api/
│       └── views/
│           ├── JobList.vue
│           ├── JobDetail.vue
│           ├── ResumeUpload.vue
│           ├── MatchResult.vue
│           ├── Settings.vue
│           └── Dashboard.vue
│
├── database/                    # 数据库
│   ├── __init__.py
│   ├── models.py                # ORM 模型
│   ├── session.py               # 会话管理
│   └── seed.py                  # 初始化数据
│
├── config/
│   ├── settings.py              # 全局配置 (pydantic-settings)
│   ├── sources.yaml             # 渠道调度配置
│   └── matching_rules.yaml      # 匹配规则
│
└── tests/
    ├── __init__.py
    ├── test_crawlers/
    ├── test_pipeline/
    └── test_matching/
```

## 编码规范

### Python 后端
- 使用 `type hints` 标注所有函数签名
- 使用 `pydantic` 模型做请求/响应校验
- 使用 `async/await` 异步编程（FastAPI + httpx）
- 每个模块有 `__init__.py`
- 配置统一走 `config/settings.py`，不硬编码
- 日志使用 `logging` 模块，格式: `[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s`
- 错误处理：爬虫失败不中断整体流程，记录日志后继续

### Vue 前端
- 使用 `<script setup lang="ts">` 组合式 API
- API 调用统一封装在 `src/api/` 目录
- 状态管理使用 Pinia
- 使用 Element Plus 组件库

### 数据库
- 使用 SQLAlchemy 2.0 风格 (Mapped / mapped_column)
- 时间字段统一使用 UTC 存储，展示时转 Asia/Shanghai
- 布尔字段使用 Boolean 类型

### 关键约定
- 爬虫统一输出 `RawJobItem` dataclass，Pipeline 统一消费
- 岗位去重指纹: `MD5(规范化标题 + "\\0" + 规范化公司名 + "\\0" + 规范化城市)`；跨渠道合并需单独的来源关联模型，未实现前不宣称已合并
- 匹配评分范围: 0.0 - 5.0
- 推送阈值: ≥4.0 实时推送，3.0-4.0 每日汇总
- 所有外部配置通过 `.env` 环境变量注入
- Mock 数据仅用于开发验证，必须显式启用，不能计入真实采集验收或写入生产数据
- `.env`、简历、Cookie、数据库、日志和浏览器状态统一保存在 Git 忽略目录中

## 环境变量 (.env)

```
DATABASE_URL=sqlite:///data/jobradar.db
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini
CHROMA_HOST=localhost
CHROMA_PORT=8001
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your_email@qq.com
SMTP_PASSWORD=your_auth_code
NOTIFY_EMAIL=your_email@qq.com
SERVERCHAN_KEY=SCT123456
DINGTALK_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx
DINGTALK_SECRET=SECxxx
TIMEZONE=Asia/Shanghai
```

## 常用命令

```bash
# 后端
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000

# 调度器（独立进程）
python -m crawlers.scheduler

# 前端
cd web && pnpm install && pnpm dev

# Docker 一键启动
docker compose up -d
```

## 实施顺序

按 `prompts/` 目录下的 4 个阶段文件依次执行:
1. `1-阶段一-MVP.md` — 项目骨架 + 2渠道采集 + 数据处理 + 基础API + 前端列表
2. `2-阶段二-AI匹配与推送.md` — 简历解析 + AI匹配 + 推送系统
3. `3-阶段三-全渠道与前端.md` — 剩余6渠道 + 前端完善
4. `4-阶段四-稳定性与运维.md` — 健康检查 + 备份 + 性能优化
