---
📢 Codex 客户端使用说明：
1. ✅ 前置条件：阶段一（prompts/1-阶段一-MVP.md）已全部完成且通过全部验收标准
2. ✅ 确认已用「File → Open Folder」打开 job-radar 目录（AGENTS.md 自动加载）
3. ✅ 阶段一生成的文件在左侧文件树中存在
4. 将本文件全部内容复制粘贴到 Codex 对话框后发送
5. 回复被截断 → 直接回复「请继续」
6. 生成完毕 → 对照底部「验收标准」逐条验证
---
# Phase 2 — AI 匹配引擎 + 推送系统

> **目标**：跑通「上传简历 → AI 画像提取 → JD 向量化 → 匹配评分 → 推送通知」完整闭环
> **前置条件**：Phase 1 已完成（项目骨架、数据库、API、前端基础已就绪）
> **预计新增文件数**：约 20 个

---

## Task 2.1 — 扩展依赖与配置

更新 **requirements.txt**，追加：
```
openai==1.40.*
chromadb==0.5.*
pdfplumber==0.11.*
python-docx==1.1.*
```

更新 **.env.example**，追加：
```
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
```

更新 **config/settings.py**，追加所有新增字段（用 pydantic-settings 读取）。

更新 **docker-compose.yml**，追加 chromadb 服务：
```yaml
chromadb:
  image: chromadb/chroma:0.5.23
  ports:
    - "8001:8000"
  volumes:
    - ./data/chroma:/chroma/chroma
  restart: unless-stopped
```
把 api 和 scheduler 服务 depends_on 加上 chromadb，并在两个服务中覆盖容器内地址：

```yaml
environment:
  CHROMA_HOST: chromadb
  CHROMA_PORT: 8000
```

宿主机开发仍使用 `.env.example` 中的 `localhost:8001`。不要让容器内进程访问 `localhost` 上的 ChromaDB。

---

## Task 2.2 — 扩展数据库模型

更新 **database/models.py**，追加 3 个新表：

### Resume 简历表
字段：
- id: int PK
- file_name: str（原始文件名）
- file_path: str（存储路径）
- raw_text: Text（提取的纯文本）
- profile: JSON（AI 解析的用户画像）
- embedding_id: str, nullable（ChromaDB 中的 ID）
- is_default: bool, default False
- created_at: datetime

### Match 匹配记录表
字段：
- id: int PK
- resume_id: int FK（外键关联 Resume.id）
- job_id: int FK（外键关联 Job.id）
- score: float（0.0-5.0 匹配分）
- score_detail: JSON（各维度评分明细）
- match_reason: Text, nullable（AI 生成原因说明）
- is_notified: bool, default False
- created_at: datetime

### Notification 通知记录表
字段：
- id: int PK
- match_id: int FK
- channel: str（email/wechat/dingtalk/web）
- status: str（sent/failed）
- content: Text
- created_at: datetime

更新 **database/seed.py**，确保新加的表也会被 create_all 创建。

---

## Task 2.3 — 简历解析模块

创建 matching 目录结构：
- matching/__init__.py（空）

创建 **matching/resume_parser.py**:
```python
class ResumeParser:
    """简历解析器：文件 → 纯文本 → 结构化画像"""

    def parse_file(self, file_path: str) -> str:
        """根据扩展名解析 PDF 或 DOCX → 纯文本
        - PDF: pdfplumber.open(path)，pages 叠加 extract_text()
        - DOCX: python-docx Document(path)，paragraphs 叠加 text
        """
        ...

    async def extract_profile(self, resume_text: str) -> dict:
        """调用 LLM 将简历文本解析为结构化画像 JSON：
        {
          "name": "", "education": "本科", "school": "", "major": "",
          "graduation_year": "27届", "skills": ["Python", "Vue"],
          "experience_years": 0, "preferred_cities": ["北京"],
          "preferred_roles": ["后端开发"], "preferred_industries": ["互联网"],
          "self_summary": "一句话总结"
        }
         使用 `AsyncOpenAI`，调用 CHAT_MODEL，并请求 `response_format={"type": "json_object"}`。
         Prompt 使用任务书中的简历解析 Prompt；对返回 JSON 做 Pydantic/字段白名单校验，缺失字段填默认值。
         每次请求使用上下文管理或复用单例客户端，不能在循环中泄漏 HTTP 连接。
        """
        ...
```

