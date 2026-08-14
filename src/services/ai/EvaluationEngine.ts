import { v4 as uuidv4 } from "uuid";
import {
  JobListing,
  UserProfile,
  EvaluationResult,
  EvaluationDimension,
  EvaluationWeights,
  DEFAULT_EVALUATION_WEIGHTS,
  SCORE_LETTER_MAP,
  IAIService,
  aiService,
} from "./AIServiceAdapter";

export interface EvaluationConfig {
  weights: EvaluationWeights;
  thresholds: {
    auto_reject_below: number;
    recommend_above: number;
    strong_recommend_above: number;
  };
  use_personal_assessment: boolean;
}

export const DEFAULT_EVALUATION_CONFIG: EvaluationConfig = {
  weights: DEFAULT_EVALUATION_WEIGHTS,
  thresholds: {
    auto_reject_below: 2.5,
    recommend_above: 4.0,
    strong_recommend_above: 4.5,
  },
  use_personal_assessment: true,
};

export class EvaluationEngine {
  private aiService: IAIService;
  private config: EvaluationConfig;

  constructor(aiService: IAIService, config?: Partial<EvaluationConfig>) {
    this.aiService = aiService;
    this.config = { ...DEFAULT_EVALUATION_CONFIG, ...config };
  }

  /**
   * 评估职位与候选人的匹配度
   */
  async evaluateJob(
    job: JobListing,
    profile: UserProfile,
    cv: string,
  ): Promise<EvaluationResult> {
    try {
      // 调用AI服务进行评估
      const aiResult = await this.aiService.evaluateJob(job, profile, cv);

      // 如果启用个人评估融合，调整分数
      if (this.config.use_personal_assessment) {
        return this.mergePersonalAssessment(aiResult, profile, job);
      }

      return aiResult;
    } catch (error) {
      console.error("Evaluation failed:", error);
      throw error;
    }
  }

  /**
   * 融合个人评估数据（MBTI、五大人格、霍兰德兴趣）
   */
  private mergePersonalAssessment(
    aiResult: EvaluationResult,
    profile: UserProfile,
    job: JobListing,
  ): EvaluationResult {
    const adjustedDimensions = aiResult.dimensions.map((dim) => {
      let adjustedScore = dim.score;

      // 根据个人评估调整特定维度
      if (dim.name === "行业匹配") {
        adjustedScore = this.calculateIndustryMatch(profile, job);
      } else if (dim.name === "文化匹配") {
        adjustedScore = this.calculateCultureMatch(profile, job);
      }

      return {
        ...dim,
        score: adjustedScore,
        evidence: dim.evidence + this.getPersonalEvidence(dim.name, profile),
      };
    });

    // 重新计算总分
    const overallScore = this.calculateOverallScore(adjustedDimensions);
    const overallLetter = this.scoreToLetter(overallScore);

    return {
      ...aiResult,
      overall_score: overallScore,
      overall_letter: overallLetter,
      dimensions: adjustedDimensions,
    };
  }

  /**
   * 计算行业匹配度（基于霍兰德兴趣）
   */
  private calculateIndustryMatch(
    profile: UserProfile,
    job: JobListing,
  ): number {
    const interests = profile.interests || [];
    const jobTags = job.tags || [];
    const jobDescription = (job.description || "").toLowerCase();

    // 霍兰德兴趣类型与职业的映射
    const interestJobMap: { [key: string]: string[] } = {
      "研究型(R)": ["研究", "分析", "数据", "科学", "技术", "开发"],
      "艺术型(A)": ["设计", "创意", "艺术", "写作", "内容", "媒体"],
      "社会型(S)": ["教育", "咨询", "服务", "人力", "社区", "公益"],
      "企业型(E)": ["管理", "销售", "市场", "创业", "领导", "商业"],
      "常规型(C)": ["财务", "行政", "会计", "文秘", "档案", "数据录入"],
      "现实型(I)": ["工程", "技术", "制造", "维修", "建筑", "操作"],
    };

    let matchScore = 50; // 基础分

    // 检查兴趣与职位匹配
    for (const interest of interests) {
      const keywords = interestJobMap[interest] || [];
      for (const keyword of keywords) {
        if (
          jobTags.some((tag) => tag.includes(keyword)) ||
          jobDescription.includes(keyword)
        ) {
          matchScore += 10;
          break;
        }
      }
    }

    return Math.min(100, Math.max(0, matchScore));
  }

