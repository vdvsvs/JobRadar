---
📢 Codex 客户端使用说明：
1. 请确保已经用「File → Open Folder」打开了 job-radar 目录（AGENTS.md 已自动加载）
2. 将本文件全部内容复制粘贴到 Codex 对话框后发送
3. 等待生成完毕后，对照底部「验收标准」逐条验证
4. 如果回复被截断，直接回复：「请继续」
5. 如果只生成了部分 Task，回复：「请继续生成剩下的 Task」
6. 本阶段全部通过后，再打开 prompts/2-阶段二-AI匹配与推送.md
---

# Phase 1 — MVP 核心闭环

> **目标**：跑通「定时采集 → 数据清洗 → 入库 → API 查询 → 前端表格展示」基础流程
> **前置条件**：无
> **产出物**：项目骨架、数据库、2 个渠道爬虫、数据处理 Pipeline、基础 API、前端岗位列表页、Docker 配置
> **预计生成代码文件数**：约 25 个

---

## Task 1.1 — 项目骨架与依赖

创建以下文件：

**requirements.txt**:
```
fastapi==0.115.*
uvicorn[standard]==0.30.*
httpx==0.27.*
fake-useragent==1.5.*
apscheduler==3.10.*
sqlalchemy==2.0.*
alembic==1.13.*
pydantic==2.8.*
pydantic-settings==2.4.*
python-multipart==0.0.*
pyyaml==6.0.*
pytest==8.*
```

**.env.example**:
```
DATABASE_URL=sqlite:///data/jobradar.db
TIMEZONE=Asia/Shanghai
ALLOW_MOCK_DATA=false
```

**config/settings.py**:
使用 pydantic-settings 读取环境变量，包含 DATABASE_URL、TIMEZONE、ALLOW_MOCK_DATA 等字段。

**config/sources.yaml**:
先只启用 iguopin 和 job51 两个渠道：
```yaml
sources:
  iguopin:
    enabled: true
    schedule: "*/30 * * * *"
    mock: false
  job51:
    enabled: true
    schedule: "*/30 * * * *"
    mock: false
```

**database/session.py**:
- 使用 SQLAlchemy 2.0 风格
- 创建 engine 和 get_db() 依赖注入函数
- 同时导出 `SessionLocal`，供调度任务通过上下文管理器创建并关闭独立会话
- SQLite 使用 check_same_thread=False，并设置 WAL 模式和合理的 busy_timeout，降低 API 与 scheduler 并发写入时的锁冲突

**database/__init__.py** 和 **config/__init__.py**：空文件即可。

---

## Task 1.2 — 数据库模型

创建 **database/models.py**，定义以下 ORM 模型（SQLAlchemy 2.0 Mapped 风格，使用 Mapped/mapped_column）：

1. **Job** 岗位表字段：
   id (int PK), source (str), source_url (str), source_job_id (str),
   title (str), company (str), company_type (str, nullable), industry (str, nullable),
   city (str), education (str, nullable), graduation_year (str, nullable),
   major_required (str, nullable), salary (str, nullable), jd_text (Text), jd_clean (Text, nullable),
   skills_extracted (JSON, nullable), job_hash (str, unique index),
   publish_date (date, nullable), crawl_time (datetime), is_active (bool, default True),
   created_at (datetime, default now)

2. **CrawlLog** 采集日志表字段：
   id (int PK), source (str), status (str, 'success'/'failed'), new_count (int, default 0),
   error_msg (Text, nullable), duration_sec (float, nullable), created_at (datetime)

3. **Subscription** 订阅表字段：
   id (int PK), name (str), resume_id (int, nullable), keywords (str, nullable),
   cities (str, nullable), min_score (float, default 3.0), channels (JSON, nullable),
   is_active (bool, default True), created_at (datetime)

> 注意：
> - 时间字段统一以 UTC 写入 DateTime；不要依赖宿主机或数据库服务的本地时区
> - skills_extracted 和 channels 使用 JSON 类型
> - job_hash 加唯一索引（UniqueConstraint）
> - (source, source_job_id) 加联合唯一索引

创建 **database/seed.py**：
- init_db() 函数：创建 data/ 目录（如不存在），调用 Base.metadata.create_all(engine) 创建所有表

---

## Task 1.3 — 爬虫基类与数据模型

创建 crawlers 目录结构：
- crawlers/__init__.py（空）
- crawlers/base/__init__.py（空）
- crawlers/sources/__init__.py（空）

创建 **crawlers/base/models.py**:
```python
from dataclasses import dataclass, field
from typing import Any

@dataclass
class RawJobItem:
    source: str
    source_url: str
    source_job_id: str
    title: str
    company: str
    city: str
    education: str
    salary: str
    jd_text: str
    publish_date: str
    raw_data: dict[str, Any] = field(default_factory=dict)
```