---

## Task 2.4 — JD 解析 + 向量化引擎

创建 **matching/jd_parser.py**:
```python
class JDParser:
    """岗位描述解析"""

    SKILL_KEYWORDS = [
        "Python","Java","JavaScript","TypeScript","Vue","React","Angular","Node.js",
        "Go","Rust","C++","C#","Kotlin","Swift","Flutter","Dart","MySQL","PostgreSQL",
        "MongoDB","Redis","Kafka","RabbitMQ","Elasticsearch","Docker","Kubernetes",
        "AWS","Azure","GCP","Linux","Nginx","FastAPI","Django","Spring Boot",
        "PyTorch","TensorFlow","LLM","Embedding","RAG","Prompt Engineering",
        "Hadoop","Spark","Flink","Hive","数据仓库","数据分析","SQL","Excel"
    ]

    def extract_skills(self, jd_text: str) -> list[str]:
        """从 JD 文本匹配 SKILL_KEYWORDS，返回去重后的技能列表"""
        ...

    async def structure_jd(self, jd_text: str) -> dict:
        """LLM 结构化 JD → {responsibilities, requirements, location, salary}"""
        # 可选实现，如不做 LLM 可返回 {"responsibilities": jd_text}
        ...
```

创建 **matching/embedding_engine.py**:
```python
from openai import AsyncOpenAI
import chromadb
from config import settings

class EmbeddingEngine:
    """向量化引擎：文本 → embedding → ChromaDB"""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init()
        return cls._instance

    def _init(self):
        self.llm = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url=settings.OPENAI_BASE_URL,
        )
        # ChromaDB Http 客户端连接 CHROMA_HOST:CHROMA_PORT
        self.chroma = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        self.jobs_coll = self.chroma.get_or_create_collection("jobs")
        self.resumes_coll = self.chroma.get_or_create_collection("resumes")

    async def embed_text(self, text: str) -> list[float]:
        resp = await self.llm.embeddings.create(
            model=settings.EMBEDDING_MODEL, input=text[:8000]
        )
        return resp.data[0].embedding

    async def add_job_embedding(self, job_id: int, jd_text: str):
        """岗位 JD 向量化并存入 jobs collection，id=str(job_id)"""
        vec = await self.embed_text(jd_text[:8000])
        self.jobs_coll.upsert(ids=[str(job_id)], embeddings=[vec], documents=[jd_text[:8000]])

    async def add_resume_embedding(self, resume_id: int, resume_text: str):
        vec = await self.embed_text(resume_text[:8000])
        self.resumes_coll.upsert(ids=[str(resume_id)], embeddings=[vec], documents=[resume_text[:8000]])
        return f"resume_{resume_id}"

    async def ensure_job_embeddings(self, jobs) -> None:
        """只为 ChromaDB 中缺失的岗位建立向量，避免每次匹配重复计费。"""
        existing = set(self.jobs_coll.get()["ids"])
        for job in jobs:
            if str(job.id) not in existing:
                await self.add_job_embedding(job.id, job.jd_clean or job.jd_text or job.title)

    async def search_similar_jobs(self, resume_text: str, top_k: int = 50) -> list[dict]:
        """用简历文本向量在 jobs collection 中搜索 Top K 相似岗位
        返回: [{job_id:int, similarity:float}]
        """
        vec = await self.embed_text(resume_text[:8000])
        res = self.jobs_coll.query(query_embeddings=[vec], n_results=top_k)
        out = []
        for idx, jid in enumerate(res["ids"][0]):
            dist = res["distances"][0][idx]
            sim = max(0.0, 1.0 - dist) if dist > 0 else 1.0
            out.append({"job_id": int(jid), "similarity": round(sim, 4)})
        return out
```

