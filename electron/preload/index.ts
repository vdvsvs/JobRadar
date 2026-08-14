import { contextBridge, ipcRenderer } from "electron";
import type { Company, CompanyFilters } from "../../src/types/company";
import type { UserProfile } from "../../src/types/user";
import type { AssessmentResult } from "../../src/types/assessment";
import type { DataSource } from "../../src/types/crawler";

export interface ElectronAPI {
  // Assessment
  saveAssessment: (data: unknown) => Promise<{ id: string }>;
  getAssessments: () => Promise<AssessmentResult[]>;
  getAssessment: (id: string) => Promise<AssessmentResult | null>;
  deleteAssessment: (id: string) => Promise<void>;
  validateAssessmentFlow: () => Promise<{ success: boolean; data: unknown }>;

  // Company
  saveCompany: (data: Partial<Company>) => Promise<Company>;
  getCompanies: (filters?: CompanyFilters) => Promise<Company[]>;
  getCompany: (id: string) => Promise<Company | null>;
  deleteCompany: (id: string) => Promise<void>;
  autoEvaluateCompany: (
    companyId: string,
  ) => Promise<{
    success: boolean;
    scores: Record<string, number>;
    reasons: string[];
  }>;
  aiAnalyzeCompany: (
    companyName: string,
  ) => Promise<{ success: boolean; data: unknown }>;
  checkCompanyRisk: (
    input: unknown,
  ) => Promise<{ success: boolean; data: unknown }>;

  // Crawler / Data sources
  importData: (
    format: string,
    data: unknown,
  ) => Promise<{ success: boolean; count: number }>;
  getDataSources: () => Promise<DataSource[]>;
  saveDataSource: (config: DataSource) => Promise<void>;
  deleteDataSource: (sourceId: string) => Promise<void>;
  searchJobs: (query: string) => Promise<unknown[]>;
  saveJobs: (jobs: unknown[]) => Promise<{ success: boolean; count: number }>;
  getJobListings: () => Promise<unknown[]>;
  validateJobs: (jobs: unknown[]) => Promise<unknown>;
  openJobBrowser: (url: string) => Promise<{ success: boolean }>;
  extractJobsFromPage: () => Promise<{
    success: boolean;
    jobs: unknown[];
    count: number;
    source?: string;
  }>;
  closeJobBrowser: () => Promise<{ success: boolean }>;

  // Settings
  getSettings: () => Promise<unknown>;
  saveSettings: (settings: unknown) => Promise<void>;
  exportSettings: () => Promise<{ success: boolean; path?: string }>;
  importSettings: () => Promise<{ success: boolean }>;

  // Backup
  exportData: () => Promise<{ success: boolean; path?: string }>;
  importDataBackup: (
    data: unknown,
  ) => Promise<{ success: boolean; count: number }>;

  // AI
  chatWithAI: (
    messages: Array<{ role: string; content: string }>,
  ) => Promise<string>;
  getAIProviders: () => Promise<
    Array<{ id: string; name: string; model: string; baseUrl: string }>
  >;
  getAIModels: () => Promise<string[]>;
  verifyAIProvider: (
    provider: unknown,
  ) => Promise<{ success: boolean; content: string }>;
  saveAIProviders: (
    providers: unknown[],
    activeProviderId: string,
  ) => Promise<void>;
  getActiveAIProvider: () => Promise<unknown>;

  // AI Automation
  parseResume: (resumeText: string) => Promise<unknown>;
  suggestSearchQueries: (profile: unknown) => Promise<string[]>;
  generateResume: (params: {
    resumeText: string;
    jobTitle: string;
    company: string;
    jobDescription: string;
    keywords: string[];
  }) => Promise<string>;
  generateSTARStories: (params: {
    resumeText: string;
    profile: unknown;
    jobTitle: string;
    company: string;
    count?: number;
  }) => Promise<unknown[]>;
  generateInterviewQuestions: (params: {
    jobTitle: string;
    company: string;
    jobDescription: string;
    count?: number;
  }) => Promise<unknown[]>;
  analyzeCompany: (
    companyName: string,
    jobDescription?: string,
  ) => Promise<unknown>;