创建 **crawlers/base/anti_detect.py**:
- get_random_headers() -> dict: 返回带随机 UA(fake-useragent) 的请求头
- async sleep_random(min_sec=2, max_sec=5): asyncio.sleep 随机延迟
- async fetch_with_retry(url, method='GET', **kwargs): 使用 httpx.AsyncClient + 自动重试(最多3次) + 超时30s；失败抛 Exception

创建 **crawlers/base/base_crawler.py**:
```python
from abc import ABC, abstractmethod
from crawlers.base.models import RawJobItem

class BaseCrawler(ABC):
    source_name: str  # 子类必须定义，如 "iguopin"

    async def crawl(self) -> list[RawJobItem]:
        """采集入口：fetch_list 结果 → 逐条 parse_item → 返回列表"""
        raw_list = await self.fetch_list()
        return [self.parse_item(raw) for raw in raw_list if raw]

    @abstractmethod
    async def fetch_list(self) -> list[dict]:
        """获取岗位列表页原始数据，返回 dict 列表"""
        ...

    @abstractmethod
    def parse_item(self, raw: dict) -> RawJobItem:
        """解析单条岗位为 RawJobItem"""
        ...
```

---

## Task 1.4 — 实现两个爬虫

创建 **crawlers/sources/iguopin_crawler.py** (国聘网爬虫)：
- 继承 BaseCrawler，source_name = "iguopin"
- fetch_list(): 访问 https://www.iguopin.com 招聘搜索列表
- 支持 2-3 页翻页
- parse_item() 提取对应字段
- **重要**：如果你无法直接从真实页面抓取，可提供 Mock 数据版本（10-20 条模拟数据），但只能在 `ALLOW_MOCK_DATA=true` 且该渠道 `mock: true` 时返回；默认配置必须明确报 degraded/未实现，不能把 Mock 当成真实采集结果。不要生成空文件。

创建 **crawlers/sources/job51_crawler.py** (前程无忧爬虫)：
- 继承 BaseCrawler，source_name = "job51"
- 访问 https://www.51job.com 搜索页
- 注意可能有 GBK 编码，如遇到 response.encoding='gbk' 的情况
- 同样，无法抓取真实数据则写受 `ALLOW_MOCK_DATA` 和渠道 `mock` 双重控制的 Mock 版本

创建 **crawlers/__init__.py**，导出一个 get_crawler(name) 工厂函数，方便 scheduler 使用：
```python
from crawlers.sources.iguopin_crawler import IguopinCrawler
from crawlers.sources.job51_crawler import Job51Crawler

CRAWLERS = {
    "iguopin": IguopinCrawler(),
    "job51": Job51Crawler(),
}

def get_crawler(source_name: str):
    return CRAWLERS.get(source_name)
```

---

## Task 1.5 — 数据处理 Pipeline

创建 pipeline 目录：pipeline/__init__.py（导出 process_pipeline 函数）

创建 **pipeline/cleaner.py**:
- clean_html(text) -> str: 用 re.sub 去除 HTML 标签/脚本/样式
- clean_whitespace(text) -> str: 去除多余空白、连续换行
- clean_jd(raw_text) -> str: 组合调用

创建 **pipeline/deduplicator.py**:
- compute_hash(title: str, company: str, city: str) -> str: 先去首尾空白、合并连续空白并统一大小写，再用 `\0` 分隔字段计算 MD5；城市必须参与指纹，避免同公司同标题的异地岗位被误删
- filter_new_items(items: list[RawJobItem], session) -> list[RawJobItem]: 查询数据库已存在的 job_hash，过滤掉重复项

创建 **pipeline/normalizer.py**:
- normalize_education(text) -> str: "本科及以上"→"本科", "硕士/博士"→"硕士", "博士研究生"→"博士", 无法识别则原值
- normalize_city(text) -> str: 去除"市/省"后缀，支持分号/逗号拆分为多城市后再 join
- normalize_salary(text) -> str: "15k-25k"→"15000-25000/月", "面议/薪资面议"→None
- normalize_major(text) -> str: 标准化专业名称（简单处理：常见缩写映射）
- normalize_graduation_year(text) -> str: "2027届"→"27届"
- classify_company_type(company: str, company_info: str = "") -> str: 基于关键词判断 上市/大型/中型/小型

创建 **pipeline/storage.py**:
- store_jobs(items: list[RawJobItem], session) -> int:
  1) 对每个 item 调用 cleaner + normalizer
  2) 计算 job_hash；跳过数据库中已存在的（先查一遍）
  3) 转为 Job ORM 对象批量 add + commit
  4) 返回新增数量