---

## Task 2.5 — 匹配引擎

创建 **matching/similarity_scorer.py**:
```python
from matching.embedding_engine import EmbeddingEngine

class SimilarityScorer:
    async def coarse_filter(self, resume_text: str, top_k=50) -> list[int]:
        """向量粗筛 → 返回 Top K job_id list 按相似度降序"""
        hits = await EmbeddingEngine().search_similar_jobs(resume_text, top_k)
        return [h["job_id"] for h in hits]
```

创建 **matching/llm_scorer.py**:
```python
from openai import AsyncOpenAI
from config import settings
import json

class LLMScorer:
    """LLM 精细评分"""

    PROMPT = """你是一个专业的人岗匹配评估专家。
候选人画像：
{resume_profile}
岗位信息：
{job_detail}
请评估该候选人与岗位的匹配度，输出 JSON：
{{
  "score": 0.0-5.0,
  "dimensions": {{
    "education_match": 0-5,
    "skill_match": 0-5,
    "experience_match": 0-5,
    "location_match": 0-5,
    "major_match": 0-5
  }},
  "reason": "一句话原因",
  "highlights": ["亮点1", "亮点2"]
}}
只输出 JSON，不要其他文字。"""

    async def score(self, resume_profile: dict, job_detail: dict) -> dict:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL)
        msg = self.PROMPT.format(
            resume_profile=json.dumps(resume_profile, ensure_ascii=False, indent=2),
            job_detail=json.dumps(job_detail, ensure_ascii=False, indent=2),
        )
        resp = await client.chat.completions.create(
            model=settings.CHAT_MODEL,
            messages=[{"role": "user", "content": msg}],
            temperature=0.0,
        )
        txt = resp.choices[0].message.content.strip()
        # 去除 `json 包裹
        if "`json" in txt:
            txt = txt.split("`json")[1].split("`")[0]
        try:
            return json.loads(txt)
        except Exception:
            return {"score": 0, "dimensions": {}, "reason": "解析失败", "highlights": []}
```

创建 **matching/match_engine.py**:
```python
from database.session import SessionLocal
from database.models import Resume, Job, Match
from matching.resume_parser import ResumeParser
from matching.similarity_scorer import SimilarityScorer
from matching.llm_scorer import LLMScorer
from matching.embedding_engine import EmbeddingEngine
from matching.jd_parser import JDParser
from push.push_manager import PushManager

