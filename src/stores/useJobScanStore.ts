import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export interface ScanConfig {
  id: string;
  portal_name: string;
  portal_type: "greenhouse" | "lever" | "ashby" | "wellfound" | "custom";
  url_pattern: string;
  keywords: string[];
  is_active: boolean;
  last_scanned_at?: string;
  scan_interval_hours: number;
  created_at: string;
}

export interface JobListing {
  id: string;
  title: string;
  company: string;
  company_id?: string;
  location_city?: string;
  location_district?: string;
  salary?: string;
  tags: string[];
  source: string;
  source_url?: string;
  description?: string;
  requirements?: string;
  collected_at: string;
  status: string;
  score_letter?: string;
  score_numeric?: number;
  evaluation_report?: string;
  resume_path?: string;
  notes?: string;
  discovered_at: string;
  applied_at?: string;
  interview_at?: string;
  offer_at?: string;
}

interface JobScanState {
  // 扫描配置
  scanConfigs: ScanConfig[];

  // 职位列表
  jobListings: JobListing[];

  // 扫描状态
  isScanning: boolean;
  scanProgress: number;
  scanError: string | null;

  // 筛选条件
  filters: {
    status?: string;
    company?: string;
    location?: string;
    minScore?: number;
  };

  // Actions
  setScanConfigs: (configs: ScanConfig[]) => void;
  addScanConfig: (
    config: Omit<ScanConfig, "id" | "created_at">,
  ) => Promise<void>;
  updateScanConfig: (id: string, updates: Partial<ScanConfig>) => Promise<void>;
  deleteScanConfig: (id: string) => Promise<void>;

  setJobListings: (jobs: JobListing[]) => void;
  addJobListing: (
    job: Omit<JobListing, "id" | "collected_at" | "discovered_at">,
  ) => Promise<void>;
  updateJobListing: (id: string, updates: Partial<JobListing>) => Promise<void>;
  deleteJobListing: (id: string) => Promise<void>;

  setFilters: (filters: Partial<JobScanState["filters"]>) => void;
  clearFilters: () => void;

  startScan: (configIds?: string[]) => Promise<void>;
  stopScan: () => void;

  // 从后端加载数据
  loadFromBackend: () => Promise<void>;

  // 获取筛选后的职位
  getFilteredJobs: () => JobListing[];
}