创建 **pipeline/__init__.py**:
```python
from pipeline.cleaner import clean_jd
from pipeline.deduplicator import filter_new_items
from pipeline.storage import store_jobs

async def process_pipeline(items, session):
    """编排：去重 → 清洗 → 入库"""
    unique_items = filter_new_items(items, session)
    for item in unique_items:
        item.jd_text = clean_jd(item.jd_text) if item.jd_text else ""
    new_count = store_jobs(unique_items, session)
    return {"new": new_count, "duplicate": len(items)-len(unique_items), "total": len(items)}
```

---

## Task 1.6 — API 服务

创建 api 目录结构：api/__init__.py, api/routers/__init__.py

创建 **api/deps.py**：提供 get_db() 依赖。

创建 **api/main.py** (FastAPI 入口):
- app = FastAPI(title="JobRadar API", lifespan=lifespan)
- lifespan 中：创建 data 目录，调用 init_db()
- 配置 CORSMiddleware，允许 http://localhost:5173
- include_router(routers.jobs.router, prefix="/api")
- include_router(routers.crawl.router, prefix="/api")

创建 **api/routers/jobs.py**:
- Pydantic 响应模型：JobOut / JobListResponse / JobStats
- GET /api/jobs: 分页查询
  - Query: keyword, city, education, company_type, source, page=1, page_size=50
  - 查询 Job 表：动态构建 filter，like 模糊搜索 keyword（title/company/jd_text）
  - 返回 {items, total, page, page_size}
- GET /api/jobs/{job_id}: 单条详情，不存在返回 404
- GET /api/jobs/stats: {total_jobs, today_new, sources}
  - total_jobs = session.query(func.count(Job.id)).scalar()
  - today_new = 今日 00:00 以后 publish_date 或 created_at 的数量
  - sources = 按 source group by 统计数量字典

创建 **api/routers/crawl.py**:
- POST /api/crawl/trigger/{source}: 手动触发采集
  - get_crawler(source) 拿到爬虫实例
  - 使用 FastAPI `BackgroundTasks` 调用 scheduler 中共用的 `run_crawl_task`，不要把请求级数据库会话传入后台任务
  - 返回 {status: "triggered", source}
- GET /api/crawl/logs: CrawlLog 分页列表

---

## Task 1.7 — 定时调度器

创建 **crawlers/scheduler.py**:
```python
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import yaml
from database.session import SessionLocal
from pipeline import process_pipeline
from crawlers import get_crawler
from database.models import CrawlLog
from datetime import datetime, timezone

scheduler = AsyncIOScheduler(timezone="Asia/Shanghai")

async def run_crawl_task(source_name: str):
    """执行单个渠道的采集任务，并写入 CrawlLog"""
    crawler = get_crawler(source_name)
    if not crawler:
        return
    start = datetime.now(timezone.utc)
    with SessionLocal() as db:
        try:
            items = await crawler.crawl()
            result = await process_pipeline(items, db)
            db.add(CrawlLog(source=source_name, status="success",
                            new_count=result["new"],
                            duration_sec=(datetime.now(timezone.utc)-start).total_seconds()))
            db.commit()
        except Exception as exc:
            db.rollback()
            db.add(CrawlLog(source=source_name, status="failed",
                            error_msg=str(exc)[:500],
                            duration_sec=(datetime.now(timezone.utc)-start).total_seconds()))
            db.commit()

def setup_scheduler():
    """从 config/sources.yaml 读取并注册 cron job"""
    with open("config/sources.yaml", "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    for src, info in cfg.get("sources", {}).items():
        if info.get("enabled"):
            trigger = CronTrigger.from_crontab(info["schedule"], timezone="Asia/Shanghai")
            scheduler.add_job(run_crawl_task, trigger, args=[src],
                              id=f"crawl_{src}", replace_existing=True)

if __name__ == "__main__":
    setup_scheduler()
    scheduler.start()
    asyncio.get_event_loop().run_forever()
```

创建 **crawlers/incremental.py** (简易位点记录器):
```python
import json, os
FILE = "data/incremental_state.json"

def load_state() -> dict:
    os.makedirs(os.path.dirname(FILE), exist_ok=True)
    if os.path.exists(FILE):
        with open(FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_source_state(source: str, state: dict):
    data = load_state()
    data[source] = state
    tmp = f"{FILE}.tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, FILE)

def get_source_state(source: str) -> dict:
    return load_state().get(source, {})
```

写入位点时先写同目录临时文件，再用 `os.replace()` 原子替换目标文件，避免进程中断留下半截 JSON。

---

## Task 1.8 — 前端项目

在 web/ 目录初始化 Vue3 + Vite + TypeScript 项目。创建全部基础文件。

**web/package.json**:
```json
{
  "name": "job-radar-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4",
    "vue-router": "^4.3",
    "element-plus": "^2.7",
    "ag-grid-vue3": "^31.0",
    "axios": "^1.7",
    "pinia": "^2.1",
    "echarts": "^5.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0",
    "typescript": "^5.4",
    "vite": "^5.3",
    "vue-tsc": "^2.0"
  }
}
```

