import { v4 as uuidv4 } from "uuid";

// 类型定义
export interface JobListing {
  id: string;
  title: string;
  company: string;
  company_id?: string;
  location_city?: string;
  location_district?: string;
  salary?: string;
  tags?: string[];
  source: string;
  source_url?: string;
  description?: string;
  requirements?: string;
  collected_at?: string;
  status?: string;
  score_letter?: string;
  score_numeric?: number;
  evaluation_report?: string;
  resume_path?: string;
  notes?: string;
  discovered_at?: string;
  applied_at?: string;
  interview_at?: string;
  offer_at?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  major: string;
  education?: string;
  graduation_year?: number;
  personality_mbti?: string;
  personality_extroversion?: number;
  personality_openness?: number;
  personality_conscientiousness?: number;
  personality_agreeableness?: number;
  personality_neuroticism?: number;
  interests?: string[];
  career_goals?: string;
  risk_preference?: string;
  self_intro?: string;
  resume_path?: string;
  resume_text?: string;
  assessment_unlocked?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EvaluationResult {
  id: string;
  job_listing_id: string;
  user_id: string;
  overall_score: number;
  overall_letter: string;
  dimensions: EvaluationDimension[];
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  interview_prep: string[];
  created_at: string;
}

export interface EvaluationDimension {
  name: string;
  score: number;
  weight: number;
  description: string;
  evidence: string;
}

export interface InterviewQuestion {
  id: string;
  job_listing_id: string;
  question_text: string;
  question_type: "behavioral" | "technical" | "situational";
  suggested_story_id?: string;
  user_answer?: string;
  ai_feedback?: string;
  created_at: string;
}

export interface InterviewStory {
  id: string;
  title: string;
  competency: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection?: string;
  tags?: string[];
  use_count: number;
  last_used_at?: string;
  created_at: string;
}

export interface ResumeTemplate {
  id: string;
  name: string;
  description?: string;
  html_template: string;
  css_styles?: string;
  is_default: boolean;
  created_at: string;
}

export interface GeneratedResume {
  id: string;
  user_id: string;
  job_listing_id?: string;
  template_id: string;
  resume_content: string;
  pdf_path?: string;
  keywords_injected?: string[];
  created_at: string;
}

export interface EvaluationWeights {
  skill_match: number;
  level_fit: number;
  salary_competitiveness: number;
  company_quality: number;
  location: number;
  industry_match: number;
  culture_fit: number;
  growth_potential: number;
  work_life_balance: number;
  personal_preference: number;
}

export interface AIServiceConfig {
  provider: "openai" | "claude" | "ollama" | "custom";
  api_key?: string;
  base_url?: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// AI服务适配器接口
export interface IAIService {
  // 评估职位
  evaluateJob(
    job: JobListing,
    profile: UserProfile,
    cv: string,
  ): Promise<EvaluationResult>;

  // 提取关键词
  extractKeywords(jd: string): Promise<string[]>;

  // 生成面试问题
  generateInterviewQuestions(
    job: JobListing,
    cv: string,
  ): Promise<InterviewQuestion[]>;

  // 优化简历
  refineResume(baseCv: string, keywords: string[], jd: string): Promise<string>;

  // 聊天
  chat(messages: ChatMessage[]): Promise<string>;

  // 分析公司
  analyzeCompany(
    companyName: string,
    jobDescription?: string,
  ): Promise<{
    strengths: string[];
    weaknesses: string[];
    culture_fit: number;
    growth_potential: number;
    recommendations: string[];
  }>;

  // 生成STAR故事
  generateSTARStory(
    competency: string,
    context: string,
  ): Promise<InterviewStory>;
}

// 默认评估权重
export const DEFAULT_EVALUATION_WEIGHTS: EvaluationWeights = {
  skill_match: 0.2,
  level_fit: 0.1,
  salary_competitiveness: 0.15,
  company_quality: 0.1,
  location: 0.1,
  industry_match: 0.1,
  culture_fit: 0.05,
  growth_potential: 0.1,
  work_life_balance: 0.05,
  personal_preference: 0.05,
};

// 评分等级映射
export const SCORE_LETTER_MAP: {
  [key: string]: { min: number; max: number; label: string };
} = {
  A: { min: 4.5, max: 5.0, label: "强烈推荐" },
  B: { min: 4.0, max: 4.5, label: "推荐" },
  C: { min: 3.0, max: 4.0, label: "可以考虑" },
  D: { min: 2.0, max: 3.0, label: "不太推荐" },
  F: { min: 0, max: 2.0, label: "不推荐" },
};

// 职位状态枚举
export enum JobStatus {
  DISCOVERED = "discovered",
  EVALUATED = "evaluated",
  APPLIED = "applied",
  PHONE_SCREEN = "phone_screen",
  TECHNICAL_INTERVIEW = "technical_interview",
  ONSITE = "onsite",
  OFFER = "offer",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  WITHDRAWN = "withdrawn",
}

// 状态流转定义
export const STATUS_FLOW: { [key: string]: JobStatus[] } = {
  [JobStatus.DISCOVERED]: [JobStatus.EVALUATED],
  [JobStatus.EVALUATED]: [JobStatus.APPLIED, JobStatus.REJECTED],
  [JobStatus.APPLIED]: [JobStatus.PHONE_SCREEN, JobStatus.REJECTED],
  [JobStatus.PHONE_SCREEN]: [JobStatus.TECHNICAL_INTERVIEW, JobStatus.REJECTED],
  [JobStatus.TECHNICAL_INTERVIEW]: [JobStatus.ONSITE, JobStatus.REJECTED],
  [JobStatus.ONSITE]: [JobStatus.OFFER, JobStatus.REJECTED],
  [JobStatus.OFFER]: [
    JobStatus.ACCEPTED,
    JobStatus.REJECTED,
    JobStatus.WITHDRAWN,
  ],
};

// AI服务工厂
export class AIServiceFactory {
  private static instance: IAIService | null = null;
  private static config: AIServiceConfig | null = null;

