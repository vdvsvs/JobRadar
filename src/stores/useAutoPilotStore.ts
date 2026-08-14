import { create } from "zustand";

export type StepId =
  | "parse"
  | "assessment"
  | "search"
  | "evaluate"
  | "company"
  | "track"
  | "resume"
  | "interview";
export type StepStatus = "idle" | "running" | "done" | "error";

export interface LogEntry {
  id: string;
  time: string;
  stepId: StepId;
  type:
    | "info"
    | "ai_call"
    | "ai_response"
    | "tool_call"
    | "success"
    | "warning"
    | "error";
  title: string;
  detail?: string;
  prompt?: string;
  response?: string;
  toolName?: string;
}

export interface StepDef {
  id: StepId;
  label: string;
  description: string;
  status: StepStatus;
  detail?: string;
}

interface Summary {
  jobsFound: number;
  jobsEvaluated: number;
  topJobs: number;
  companiesAnalyzed: number;
  tracksCreated: number;
  resumesGenerated: number;
  storiesGenerated: number;
}

interface AutoPilotState {
  running: boolean;
  currentStep: number;
  steps: StepDef[];
  logs: LogEntry[];
  summary: Summary | null;
  abortRequested: boolean;

  startPipeline: () => void;
  stopPipeline: () => void;
  setCurrentStep: (idx: number) => void;
  updateStep: (id: StepId, updates: Partial<StepDef>) => void;
  addLog: (entry: Omit<LogEntry, "id" | "time">) => void;
  setSummary: (s: Summary) => void;
  reset: () => void;
}

const INITIAL_STEPS: StepDef[] = [
  {
    id: "parse",
    label: "AI 分析简历",
    description: "从简历中提取技能、经历、兴趣等结构化信息",
    status: "idle",
  },
  {
    id: "assessment",
    label: "问卷链路校验",
    description: "检查 MBTI 与霍兰德答题结果，生成职业方向输入",
    status: "idle",
  },
  {
    id: "search",
    label: "智能搜索岗位",
    description: "根据你的资料生成搜索词，搜索匹配岗位（最多50个）",
    status: "idle",
  },
  {
    id: "evaluate",
    label: "AI 评估匹配度",
    description: "对搜索到的岗位进行10维度智能评估",
    status: "idle",
  },
  {
    id: "company",
    label: "企业评估分析",
    description: "对推荐岗位的公司进行深度评估",
    status: "idle",
  },
  {
    id: "track",
    label: "自动创建跟踪",
    description: "为高分岗位自动创建投递跟踪记录",
    status: "idle",
  },
  {
    id: "resume",
    label: "生成优化简历",
    description: "为TOP岗位生成针对性优化简历",
    status: "idle",
  },
  {
    id: "interview",
    label: "生成面试准备",
    description: "为TOP岗位生成STAR故事和面试题",
    status: "idle",
  },
];

let logCounter = 0;

function nowTime(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

export const useAutoPilotStore = create<AutoPilotState>((set, get) => ({
  running: false,
  currentStep: -1,
  steps: INITIAL_STEPS.map((s) => ({ ...s })),
  logs: [],
  summary: null,
  abortRequested: false,

  startPipeline: () => {
    set({
      running: true,
      currentStep: -1,
      steps: INITIAL_STEPS.map((s) => ({ ...s, status: "idle" as StepStatus })),
      logs: [],
      summary: null,
      abortRequested: false,
    });
  },

  stopPipeline: () => {
    set({ abortRequested: true, running: false });
  },

  setCurrentStep: (idx) => set({ currentStep: idx }),

  updateStep: (id, updates) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),

  addLog: (entry) =>
    set((state) => ({
      logs: [
        ...state.logs,
        {
          ...entry,
          id: `log-${++logCounter}`,
          time: nowTime(),
        },
      ],
    })),

  setSummary: (s) => set({ summary: s, running: false }),

  reset: () =>
    set({
      running: false,
      currentStep: -1,
      steps: INITIAL_STEPS.map((s) => ({ ...s })),
      logs: [],
      summary: null,
      abortRequested: false,
    }),
}));
