-- Migration script to add new tables for Career-Ops integration

-- 1. 扩展 job_listings 表，添加新字段
ALTER TABLE job_listings ADD COLUMN status TEXT DEFAULT 'discovered';
ALTER TABLE job_listings ADD COLUMN score_letter TEXT;
ALTER TABLE job_listings ADD COLUMN score_numeric REAL;
ALTER TABLE job_listings ADD COLUMN evaluation_report TEXT;
ALTER TABLE job_listings ADD COLUMN resume_path TEXT;
ALTER TABLE job_listings ADD COLUMN notes TEXT;
ALTER TABLE job_listings ADD COLUMN discovered_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE job_listings ADD COLUMN applied_at TEXT;
ALTER TABLE job_listings ADD COLUMN interview_at TEXT;
ALTER TABLE job_listings ADD COLUMN offer_at TEXT;

-- 2. 创建扫描配置表
CREATE TABLE IF NOT EXISTS scan_configs (
  id TEXT PRIMARY KEY,
  portal_name TEXT NOT NULL,
  portal_type TEXT NOT NULL,  -- greenhouse/lever/ashby/custom
  url_pattern TEXT NOT NULL,
  keywords TEXT DEFAULT '[]',  -- JSON array
  is_active INTEGER DEFAULT 1,
  last_scanned_at TEXT,
  scan_interval_hours INTEGER DEFAULT 24,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建面试故事表
CREATE TABLE IF NOT EXISTS interview_stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  competency TEXT NOT NULL,  -- leadership/teamwork/problem-solving/etc.
  situation TEXT NOT NULL,
  task TEXT NOT NULL,
  action TEXT NOT NULL,
  result TEXT NOT NULL,
  reflection TEXT,
  tags TEXT DEFAULT '[]',  -- JSON array
  use_count INTEGER DEFAULT 0,
  last_used_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. 创建面试问题表
CREATE TABLE IF NOT EXISTS interview_questions (
  id TEXT PRIMARY KEY,
  job_listing_id TEXT,
  question_text TEXT NOT NULL,
  question_type TEXT,  -- behavioral/technical/situational
  suggested_story_id TEXT,
  user_answer TEXT,
  ai_feedback TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_listing_id) REFERENCES job_listings(id),
  FOREIGN KEY (suggested_story_id) REFERENCES interview_stories(id)
);

-- 5. 创建应用跟踪表（扩展 job_listings 的状态管理）
CREATE TABLE IF NOT EXISTS application_tracker (
  id TEXT PRIMARY KEY,
  job_listing_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'discovered',
  status_history TEXT DEFAULT '[]',  -- JSON array of status changes
  notes TEXT,
  follow_up_date TEXT,
  contact_person TEXT,
  contact_email TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_listing_id) REFERENCES job_listings(id)
);

-- 6. 创建评估权重配置表
CREATE TABLE IF NOT EXISTS evaluation_weights (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_match REAL DEFAULT 0.20,
  level_fit REAL DEFAULT 0.10,
  salary_competitiveness REAL DEFAULT 0.15,
  company_quality REAL DEFAULT 0.10,
  location REAL DEFAULT 0.10,
  industry_match REAL DEFAULT 0.10,
  culture_fit REAL DEFAULT 0.05,
  growth_potential REAL DEFAULT 0.10,
  work_life_balance REAL DEFAULT 0.05,
  personal_preference REAL DEFAULT 0.05,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- 7. 创建简历模板表
CREATE TABLE IF NOT EXISTS resume_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  html_template TEXT NOT NULL,
  css_styles TEXT,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 8. 创建生成的简历表
CREATE TABLE IF NOT EXISTS generated_resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_listing_id TEXT,
  template_id TEXT NOT NULL,
  resume_content TEXT NOT NULL,  -- HTML content
  pdf_path TEXT,
  keywords_injected TEXT DEFAULT '[]',  -- JSON array
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id),
  FOREIGN KEY (job_listing_id) REFERENCES job_listings(id),
  FOREIGN KEY (template_id) REFERENCES resume_templates(id)
);

-- 9. 创建批量处理任务表
CREATE TABLE IF NOT EXISTS batch_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  job_type TEXT NOT NULL,  -- evaluate/resume/scan
  status TEXT DEFAULT 'pending',  -- pending/running/completed/failed
  progress REAL DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  result_data TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- 10. 创建批量处理任务项表
CREATE TABLE IF NOT EXISTS batch_job_items (
  id TEXT PRIMARY KEY,
  batch_job_id TEXT NOT NULL,
  job_listing_id TEXT,
  status TEXT DEFAULT 'pending',  -- pending/running/completed/failed
  result_data TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  FOREIGN KEY (batch_job_id) REFERENCES batch_jobs(id),
  FOREIGN KEY (job_listing_id) REFERENCES job_listings(id)
);