export const useJobScanStore = create<JobScanState>((set, get) => ({
  scanConfigs: [],
  jobListings: [],
  isScanning: false,
  scanProgress: 0,
  scanError: null,
  filters: {},

  setScanConfigs: (configs) => set({ scanConfigs: configs }),

  addScanConfig: async (config) => {
    try {
      const result = await window.electronAPI.saveScanConfig(config);
      const newConfig: ScanConfig = {
        ...config,
        id: (result as any).id || uuidv4(),
        created_at: new Date().toISOString(),
      };
      set((state) => ({
        scanConfigs: [newConfig, ...state.scanConfigs],
      }));
    } catch (error) {
      console.error("Failed to save scan config:", error);
    }
  },

  updateScanConfig: async (id, updates) => {
    try {
      await window.electronAPI.updateScanConfig(id, updates);
      set((state) => ({
        scanConfigs: state.scanConfigs.map((config) =>
          config.id === id ? { ...config, ...updates } : config,
        ),
      }));
    } catch (error) {
      console.error("Failed to update scan config:", error);
    }
  },

  deleteScanConfig: async (id) => {
    try {
      await window.electronAPI.deleteScanConfig(id);
      set((state) => ({
        scanConfigs: state.scanConfigs.filter((config) => config.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete scan config:", error);
    }
  },

  setJobListings: (jobs) => set({ jobListings: jobs }),

  addJobListing: async (job) => {
    try {
      const result = await window.electronAPI.saveScannedJobs([job]);
      const newJob: JobListing = {
        ...job,
        id: uuidv4(),
        collected_at: new Date().toISOString(),
        discovered_at: new Date().toISOString(),
      };
      set((state) => ({
        jobListings: [newJob, ...state.jobListings],
      }));
    } catch (error) {
      console.error("Failed to save job listing:", error);
    }
  },

  updateJobListing: async (id, updates) => {
    try {
      await window.electronAPI.updateScannedJob(id, updates);
      set((state) => ({
        jobListings: state.jobListings.map((job) =>
          job.id === id ? { ...job, ...updates } : job,
        ),
      }));
    } catch (error) {
      console.error("Failed to update job listing:", error);
    }
  },

  deleteJobListing: async (id) => {
    try {
      await window.electronAPI.deleteScannedJob(id);
      set((state) => ({
        jobListings: state.jobListings.filter((job) => job.id !== id),
      }));
    } catch (error) {
      console.error("Failed to delete job listing:", error);
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => set({ filters: {} }),

  startScan: async (configIds) => {
    set({ isScanning: true, scanProgress: 0, scanError: null });

    try {
      const configs = configIds
        ? get().scanConfigs.filter((c) => configIds.includes(c.id))
        : get().scanConfigs.filter((c) => c.is_active);

      if (configs.length === 0) {
        throw new Error("没有可扫描的启用配置");
      }

      const sources = await window.electronAPI.getDataSources();
      const hasSearchSource =
        Array.isArray(sources) &&
        sources.some((source: any) => source?.config?.apiKey);
      if (!hasSearchSource) {
        throw new Error(
          "请先在“数据源管理”中配置 Bing、SerpAPI 或自定义搜索源，岗位雷达不会生成模拟岗位",
        );
      }

      const totalConfigs = configs.length;
      let completed = 0;
      const failures: string[] = [];

      for (const config of configs) {
        if (!get().isScanning) break;
        try {
          const domain = new URL(config.url_pattern).hostname;
          const query = [...config.keywords, `site:${domain}`].join(" ").trim();
          const results = await window.electronAPI.searchJobs(query);
          const validated = await window.electronAPI.validateJobs(results);
          const jobs = Array.isArray((validated as any)?.jobs)
            ? (validated as any).jobs
            : [];
          const prepared = jobs.map((job: any) => ({
            ...job,
            source: config.portal_name,
            source_url:
              job.source_url || job.url || job.link || config.url_pattern,
          }));
          await window.electronAPI.saveScannedJobs(prepared);
          await get().updateScanConfig(config.id, {
            last_scanned_at: new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Failed to scan ${config.portal_name}:`, error);
          failures.push(
            `${config.portal_name}: ${error instanceof Error ? error.message : "扫描失败"}`,
          );
        } finally {
          completed++;
          set({ scanProgress: (completed / totalConfigs) * 100 });
        }
      }

      const jobs = await window.electronAPI.getScannedJobs();
      set({
        isScanning: false,
        scanProgress: 100,
        scanError: failures.length ? failures.join("；") : null,
        jobListings: (jobs as JobListing[]) || [],
      });
    } catch (error) {
      set({
        isScanning: false,
        scanError: error instanceof Error ? error.message : "扫描失败",
      });
    }
  },

  stopScan: () => {
    set({ isScanning: false, scanProgress: 0 });
  },

  loadFromBackend: async () => {
    try {
      const configs = await window.electronAPI.getScanConfigs();
      const jobs = await window.electronAPI.getScannedJobs();
      set({
        scanConfigs: (configs as ScanConfig[]) || [],
        jobListings: (jobs as JobListing[]) || [],
      });
    } catch (error) {
      console.error("Failed to load scan data:", error);
    }
  },

  getFilteredJobs: () => {
    const { jobListings, filters } = get();

    return jobListings.filter((job) => {
      if (filters.status && job.status !== filters.status) return false;
      if (filters.company && !job.company.includes(filters.company))
        return false;
      if (filters.location && !job.location_city?.includes(filters.location))
        return false;
      if (
        filters.minScore &&
        (!job.score_numeric || job.score_numeric < filters.minScore)
      )
        return false;
      return true;
    });
  },
}));