  // User
  getProfile: () => Promise<UserProfile | null>;
  saveProfile: (profile: UserProfile) => Promise<UserProfile | null>;
  getResume: () => Promise<unknown>;
  saveResume: (resume: unknown) => Promise<void>;
  extractPdfText: (
    filePath: string,
  ) => Promise<{ success: boolean; text: string; pageCount: number }>;
  extractPdfFromBuffer: (
    buffer: ArrayBuffer,
  ) => Promise<{ success: boolean; text: string; pageCount: number }>;
  deleteResume: (resumeId: string) => Promise<{ success: boolean }>;
  getAllResumes: () => Promise<unknown[]>;

  // Evaluation
  saveEvaluation: (data: unknown) => Promise<{ id: string }>;
  getEvaluations: (filters?: unknown) => Promise<unknown[]>;
  getEvaluation: (id: string) => Promise<unknown | null>;
  deleteEvaluation: (id: string) => Promise<void>;
  saveEvaluationWeights: (
    userId: string,
    weights: unknown,
  ) => Promise<{ success: boolean }>;
  getEvaluationWeights: (userId: string) => Promise<unknown | null>;

  // Tracker
  saveTracker: (data: unknown) => Promise<{ id: string }>;
  getTrackers: (filters?: unknown) => Promise<unknown[]>;
  getTracker: (id: string) => Promise<unknown | null>;
  updateTrackerStatus: (
    id: string,
    status: string,
    notes?: string,
  ) => Promise<{ success: boolean }>;
  updateTracker: (
    id: string,
    updates: unknown,
  ) => Promise<{ success: boolean }>;
  deleteTracker: (id: string) => Promise<void>;
  getTrackerStats: () => Promise<unknown>;
  exportTrackerCSV: () => Promise<string>;

  // Interview
  saveInterviewStory: (data: unknown) => Promise<{ id: string }>;
  getInterviewStories: (filters?: unknown) => Promise<unknown[]>;
  getInterviewStory: (id: string) => Promise<unknown | null>;
  updateInterviewStory: (
    id: string,
    updates: unknown,
  ) => Promise<{ success: boolean }>;
  deleteInterviewStory: (id: string) => Promise<void>;
  incrementStoryUsage: (id: string) => Promise<{ success: boolean }>;
  saveInterviewQuestion: (data: unknown) => Promise<{ id: string }>;
  getInterviewQuestions: (filters?: unknown) => Promise<unknown[]>;
  getInterviewQuestion: (id: string) => Promise<unknown | null>;
  updateInterviewQuestion: (
    id: string,
    updates: unknown,
  ) => Promise<{ success: boolean }>;
  deleteInterviewQuestion: (id: string) => Promise<void>;
  linkStoryToQuestion: (
    storyId: string,
    questionId: string,
  ) => Promise<{ success: boolean }>;
  unlinkStoryFromQuestion: (
    questionId: string,
  ) => Promise<{ success: boolean }>;
  getInterviewCompetencies: () => Promise<string[]>;
  getInterviewAllTags: () => Promise<string[]>;
  getMostUsedStories: (limit?: number) => Promise<unknown[]>;

  // Resume
  saveResumeTemplate: (data: unknown) => Promise<{ id: string }>;
  getResumeTemplates: () => Promise<unknown[]>;
  getResumeTemplate: (id: string) => Promise<unknown | null>;
  updateResumeTemplate: (
    id: string,
    updates: unknown,
  ) => Promise<{ success: boolean }>;
  deleteResumeTemplate: (id: string) => Promise<void>;
  saveGeneratedResume: (data: unknown) => Promise<{ id: string }>;
  getGeneratedResumes: (filters?: unknown) => Promise<unknown[]>;
  getGeneratedResume: (id: string) => Promise<unknown | null>;
  updateGeneratedResume: (
    id: string,
    updates: unknown,
  ) => Promise<{ success: boolean }>;
  deleteGeneratedResume: (id: string) => Promise<void>;
  getDefaultResumeTemplate: () => Promise<unknown | null>;
  getResumeTemplateList: () => Promise<unknown[]>;