class MatchEngine:
    """匹配调度入口"""

    async def run_matching(self, resume_id: int = None):
        """对简历执行完整匹配流程。
        resume_id 为 None 则用默认简历。
        返回匹配数量。
        """
        db = SessionLocal()
        resume = db.query(Resume).filter(
            (Resume.id == resume_id) if resume_id else (Resume.is_default == True)
        ).first()
        if not resume:
            db.close()
            return 0
        profile = resume.profile or {}
        # 1. 首次匹配前补齐历史岗位向量，后续只处理新增岗位
        embedding_engine = EmbeddingEngine()
        await embedding_engine.ensure_job_embeddings(db.query(Job).all())
        # 2. 向量粗筛 Top 50
        scorer = SimilarityScorer()
        candidate_ids = await scorer.coarse_filter(resume.raw_text or "", top_k=50)
        # 3. 硬性条件过滤
        candidate_jobs = db.query(Job).filter(Job.id.in_(candidate_ids)).all()
        passed = [j for j in candidate_jobs if self._hard_filter_pass(profile, j)]
        # 4. LLM 精细评分
        llm = LLMScorer()
        parser = JDParser()
        written = 0
        for job in passed:
            job_detail = {
                "id": job.id, "title": job.title, "company": job.company,
                "city": job.city, "education": job.education,
                "salary": job.salary, "major_required": job.major_required,
                "graduation_year": job.graduation_year, "skills": parser.extract_skills(job.jd_text or job.jd_clean or ""),
                "jd": (job.jd_clean or job.jd_text or "")[:2000],
            }
            result = await llm.score(profile, job_detail)
            # 检查是否已匹配过
            exist = db.query(Match).filter_by(resume_id=resume.id, job_id=job.id).first()
            if exist:
                continue
            m = Match(
                resume_id=resume.id, job_id=job.id,
                score=max(0.0, min(5.0, result.get("score", 0))),
                score_detail=result.get("dimensions", {}),
                match_reason=result.get("reason", ""),
                is_notified=False,
            )
            db.add(m)
            db.flush()
            # 4. 高分 → 触发推送
            if m.score >= 4.0:
                try:
                    sent_count = await PushManager.push_match(db, m, profile, job)
                    m.is_notified = sent_count > 0
                except Exception:
                    pass
            written += 1
        db.commit()
        db.close()
        return written

    async def match_single_job(self, job_id: int):
        """新增岗位入库后触发：对该岗位增量匹配所有简历。
        找到所有活跃简历 → 计算匹配分 → 高分推送。
        """
        db = SessionLocal()
        job = db.get(Job, job_id)
        if not job:
            db.close()
            return
        # 查询所有活跃简历
        resumes = db.query(Resume).all()
        if not resumes:
            db.close()
            return
        engine = EmbeddingEngine()
        llm = LLMScorer()
        parser = JDParser()
        # 为该岗位生成 embedding（首次）
        try:
            await engine.add_job_embedding(job.id, job.jd_clean or job.jd_text or job.title)
        except Exception:
            pass
        job_detail = {
            "id": job.id, "title": job.title, "company": job.company,
            "city": job.city, "education": job.education,
            "salary": job.salary, "major_required": job.major_required,
            "graduation_year": job.graduation_year,
            "skills": parser.extract_skills(job.jd_text or job.jd_clean or ""),
            "jd": (job.jd_clean or job.jd_text or "")[:2000],
        }
        for resume in resumes:
            profile = resume.profile or {}
            if not self._hard_filter_pass(profile, job):
                continue
            result = await llm.score(profile, job_detail)
            exist = db.query(Match).filter_by(resume_id=resume.id, job_id=job.id).first()
            if exist:
                continue
            m = Match(
                resume_id=resume.id, job_id=job.id,
                score=max(0.0, min(5.0, result.get("score", 0))),
                score_detail=result.get("dimensions", {}),
                match_reason=result.get("reason", ""),
                is_notified=False,
            )
            db.add(m)
            db.flush()
            if m.score >= 4.0:
                try:
                    sent_count = await PushManager.push_match(db, m, profile, job)
                    m.is_notified = sent_count > 0
                except Exception:
                    pass
        db.commit()
        db.close()

    def _hard_filter_pass(self, profile: dict, job: Job) -> bool:
        """硬性条件过滤器：学历/届数明显不满足的直接排除。
        条件不满足返回 False。
        """
        education = profile.get("education") or ""
        edu_rank = {"博士": 5, "硕士": 4, "本科": 3, "大专": 2, "高中": 1}
        # 学历
        if job.education and education and education in edu_rank and job.education in edu_rank:
            if edu_rank[education] < edu_rank[job.education]:
                return False
        # 届数：岗位限制届数 > 简历届数时过滤
        gy = profile.get("graduation_year") or ""
        jgy = job.graduation_year or ""
        if gy and jgy:
            try:
                gy_num = int(gy.replace("届",""))
                jgy_num = int(jgy.replace("届","").split("-")[0].split("/")[0])
                if abs(gy_num - jgy_num) > 2:
                    return False
            except Exception:
                pass
        return True
