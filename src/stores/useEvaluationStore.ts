import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  EvaluationResult,
  EvaluationWeights,
  EvaluationDimension,
  DEFAULT_EVALUATION_WEIGHTS,
} from "../services/ai/AIServiceAdapter";
import {
  evaluationEngine,
  EvaluationConfig,
  DEFAULT_EVALUATION_CONFIG,
} from "../services/ai/EvaluationEngine";
import { JobListing, UserProfile } from "../services/ai/AIServiceAdapter";

interface EvaluationState {
  // 评估结果
  evaluations: EvaluationResult[];
  currentEvaluation: EvaluationResult | null;

  // 评估配置
  weights: EvaluationWeights;
  config: EvaluationConfig;

  // 批量评估
  batchQueue: {
    jobId: string;
    status: "pending" | "evaluating" | "completed" | "failed";
    result?: EvaluationResult;
    error?: string;
  }[];
  isBatchEvaluating: boolean;
  batchProgress: number;

  // Actions
  setEvaluations: (evaluations: EvaluationResult[]) => void;
  addEvaluation: (evaluation: EvaluationResult) => Promise<void>;
  updateEvaluation: (
    id: string,
    updates: Partial<EvaluationResult>,
  ) => Promise<void>;
  deleteEvaluation: (id: string) => Promise<void>;
  setCurrentEvaluation: (evaluation: EvaluationResult | null) => void;

  // 评估操作
  evaluateJob: (
    job: JobListing,
    profile: UserProfile,
    cv: string,
  ) => Promise<EvaluationResult>;
  batchEvaluate: (
    jobs: JobListing[],
    profile: UserProfile,
    cv: string,
    onProgress?: (completed: number, total: number) => void,
  ) => Promise<void>;

  // 配置更新
  updateWeights: (weights: Partial<EvaluationWeights>) => void;
  updateConfig: (config: Partial<EvaluationConfig>) => void;
  resetWeights: () => void;

  // 推荐职位
  getRecommendedJobs: (threshold?: number) => EvaluationResult[];
  getStronglyRecommendedJobs: () => EvaluationResult[];

  // 从后端加载
  loadFromBackend: () => Promise<void>;

  // 获取评估统计
  getStats: () => {
    total: number;
    averageScore: number;
    byLetter: { [key: string]: number };
  };
}

export const useEvaluationStore = create<EvaluationState>((set, get) => ({
  evaluations: [],
  currentEvaluation: null,
  weights: DEFAULT_EVALUATION_WEIGHTS,
  config: DEFAULT_EVALUATION_CONFIG,
  batchQueue: [],
  isBatchEvaluating: false,
  batchProgress: 0,

  setEvaluations: (evaluations) => set({ evaluations }),

  addEvaluation: async (evaluation) => {
    try {
      await window.electronAPI.saveEvaluation(evaluation);
      set((state) => ({
        evaluations: [evaluation, ...state.evaluations],
      }));
    } catch (error) {
      console.error("Failed to save evaluation:", error);
    }
  },

  updateEvaluation: async (id, updates) => {
    try {
      set((state) => ({
        evaluations: state.evaluations.map((e) =>
          e.id === id ? { ...e, ...updates } : e,
        ),
        currentEvaluation:
          state.currentEvaluation?.id === id
            ? { ...state.currentEvaluation, ...updates }
            : state.currentEvaluation,
      }));
    } catch (error) {
      console.error("Failed to update evaluation:", error);
    }
  },

  deleteEvaluation: async (id) => {
    try {
      await window.electronAPI.deleteEvaluation(id);
      set((state) => ({
        evaluations: state.evaluations.filter((e) => e.id !== id),
        currentEvaluation:
          state.currentEvaluation?.id === id ? null : state.currentEvaluation,
      }));
    } catch (error) {
      console.error("Failed to delete evaluation:", error);
    }
  },

  setCurrentEvaluation: (evaluation) => set({ currentEvaluation: evaluation }),

  evaluateJob: async (job, profile, cv) => {
    try {
      const result = await evaluationEngine.evaluateJob(job, profile, cv);
      get().addEvaluation(result);
      return result;
    } catch (error) {
      console.error("Evaluation failed:", error);
      throw error;
    }
  },

  batchEvaluate: async (jobs, profile, cv, onProgress) => {
    set({ isBatchEvaluating: true, batchProgress: 0 });

    const queue = jobs.map((job) => ({
      jobId: job.id,
      status: "pending" as const,
    }));

    set({ batchQueue: queue });

    try {
      const results = await evaluationEngine.batchEvaluate(
        jobs,
        profile,
        cv,
        (completed, total) => {
          set({ batchProgress: (completed / total) * 100 });
          onProgress?.(completed, total);
        },
      );

      // 更新队列状态
      set((state) => ({
        batchQueue: state.batchQueue.map((item, index) => ({
          ...item,
          status: "completed" as const,
          result: results[index],
        })),
        evaluations: [...results, ...state.evaluations],
      }));
    } catch (error) {
      console.error("Batch evaluation failed:", error);
      set((state) => ({
        batchQueue: state.batchQueue.map((item) => ({
          ...item,
          status: "failed" as const,
          error: error instanceof Error ? error.message : "评估失败",
        })),
      }));
    } finally {
      set({ isBatchEvaluating: false });
    }
  },

  updateWeights: (weights) => {
    set((state) => ({
      weights: { ...state.weights, ...weights },
    }));
    evaluationEngine.updateWeights(weights);
  },

  updateConfig: (config) => {
    set((state) => ({
      config: { ...state.config, ...config },
    }));
    evaluationEngine.updateConfig(config);
  },

  resetWeights: () => {
    set({ weights: DEFAULT_EVALUATION_WEIGHTS });
    evaluationEngine.updateWeights(DEFAULT_EVALUATION_WEIGHTS);
  },

  getRecommendedJobs: (threshold) => {
    const { evaluations, config } = get();
    return evaluationEngine.getRecommendedJobs(evaluations, threshold);
  },

  getStronglyRecommendedJobs: () => {
    const { evaluations } = get();
    return evaluationEngine.getStronglyRecommendedJobs(evaluations);
  },

  loadFromBackend: async () => {
    try {
      const data = await window.electronAPI.getEvaluations();
      set({ evaluations: (data as EvaluationResult[]) || [] });
    } catch (error) {
      console.error("Failed to load evaluations:", error);
    }
  },

  getStats: () => {
    const { evaluations } = get();

    if (evaluations.length === 0) {
      return {
        total: 0,
        averageScore: 0,
        byLetter: {},
      };
    }

    const totalScore = evaluations.reduce((sum, e) => sum + e.overall_score, 0);
    const averageScore = totalScore / evaluations.length;

    const byLetter: { [key: string]: number } = {};
    evaluations.forEach((e) => {
      byLetter[e.overall_letter] = (byLetter[e.overall_letter] || 0) + 1;
    });

    return {
      total: evaluations.length,
      averageScore,
      byLetter,
    };
  },
}));