  static getInstance(config?: AIServiceConfig): IAIService {
    if (
      !AIServiceFactory.instance ||
      (config &&
        JSON.stringify(config) !== JSON.stringify(AIServiceFactory.config))
    ) {
      AIServiceFactory.config = config || AIServiceFactory.config;
      AIServiceFactory.instance = AIServiceFactory.createService(
        AIServiceFactory.config!,
      );
    }
    return AIServiceFactory.instance;
  }

  private static createService(config: AIServiceConfig): IAIService {
    switch (config.provider) {
      case "openai":
        return new OpenAIService(config);
      case "claude":
        return new ClaudeService(config);
      case "ollama":
        return new OllamaService(config);
      case "custom":
        return new CustomAIService(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }
}

// OpenAI服务实现
class OpenAIService implements IAIService {
  private config: AIServiceConfig;

  constructor(config: AIServiceConfig) {
    this.config = config;
  }

  async evaluateJob(
    job: JobListing,
    profile: UserProfile,
    cv: string,
  ): Promise<EvaluationResult> {
    const prompt = this.buildEvaluationPrompt(job, profile, cv);
    const response = await this.callAPI(prompt);
    return this.parseEvaluationResponse(response, job.id, profile.id);
  }

  async extractKeywords(jd: string): Promise<string[]> {
    const prompt = `请从以下职位描述中提取关键技能和要求，返回JSON数组格式：

职位描述：
${jd}

返回格式：["关键词1", "关键词2", ...]`;

    const response = await this.callAPI(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return response.split(",").map((k) => k.trim());
    }
  }

  async generateInterviewQuestions(
    job: JobListing,
    cv: string,
  ): Promise<InterviewQuestion[]> {
    const prompt = `基于以下职位和简历，生成5个可能的面试问题：

职位：${job.title} @ ${job.company}
职位描述：${job.description || "无"}
简历：${cv}

请返回JSON数组格式，每个问题包含：
- question_text: 问题文本
- question_type: behavioral/technical/situational`;

    const response = await this.callAPI(prompt);
    try {
      const questions = JSON.parse(response);
      return questions.map((q: any) => ({
        id: uuidv4(),
        job_listing_id: job.id,
        question_text: q.question_text,
        question_type: q.question_type,
        created_at: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  async refineResume(
    baseCv: string,
    keywords: string[],
    jd: string,
  ): Promise<string> {
    const prompt = `请优化以下简历，使其更好地匹配职位要求：

原始简历：
${baseCv}

目标职位描述：
${jd}

需要突出的关键词：
${keywords.join(", ")}

请返回优化后的简历内容，保持专业格式。`;

    return await this.callAPI(prompt);
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await window.electronAPI.chatWithAI(messages);
      return response;
    } catch (error) {
      console.error("AI chat failed:", error);
      throw error;
    }
  }

  async analyzeCompany(
    companyName: string,
    jobDescription?: string,
  ): Promise<{
    strengths: string[];
    weaknesses: string[];
    culture_fit: number;
    growth_potential: number;
    recommendations: string[];
  }> {
    const prompt = `请分析以下公司：

公司名称：${companyName}
${jobDescription ? `职位描述：${jobDescription}` : ""}

请返回JSON格式的分析结果：
{
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["劣势1", "劣势2"],
  "culture_fit": 0-100的分数,
  "growth_potential": 0-100的分数,
  "recommendations": ["建议1", "建议2"]
}`;

    const response = await this.callAPI(prompt);
    try {
      return JSON.parse(response);
    } catch {
      return {
        strengths: [],
        weaknesses: [],
        culture_fit: 50,
        growth_potential: 50,
        recommendations: [],
      };
    }
  }

  async generateSTARStory(
    competency: string,
    context: string,
  ): Promise<InterviewStory> {
    const prompt = `请为以下能力维度生成一个STAR故事：

能力维度：${competency}
背景信息：${context}

请返回JSON格式：
{
  "title": "故事标题",
  "situation": "情境描述",
  "task": "任务描述",
  "action": "行动描述",
  "result": "结果描述",
  "reflection": "反思总结"
}`;

    const response = await this.callAPI(prompt);
    try {
      const story = JSON.parse(response);
      return {
        id: uuidv4(),
        title: story.title,
        competency,
        situation: story.situation,
        task: story.task,
        action: story.action,
        result: story.result,
        reflection: story.reflection,
        tags: [competency],
        use_count: 0,
        created_at: new Date().toISOString(),
      };
    } catch {
      throw new Error("Failed to generate STAR story");
    }
  }

  private buildEvaluationPrompt(
    job: JobListing,
    profile: UserProfile,
    cv: string,
  ): string {
    return `请评估以下职位与候选人的匹配度：

职位信息：
- 标题：${job.title}
- 公司：${job.company}
- 地点：${job.location_city || "未知"}
- 薪资：${job.salary || "未知"}
- 描述：${job.description || "无"}
- 要求：${job.requirements || "无"}

候选人信息：
- 姓名：${profile.name}
- 专业：${profile.major}
- 年龄：${profile.age}
- MBTI：${profile.personality_mbti || "未知"}
- 五大人格：外向性${profile.personality_extroversion || 50}，开放性${profile.personality_openness || 50}，尽责性${profile.personality_conscientiousness || 50}，宜人性${profile.personality_agreeableness || 50}，神经质${profile.personality_neuroticism || 50}
- 兴趣：${profile.interests?.join(", ") || "未知"}
- 职业目标：${profile.career_goals || "未知"}

简历内容：
${cv}

请返回JSON格式的评估结果：
{
  "overall_score": 0-5的分数,
  "overall_letter": "A/B/C/D/F",
  "dimensions": [
    {
      "name": "技能匹配度",
      "score": 0-5,
      "weight": 0.20,
      "description": "评估描述",
      "evidence": "评估依据"
    }
  ],
  "summary": "总体评价",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["劣势1", "劣势2"],
  "recommendations": ["建议1", "建议2"],
  "interview_prep": ["面试准备建议1", "面试准备建议2"]
}`;
  }

  private parseEvaluationResponse(
    response: string,
    jobId: string,
    userId: string,
  ): EvaluationResult {
    try {
      // 容错处理：剥离markdown代码块和多余字符
      let jsonStr = response.trim();
      const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) jsonStr = m[1].trim();
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }

      const data = JSON.parse(jsonStr);
      return {
        id: uuidv4(),
        job_listing_id: jobId,
        user_id: userId,
        overall_score: data.overall_score || 3.0,
        overall_letter: data.overall_letter || "C",
        dimensions: data.dimensions || [],
        summary: data.summary || "",
        strengths: data.strengths || [],
        weaknesses: data.weaknesses || [],
        recommendations: data.recommendations || [],
        interview_prep: data.interview_prep || [],
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Parse evaluation response failed:", error);
      // 返回默认评估结果，避免流程中断
      return {
        id: uuidv4(),
        job_listing_id: jobId,
        user_id: userId,
        overall_score: 3.0,
        overall_letter: "C",
        dimensions: [
          {
            name: "技能匹配度",
            score: 3,
            weight: 0.2,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "职级匹配",
            score: 3,
            weight: 0.1,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "薪资竞争力",
            score: 3,
            weight: 0.15,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "公司质量",
            score: 3,
            weight: 0.1,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "地理位置",
            score: 3,
            weight: 0.1,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "行业匹配",
            score: 3,
            weight: 0.1,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "文化匹配",
            score: 3,
            weight: 0.05,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "成长潜力",
            score: 3,
            weight: 0.1,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "工作生活平衡",
            score: 3,
            weight: 0.05,
            description: "待详细评估",
            evidence: "",
          },
          {
            name: "个人偏好",
            score: 3,
            weight: 0.05,
            description: "待详细评估",
            evidence: "",
          },
        ],
        summary: "评估响应解析失败，已使用默认分数",
        strengths: [],
        weaknesses: [],
        recommendations: [],
        interview_prep: [],
        created_at: new Date().toISOString(),
      };
    }
  }

  private async callAPI(prompt: string): Promise<string> {
    try {
      const messages = [{ role: "user" as const, content: prompt }];
      const response = await window.electronAPI.chatWithAI(messages);
      return response;
    } catch (error) {
      console.error("AI API call failed:", error);
      throw error;
    }
  }
}

// Claude服务实现（委托给IPC，后端统一处理）
class ClaudeService extends OpenAIService {}
// Ollama服务实现（委托给IPC，后端统一处理）
class OllamaService extends OpenAIService {}
// 自定义AI服务实现（委托给IPC，后端统一处理）
class CustomAIService extends OpenAIService {}

// 导出默认实例
export const aiService = AIServiceFactory.getInstance({
  provider: "openai",
  model: "gpt-4",
  temperature: 0.7,
  max_tokens: 4096,
});