```

上面示例中的 `SessionLocal` 在实际实现中必须用 `try/finally` 关闭；异常路径也不能泄漏连接。

---

## Task 2.6 — API 接口扩展

创建 **api/routers/resume.py**:
- POST /api/resume/upload (multipart/form-data, file)
  - 只允许 PDF/DOCX，限制文件大小（默认 10 MB）；使用 `Path(filename).name` 或随机 UUID 生成安全文件名，禁止用户输入参与目录拼接
  - 保存到 `data/uploads/`，该目录不由静态文件服务暴露
  - ResumeParser.parse_file → raw_text
  - ResumeParser.extract_profile → profile JSON
  - 先创建 Resume 并 `flush()` 获取 id，再调用 EmbeddingEngine，成功后写入 embedding_id 并提交；任一步失败都 rollback 并删除已上传文件/向量
  - 若无默认简历则 is_default=True
  - 返回 {id, profile}
- GET /api/resume/list → 简历列表（不含 raw_text 全文）
- GET /api/resume/{id} → 简历详情（含画像）
- DELETE /api/resume/{id} → 删除（注意处理 is_default）
- PUT /api/resume/{id}/default → 设为默认简历

创建 **api/routers/matching.py**:
- POST /api/match/trigger (body: {resume_id?: int}) → 返回 {matched: N}
- GET /api/match/results (query: resume_id?, min_score=0, page=1, page_size=50)
  - 关联 Job 表；返回匹配列表按 score 降序；包含岗位基本信息 + 匹配分 + 原因 + highlights

创建 **api/routers/subscription.py**:
- GET /api/subscription → 列表
- POST /api/subscription → 创建 {name, resume_id, keywords, cities, min_score, channels(JSON)}
- PUT /api/subscription/{id} → 更新
- DELETE /api/subscription/{id} → 删除
- PUT /api/subscription/{id}/toggle → 启用/停用

创建 **api/routers/notification.py**:
- GET /api/notifications (query: page, page_size, channel?) → 通知列表

更新 **api/main.py** include_router 新增所有新增 router。

---

## Task 2.7 — 推送系统

创建 push 目录：push/__init__.py（空）

创建 **push/email_pusher.py**:
```python
import smtplib
import asyncio
from html import escape
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import settings

class EmailPusher:
    def _send(self, to_email: str, subject: str, html: str):
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_USER
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html", "utf-8"))
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as s:
            s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            s.sendmail(settings.SMTP_USER, [to_email], msg.as_string())

    async def send_single(self, to_email: str, job, match):
        """发送单条高匹配岗位 HTML 邮件"""
        html = f"""
        <div style="padding:20px; font-family:sans-serif;">
           <h3>⭐⭐⭐⭐⭐ {escape(job.title or "")}</h3>
           <p><strong>公司：</strong>{escape(job.company or "")}<br>
              <strong>城市：</strong>{escape(job.city or "")}<br>
              <strong>学历：</strong>{escape(job.education or "")}<br>
              <strong>薪资：</strong>{escape(job.salary or "")}</p>
          <p><strong>匹配度：</strong>{match.score}/5.0</p>
          <p><strong>匹配原因：</strong>{match.match_reason}</p>
          <p><a href="{job.source_url}">查看详情</a></p>
        </div>"""
        await asyncio.to_thread(self._send, to_email, f"[JobRadar] 高匹配岗位：{job.title} @ {job.company}", html)

    async def send_summary(self, to_email: str, items: list):
        """items: [{job, match}] 发送每日汇总"""
        body = "<h3>📊 今日匹配汇总</h3>"
        for it in items:
            job, match = it["job"], it["match"]
            body += f"""
            <div style="margin:10px 0; padding:12px; border:1px solid #eee; border-radius:8px;">
              <h4>{job.title} @ {job.company} | 匹配度 {match.score}/5.0</h4>
              <p>城市: {job.city} | 学历: {job.education} | 薪资: {job.salary}</p>
              <p>原因：{match.match_reason}</p>
            </div>"""
        await asyncio.to_thread(self._send, to_email, f"[JobRadar] 今日匹配汇总：{len(items)} 个新岗位", body)
```

创建 **push/wechat_pusher.py**（Server酱）:
```python
import httpx
from config import settings