执行 `pnpm install` 生成并提交 `web/pnpm-lock.yaml`；Docker 构建必须复制 lockfile 并使用 `pnpm install --frozen-lockfile`。

**web/vite.config.ts**: Vite 配置：server.proxy = { '/api': { target: 'http://localhost:8000', changeOrigin: true } }

**web/tsconfig.json**, **web/index.html**：标准模板。

**web/src/main.ts**: createApp + Element Plus + Router + Pinia。

**web/src/router/index.ts**:
```
/ → redirect /jobs
/jobs → views/JobList.vue
/jobs/:id → views/JobDetail.vue
```

**web/src/api/index.ts**: axios 实例封装（baseURL=/api），导出：
getJobs(params), getJobDetail(id), getStats(), triggerCrawl(source), getCrawlLogs(params)

**web/src/App.vue**: 顶部导航栏（Logo + 菜单：岗位列表），router-view。

**web/src/views/JobList.vue**:
- 顶部 3 个 ElCard 统计：全年收录岗位、今日新增、最后更新时间
- 筛选工具栏：ElInput 关键词 + ElSelect 城市 + ElSelect 学历 + ElSelect 来源
- AG Grid 表格：列包含 更新日期 | 标签(来源) | 公司 | 行业 | 职位 | 城市 | 学历 | 届数 | 专业
- 分页：ElPagination
- 点击行 → router.push /jobs/:id

**web/src/views/JobDetail.vue**:
- 返回按钮
- 基本信息（标题、公司、城市、学历、薪资、来源链接）
- JD 全文（pre 标签或 Markdown 渲染）

---

## Task 1.9 — Docker Compose

创建 **Dockerfile** (后端):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

创建根目录 **`.dockerignore`**，排除 `.env`、`data/`、`.git/`、虚拟环境、缓存和日志，避免密钥或个人数据进入镜像。

创建 **`web/.dockerignore`**，至少排除 `node_modules/`、`dist/`、`.env*` 和日志。

创建 **web/Dockerfile**:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

创建 **web/nginx.conf**: 前端 nginx 配置，反向代理 /api 到 api:8000。

创建 **docker-compose.yml**:
```yaml
services:
  api:
    build: .
    ports:
      - "127.0.0.1:8000:8000"
    env_file: .env
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    restart: unless-stopped

  scheduler:
    build: .
    command: python -m crawlers.scheduler
    env_file: .env
    volumes:
      - ./data:/app/data
      - ./config:/app/config
    depends_on:
      - api
    restart: unless-stopped

  web:
    build: ./web
    ports:
      - "127.0.0.1:8080:80"
    depends_on:
      - api
    restart: unless-stopped
```

个人本机部署默认仅绑定 `127.0.0.1`。确需局域网或公网访问时，再增加鉴权、HTTPS 和明确的 CORS 白名单后调整绑定地址。

---

## Task 1.10 — 最小自动化测试

创建以下测试，全部使用确定性输入，不访问真实招聘网站：

- `tests/test_pipeline/test_deduplicator.py`：相同岗位去重；同公司同标题但不同城市不去重
- `tests/test_pipeline/test_normalizer.py`：覆盖学历、城市、薪资和届数的核心示例
- `tests/test_api/test_jobs.py`：空库列表、分页参数和不存在岗位返回 404
- `tests/test_crawlers/test_registry.py`：已启用渠道可从注册表获取；Mock 模式默认关闭

测试使用临时 SQLite 数据库，不能读写 `data/jobradar.db`。

---

## 验收标准

1. 项目目录中 requirements.txt / .env.example / config/settings.py / database/models.py / crawlers/base/base_crawler.py / api/main.py / web/package.json / docker-compose.yml / Dockerfile 均已创建
2. 执行 pip install -r requirements.txt 无报错
3. 执行 python -c "from database.seed import init_db; init_db()" 无报错，data/jobradar.db 文件生成
4. uvicorn api.main:app --reload --port 8000 可启动；curl http://localhost:8000/api/jobs/stats 返回 JSON
5. curl -X POST http://localhost:8000/api/crawl/trigger/job51 返回 triggered
6. 前端 cd web && pnpm install && pnpm dev 可启动，http://localhost:5173 看到岗位列表页面
7. `pytest -q` 全部通过，且测试不访问公网、不写入正式数据库
8. `python -c "from apscheduler.triggers.cron import CronTrigger; CronTrigger.from_crontab('*/30 * * * *')"` 无报错
9. docker compose config 能正确解析配置，API 和 Web 默认只绑定 127.0.0.1
10. 未显式设置 `ALLOW_MOCK_DATA=true` 时，Mock 岗位不得入库；Mock 数据不计入真实渠道验收