  /**
   * 计算文化匹配度（基于五大人格）
   */
  private calculateCultureMatch(profile: UserProfile, job: JobListing): number {
    const jobDescription = (job.description || "").toLowerCase();
    const jobTags = job.tags || [];
    let matchScore = 50;

    // 开放性高 -> 创新、创业公司
    if (profile.personality_openness && profile.personality_openness > 70) {
      if (
        jobTags.some((tag) => ["创新", "创业", "初创", "科技"].includes(tag)) ||
        jobDescription.includes("创新") ||
        jobDescription.includes("创业")
      ) {
        matchScore += 15;
      }
    }

    // 尽责性高 -> 稳定、大公司
    if (
      profile.personality_conscientiousness &&
      profile.personality_conscientiousness > 70
    ) {
      if (
        jobTags.some((tag) => ["稳定", "大厂", "上市", "国企"].includes(tag)) ||
        jobDescription.includes("稳定") ||
        jobDescription.includes("规范")
      ) {
        matchScore += 15;
      }
    }

    // 外向性高 -> 销售、市场、管理
    if (
      profile.personality_extroversion &&
      profile.personality_extroversion > 70
    ) {
      if (
        jobTags.some((tag) => ["销售", "市场", "管理", "沟通"].includes(tag)) ||
        jobDescription.includes("沟通") ||
        jobDescription.includes("团队")
      ) {
        matchScore += 10;
      }
    }

    // 宜人性高 -> 服务、支持类
    if (
      profile.personality_agreeableness &&
      profile.personality_agreeableness > 70
    ) {
      if (
        jobTags.some((tag) => ["服务", "支持", "客服", "咨询"].includes(tag)) ||
        jobDescription.includes("服务") ||
        jobDescription.includes("客户")
      ) {
        matchScore += 10;
      }
    }

    return Math.min(100, Math.max(0, matchScore));
  }

  /**
   * 获取个人评估证据
   */
  private getPersonalEvidence(
    dimensionName: string,
    profile: UserProfile,
  ): string {
    const evidence: string[] = [];

    if (dimensionName === "行业匹配" && profile.interests?.length) {
      evidence.push(`霍兰德兴趣类型: ${profile.interests.join(", ")}`);
    }

    if (dimensionName === "文化匹配") {
      if (profile.personality_mbti) {
        evidence.push(`MBTI类型: ${profile.personality_mbti}`);
      }
      if (profile.personality_openness) {
        evidence.push(`开放性: ${profile.personality_openness}`);
      }
    }

    return evidence.length > 0 ? ` [个人评估: ${evidence.join("; ")}]` : "";
  }

  /**
   * 计算总体分数
   */
  private calculateOverallScore(dimensions: EvaluationDimension[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const dim of dimensions) {
      weightedSum += dim.score * dim.weight;
      totalWeight += dim.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 分数转等级
   */
  private scoreToLetter(score: number): string {
    for (const [letter, range] of Object.entries(SCORE_LETTER_MAP)) {
      if (score >= range.min && score <= range.max) {
        return letter;
      }
    }
    return "F";
  }

  /**
   * 批量评估
   */
  async batchEvaluate(
    jobs: JobListing[],
    profile: UserProfile,
    cv: string,
    onProgress?: (completed: number, total: number) => void,
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    const total = jobs.length;

    for (let i = 0; i < total; i++) {
      try {
        const result = await this.evaluateJob(jobs[i], profile, cv);
        results.push(result);
        onProgress?.(i + 1, total);
      } catch (error) {
        console.error(`Failed to evaluate job ${jobs[i].id}:`, error);
        // 继续评估其他职位
      }
    }

    return results;
  }

  /**
   * 获取推荐职位
   */
  getRecommendedJobs(
    evaluations: EvaluationResult[],
    threshold?: number,
  ): EvaluationResult[] {
    const minScore = threshold || this.config.thresholds.recommend_above;
    return evaluations
      .filter((e) => e.overall_score >= minScore)
      .sort((a, b) => b.overall_score - a.overall_score);
  }

  /**
   * 获取强烈推荐职位
   */
  getStronglyRecommendedJobs(
    evaluations: EvaluationResult[],
  ): EvaluationResult[] {
    return evaluations
      .filter(
        (e) => e.overall_score >= this.config.thresholds.strong_recommend_above,
      )
      .sort((a, b) => b.overall_score - a.overall_score);
  }

  /**
   * 更新评估权重
   */
  updateWeights(weights: Partial<EvaluationWeights>): void {
    this.config.weights = { ...this.config.weights, ...weights };
  }

  /**
   * 更新评估配置
   */
  updateConfig(config: Partial<EvaluationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): EvaluationConfig {
    return { ...this.config };
  }
}

// 导出默认实例
export const evaluationEngine = new EvaluationEngine(aiService);