class WechatPusher:
    async def send(self, title: str, content: str):
        key = settings.SERVERCHAN_KEY
        if not key or key.startswith("SCT") and "xxx" in key:
            return  # 未配置跳过
        async with httpx.AsyncClient(timeout=20) as client:
            url = f"https://sctapi.ftqq.com/{key}.send"
            r = await client.post(url, data={"title": title, "desp": content})
            r.raise_for_status()
```

创建 **push/dingtalk_pusher.py**（钉钉机器人）:
```python
import time, hmac, hashlib, base64, urllib.parse
import httpx
from config import settings

class DingtalkPusher:
    async def send(self, title: str, content: str):
        if not settings.DINGTALK_WEBHOOK or "xxx" in settings.DINGTALK_WEBHOOK:
            return
        timestamp = str(round(time.time() * 1000))
        secret = settings.DINGTALK_SECRET or ""
        sign = ""
        if secret:
            string_to_sign = f"{timestamp}\n{secret}"
            h = hmac.new(secret.encode("utf-8"), string_to_sign.encode("utf-8"), digestmod=hashlib.sha256)
            sign = urllib.parse.quote_plus(base64.b64encode(h.digest()))
        url = settings.DINGTALK_WEBHOOK
        if sign:
            url += f"&timestamp={timestamp}&sign={sign}"
        payload = {
            "msgtype": "markdown",
            "markdown": {"title": title, "text": f"## {title}\n\n{content}"},
        }
        async with httpx.AsyncClient(timeout=20) as c:
            response = await c.post(url, json=payload)
            response.raise_for_status()
```

创建 **push/push_manager.py**:
```python
from push.email_pusher import EmailPusher
from push.wechat_pusher import WechatPusher
from push.dingtalk_pusher import DingtalkPusher
from database.models import Subscription, Notification

class PushManager:
    @staticmethod
    async def push_match(db, match, resume_profile: dict, job):
        """匹配记录 → 根据订阅配置推送"""
        # 查询所有关联该简历的活跃订阅
        subs = db.query(Subscription).filter_by(is_active=True).all()
        if match.resume_id:
            subs = [s for s in subs if not s.resume_id or s.resume_id == match.resume_id]
        notified_channels = []
        for sub in subs:
            if match.score < (sub.min_score or 3.0):
                continue
            channels = (sub.channels or {}).get("list") or []
            content = f"""
**{job.title}** @ **{job.company}**
- 匹配度：**{match.score}/5.0**
- 城市：{job.city} | 学历：{job.education} | 薪资：{job.salary}
- 原因：{match.match_reason or ""}
- [查看详情]({job.source_url})
"""
            if not channels:
                channels = ["email"]
            for ch in channels:
                try:
                    if ch == "email":
                        from config import settings as s
                        to = s.NOTIFY_EMAIL
                        if to and "qq.com" in to:
                            await EmailPusher().send_single(to, job, match)
                            notified_channels.append("email")
                    elif ch == "wechat":
                        await WechatPusher().send(f"[JobRadar 高匹配] {job.title}", content)
                        notified_channels.append("wechat")
                    elif ch == "dingtalk":
                        await DingtalkPusher().send(f"[JobRadar 高匹配] {job.title}", content)
                        notified_channels.append("dingtalk")
                except Exception as e:
                    n = Notification(match_id=match.id, channel=ch, status="failed",
                                     content=f"Error: {str(e)[:500]}")
                    db.add(n)
        for ch in notified_channels:
            n = Notification(match_id=match.id, channel=ch, status="sent", content="ok")
            db.add(n)
        # 由 MatchEngine 使用同一个会话统一提交，避免未提交 Match 被另一个会话引用。
        return len(notified_channels)