  // Scan
  saveScanConfig: (data: unknown) => Promise<{ id: string }>;
  getScanConfigs: () => Promise<unknown[]>;
  getScanConfig: (id: string) => Promise<unknown | null>;
  updateScanConfig: (
    id: string,
    updates: unknown,
  ) => Promise<{ success: boolean }>;
  deleteScanConfig: (id: string) => Promise<void>;
  saveScannedJobs: (
    jobs: unknown[],
  ) => Promise<{ success: boolean; count: number }>;
  getScannedJobs: (filters?: unknown) => Promise<unknown[]>;
  getScannedJob: (id: string) => Promise<unknown | null>;
  updateScannedJob: (
    id: string,
    updates: unknown,
  ) => Promise<{ success: boolean }>;
  deleteScannedJob: (id: string) => Promise<void>;
  getJobStats: () => Promise<unknown>;

  // Auto apply
  autoApplyGetStatus: () => Promise<unknown>;
  autoApplyStart: () => Promise<unknown>;
  autoApplyStop: () => Promise<unknown>;
  autoApplyUpdateConfig: (updates: unknown) => Promise<unknown>;
  autoApplyRefreshQueue: () => Promise<unknown>;
}

const electronAPI: ElectronAPI = {
  saveAssessment: (data) => ipcRenderer.invoke("assessment:save", data),
  getAssessments: () => ipcRenderer.invoke("assessment:getAll"),
  getAssessment: (id) => ipcRenderer.invoke("assessment:get", id),
  deleteAssessment: (id) => ipcRenderer.invoke("assessment:delete", id),
  validateAssessmentFlow: () => ipcRenderer.invoke("assessment:validateFlow"),

  saveCompany: (data) => ipcRenderer.invoke("company:save", data),
  getCompanies: (filters) => ipcRenderer.invoke("company:getAll", filters),
  getCompany: (id) => ipcRenderer.invoke("company:get", id),
  deleteCompany: (id) => ipcRenderer.invoke("company:delete", id),
  autoEvaluateCompany: (companyId) =>
    ipcRenderer.invoke("company:autoEvaluate", companyId),
  aiAnalyzeCompany: (companyName) =>
    ipcRenderer.invoke("company:aiAnalyze", companyName),
  checkCompanyRisk: (input) => ipcRenderer.invoke("company:checkRisk", input),

  importData: (format, data) =>
    ipcRenderer.invoke("crawler:import", format, data),
  getDataSources: () => ipcRenderer.invoke("crawler:getSources"),
  saveDataSource: (config) => ipcRenderer.invoke("crawler:saveSource", config),
  deleteDataSource: (sourceId) =>
    ipcRenderer.invoke("crawler:deleteSource", sourceId),
  searchJobs: (query) => ipcRenderer.invoke("crawler:searchJobs", query),
  saveJobs: (jobs) => ipcRenderer.invoke("crawler:saveJobs", jobs),
  getJobListings: () => ipcRenderer.invoke("crawler:getJobs"),
  validateJobs: (jobs) => ipcRenderer.invoke("crawler:validateJobs", jobs),
  openJobBrowser: (url) => ipcRenderer.invoke("crawler:openBrowser", url),
  extractJobsFromPage: () => ipcRenderer.invoke("crawler:extractJobsFromPage"),
  closeJobBrowser: () => ipcRenderer.invoke("crawler:closeBrowser"),

  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (settings) => ipcRenderer.invoke("settings:save", settings),
  exportSettings: () => ipcRenderer.invoke("settings:export"),
  importSettings: () => ipcRenderer.invoke("settings:import"),

  exportData: () => ipcRenderer.invoke("data:export"),
  importDataBackup: (data) => ipcRenderer.invoke("data:import", data),

  chatWithAI: (messages) => ipcRenderer.invoke("ai:chat", messages),
  getAIProviders: () => ipcRenderer.invoke("ai:getProviders"),
  getAIModels: () => ipcRenderer.invoke("ai:getModels"),
  verifyAIProvider: (provider) =>
    ipcRenderer.invoke("ai:verifyProvider", provider),
  saveAIProviders: (providers, activeProviderId) =>
    ipcRenderer.invoke("ai:saveProviders", providers, activeProviderId),
  getActiveAIProvider: () => ipcRenderer.invoke("ai:getActiveProvider"),

  // AI Automation
  parseResume: (resumeText: string) =>
    ipcRenderer.invoke("ai:parseResume", resumeText),
  suggestSearchQueries: (profile: unknown) =>
    ipcRenderer.invoke("ai:suggestSearchQueries", profile),
  generateResume: (params) => ipcRenderer.invoke("ai:generateResume", params),
  generateSTARStories: (params) =>
    ipcRenderer.invoke("ai:generateSTARStories", params),
  generateInterviewQuestions: (params) =>
    ipcRenderer.invoke("ai:generateInterviewQuestions", params),
  analyzeCompany: (companyName: string, jobDescription?: string) =>
    ipcRenderer.invoke("ai:analyzeCompany", companyName, jobDescription),

  getProfile: () => ipcRenderer.invoke("user:getProfile"),
  saveProfile: (profile) => ipcRenderer.invoke("user:saveProfile", profile),
  getResume: () => ipcRenderer.invoke("user:getResume"),
  saveResume: (resume) => ipcRenderer.invoke("user:saveResume", resume),
  extractPdfText: (filePath) =>
    ipcRenderer.invoke("user:extractPdfText", filePath),
  extractPdfFromBuffer: (buffer) =>
    ipcRenderer.invoke("user:extractPdfFromBuffer", buffer),
  deleteResume: (resumeId) => ipcRenderer.invoke("user:deleteResume", resumeId),
  getAllResumes: () => ipcRenderer.invoke("user:getAllResumes"),

  // Evaluation
  saveEvaluation: (data) => ipcRenderer.invoke("evaluation:save", data),
  getEvaluations: (filters) => ipcRenderer.invoke("evaluation:getAll", filters),
  getEvaluation: (id) => ipcRenderer.invoke("evaluation:get", id),
  deleteEvaluation: (id) => ipcRenderer.invoke("evaluation:delete", id),
  saveEvaluationWeights: (userId, weights) =>
    ipcRenderer.invoke("evaluation:saveWeights", userId, weights),
  getEvaluationWeights: (userId) =>
    ipcRenderer.invoke("evaluation:getWeights", userId),

  // Tracker
  saveTracker: (data) => ipcRenderer.invoke("tracker:save", data),
  getTrackers: (filters) => ipcRenderer.invoke("tracker:getAll", filters),
  getTracker: (id) => ipcRenderer.invoke("tracker:get", id),
  updateTrackerStatus: (id, status, notes) =>
    ipcRenderer.invoke("tracker:updateStatus", id, status, notes),
  updateTracker: (id, updates) =>
    ipcRenderer.invoke("tracker:update", id, updates),
  deleteTracker: (id) => ipcRenderer.invoke("tracker:delete", id),
  getTrackerStats: () => ipcRenderer.invoke("tracker:getStats"),
  exportTrackerCSV: () => ipcRenderer.invoke("tracker:exportCSV"),

  // Interview
  saveInterviewStory: (data) => ipcRenderer.invoke("interview:saveStory", data),
  getInterviewStories: (filters) =>
    ipcRenderer.invoke("interview:getStories", filters),
  getInterviewStory: (id) => ipcRenderer.invoke("interview:getStory", id),
  updateInterviewStory: (id, updates) =>
    ipcRenderer.invoke("interview:updateStory", id, updates),
  deleteInterviewStory: (id) => ipcRenderer.invoke("interview:deleteStory", id),
  incrementStoryUsage: (id) =>
    ipcRenderer.invoke("interview:incrementStoryUsage", id),
  saveInterviewQuestion: (data) =>
    ipcRenderer.invoke("interview:saveQuestion", data),
  getInterviewQuestions: (filters) =>
    ipcRenderer.invoke("interview:getQuestions", filters),
  getInterviewQuestion: (id) => ipcRenderer.invoke("interview:getQuestion", id),
  updateInterviewQuestion: (id, updates) =>
    ipcRenderer.invoke("interview:updateQuestion", id, updates),
  deleteInterviewQuestion: (id) =>
    ipcRenderer.invoke("interview:deleteQuestion", id),
  linkStoryToQuestion: (storyId, questionId) =>
    ipcRenderer.invoke("interview:linkStoryToQuestion", storyId, questionId),
  unlinkStoryFromQuestion: (questionId) =>
    ipcRenderer.invoke("interview:unlinkStoryFromQuestion", questionId),
  getInterviewCompetencies: () =>
    ipcRenderer.invoke("interview:getCompetencies"),
  getInterviewAllTags: () => ipcRenderer.invoke("interview:getAllTags"),
  getMostUsedStories: (limit) =>
    ipcRenderer.invoke("interview:getMostUsedStories", limit),

  // Resume
  saveResumeTemplate: (data) => ipcRenderer.invoke("resume:saveTemplate", data),
  getResumeTemplates: () => ipcRenderer.invoke("resume:getTemplates"),
  getResumeTemplate: (id) => ipcRenderer.invoke("resume:getTemplate", id),
  updateResumeTemplate: (id, updates) =>
    ipcRenderer.invoke("resume:updateTemplate", id, updates),
  deleteResumeTemplate: (id) => ipcRenderer.invoke("resume:deleteTemplate", id),
  saveGeneratedResume: (data) =>
    ipcRenderer.invoke("resume:saveGenerated", data),
  getGeneratedResumes: (filters) =>
    ipcRenderer.invoke("resume:getGenerated", filters),
  getGeneratedResume: (id) => ipcRenderer.invoke("resume:getGeneratedById", id),
  updateGeneratedResume: (id, updates) =>
    ipcRenderer.invoke("resume:updateGenerated", id, updates),
  deleteGeneratedResume: (id) =>
    ipcRenderer.invoke("resume:deleteGenerated", id),
  getDefaultResumeTemplate: () =>
    ipcRenderer.invoke("resume:getDefaultTemplate"),
  getResumeTemplateList: () => ipcRenderer.invoke("resume:getTemplateList"),

  // Scan
  saveScanConfig: (data) => ipcRenderer.invoke("scan:saveConfig", data),
  getScanConfigs: () => ipcRenderer.invoke("scan:getConfigs"),
  getScanConfig: (id) => ipcRenderer.invoke("scan:getConfig", id),
  updateScanConfig: (id, updates) =>
    ipcRenderer.invoke("scan:updateConfig", id, updates),
  deleteScanConfig: (id) => ipcRenderer.invoke("scan:deleteConfig", id),
  saveScannedJobs: (jobs) => ipcRenderer.invoke("scan:saveJobs", jobs),
  getScannedJobs: (filters) => ipcRenderer.invoke("scan:getJobs", filters),
  getScannedJob: (id) => ipcRenderer.invoke("scan:getJob", id),
  updateScannedJob: (id, updates) =>
    ipcRenderer.invoke("scan:updateJob", id, updates),
  deleteScannedJob: (id) => ipcRenderer.invoke("scan:deleteJob", id),
  getJobStats: () => ipcRenderer.invoke("scan:getJobStats"),

  // Auto apply
  autoApplyGetStatus: () => ipcRenderer.invoke("autoApply:getStatus"),
  autoApplyStart: () => ipcRenderer.invoke("autoApply:start"),
  autoApplyStop: () => ipcRenderer.invoke("autoApply:stop"),
  autoApplyUpdateConfig: (updates) =>
    ipcRenderer.invoke("autoApply:updateConfig", updates),
  autoApplyRefreshQueue: () => ipcRenderer.invoke("autoApply:refreshQueue"),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
