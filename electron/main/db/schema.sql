CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  major TEXT NOT NULL,
  education TEXT,
  graduation_year INTEGER,
  personality_mbti TEXT,
  personality_extroversion INTEGER DEFAULT 50,
  personality_openness INTEGER DEFAULT 50,
  personality_conscientiousness INTEGER DEFAULT 50,
  personality_agreeableness INTEGER DEFAULT 50,
  personality_neuroticism INTEGER DEFAULT 50,
  interests TEXT DEFAULT '[]',
  career_goals TEXT,
  risk_preference TEXT DEFAULT 'balanced',
  self_intro TEXT,
  resume_path TEXT,
  resume_text TEXT,
  assessment_unlocked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  industry TEXT NOT NULL,
  scale TEXT DEFAULT 'medium',
  funding_stage TEXT,
  location_city TEXT NOT NULL,
  location_district TEXT,
  stability_score INTEGER DEFAULT 50,
  promotion_clarity INTEGER DEFAULT 50,
  company_type TEXT DEFAULT 'stable',
  regional_score INTEGER DEFAULT 50,
  industry_tags TEXT DEFAULT '[]',
  analysis_result TEXT,
  tags TEXT DEFAULT '[]',
  description TEXT,
  source TEXT DEFAULT 'manual',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT DEFAULT '{}',
  ai_insights TEXT,
  iteration INTEGER DEFAULT 1,
  conversation_snapshot TEXT,
  final_report TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company_id TEXT NOT NULL,
  match_score INTEGER NOT NULL,
  match_reasons TEXT DEFAULT '[]',
  risk_analysis TEXT,
  action_suggestions TEXT,
  source TEXT DEFAULT 'evaluated',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS search_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config TEXT DEFAULT '{}',
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS peer_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  extracted_tags TEXT DEFAULT '[]',
  ability_dimensions TEXT DEFAULT '[]',
  suggestions TEXT,
  ai_summary TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  extracted_text TEXT,
  structured_data TEXT DEFAULT '{}',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

CREATE TABLE IF NOT EXISTS job_listings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  company_id TEXT,
  location_city TEXT,
  location_district TEXT,
  salary TEXT,
  tags TEXT DEFAULT '[]',
  source TEXT NOT NULL,
  source_url TEXT,
  description TEXT,
  requirements TEXT,
  collected_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);