```

每日汇总暂不在本阶段创建或调度；只有实现查询、幂等标记和失败重试后，才在稳定性阶段接入。

---

## Task 2.8 — 增量匹配触发

更新 **pipeline/storage.py** 的 store_jobs() 函数：
- 每成功添加一个新 Job 后，获取其 ID
- 在函数返回前，批量触发增量匹配：
  ```python
  async def trigger_incremental(job_ids: list[int]):
      from matching.match_engine import MatchEngine
      for jid in job_ids:
          await MatchEngine().match_single_job(jid)
  import asyncio
  asyncio.create_task(trigger_incremental(new_job_ids))
  ```
  （不阻塞入库流程）

---

## Task 2.9 — WebSocket 实时推送

创建 **api/websocket.py**:
```python
from fastapi import WebSocket, APIRouter, WebSocketDisconnect

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.connections: list[WebSocket] = []
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.connections.append(ws)
    def disconnect(self, ws: WebSocket):
        try: self.connections.remove(ws)
        except ValueError: pass
    async def broadcast(self, data: dict):
        for ws in list(self.connections):
            try: await ws.send_json(data)
            except Exception: self.disconnect(ws)

manager = ConnectionManager()

@router.websocket("/ws/notifications")
async def ws_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # 等待保持连接
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

在 **api/main.py** 中 router 注册 api.websocket.router （注意：WebSocket router 不加 prefix=/api 也行，直接挂载 app）。

在 **push/push_manager.py** 中 push_match() 方法最后追加：
```python
from api.websocket import manager as ws_manager
await ws_manager.broadcast({
    "type": "new_match",
    "job_id": job.id,
    "title": job.title,
    "company": job.company,
    "score": match.score,
    "reason": match.match_reason,
})
```

---

## Task 2.10 — 前端：简历上传 + 匹配结果 + 设置页面

创建/更新以下文件：

### web/src/api/matching.ts
封装 axios：uploadResume(file), getResumes(), getResumeDetail(id), setDefaultResume(id), triggerMatch(resumeId?), getMatchResults(params), getSubscriptions(), createSubscription(data), updateSubscription(id,data), deleteSubscription(id), toggleSubscription(id), getNotifications(params)

### web/src/views/ResumeUpload.vue
- 文件拖拽上传区（el-upload + drag）
- 支持 PDF/DOCX
- 上传后展示：画像卡片（姓名/学历/学校/专业/技能标签/期望城市/期望岗位）
- 「设为默认」按钮
- 简历列表（多份切换）

### web/src/views/MatchResult.vue
- 顶部：匹配统计 + 重新匹配按钮（调用 triggerMatch）
- 列表按匹配分降序：岗位卡片（标题/公司/星级评分组件/匹配原因/各维度评分条形图）
- 点击跳转岗位详情

### web/src/views/Settings.vue
- 订阅规则 CRUD
- 配置：关键词、城市、最低匹配分、推送渠道（邮件/微信/钉钉/站内 多选复选框）

### router/index.ts
新增路由：/resume → ResumeUpload；/matches → MatchResult；/settings → Settings

### App.vue
新增导航菜单：匹配结果、简历管理、设置

---

## 验收标准

1. requirements.txt 已添加 openai/chromadb/pdfplumber/python-docx
2. database/models.py 新增 Resume/Match/Notification 3 个表
3. 上传 PDF 简历接口返回结构化 profile JSON
4. POST /api/match/trigger 返回匹配数量 > 0（需要有岗位数据 + 上传简历）
5. 匹配分 ≥ 4.0 的岗位：邮件/微信至少一个渠道能收到通知
6. 前端简历上传页可上传文件并展示画像卡片
7. 匹配结果页可见匹配星级和评分原因
8. WebSocket 连接后，新增高匹配岗位时前端可收到消息
9. 订阅配置接口 CRUD 可用
10. 首次匹配会先补齐历史岗位向量；重复触发不会重复创建 Match 或 Notification
11. 上传路径遍历、超大文件、非 PDF/DOCX 文件均返回 4xx，且失败不会留下文件或向量
12. SMTP 等同步 I/O 不阻塞事件循环；推送失败会记录 failed，未成功发送时 `is_notified` 保持 false
