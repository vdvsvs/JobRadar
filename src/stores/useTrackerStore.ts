import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { JobStatus, STATUS_FLOW } from "../services/ai/AIServiceAdapter";

export interface ApplicationRecord {
  id: string;
  job_listing_id: string;
  job_title: string;
  company: string;
  status: JobStatus;
  status_history: {
    status: JobStatus;
    timestamp: string;
    notes?: string;
  }[];
  notes?: string;
  follow_up_date?: string;
  contact_person?: string;
  contact_email?: string;
  created_at: string;
  updated_at: string;
}

interface TrackerState {
  // 申请记录
  applications: ApplicationRecord[];
  currentApplication: ApplicationRecord | null;

  // 视图模式
  viewMode: "kanban" | "list" | "timeline";

  // 筛选条件
  filters: {
    status?: JobStatus;
    company?: string;
    dateRange?: { start: string; end: string };
  };

  // Actions
  setApplications: (applications: ApplicationRecord[]) => void;
  addApplication: (
    application: Omit<
      ApplicationRecord,
      "id" | "status_history" | "created_at" | "updated_at"
    >,
  ) => Promise<void>;
  updateApplication: (
    id: string,
    updates: Partial<ApplicationRecord>,
  ) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
  setCurrentApplication: (application: ApplicationRecord | null) => void;

  // 状态管理
  updateStatus: (
    id: string,
    newStatus: JobStatus,
    notes?: string,
  ) => Promise<void>;
  getValidNextStatuses: (id: string) => JobStatus[];

  // 视图控制
  setViewMode: (mode: "kanban" | "list" | "timeline") => void;

  // 筛选
  setFilters: (filters: Partial<TrackerState["filters"]>) => void;
  clearFilters: () => void;
  getFilteredApplications: () => ApplicationRecord[];

  // 从后端加载
  loadFromBackend: () => Promise<void>;

  // 统计
  getStats: () => {
    total: number;
    byStatus: { [key: string]: number };
    averageTimeInPipeline: number;
    conversionRate: number;
  };

  // 导出
  exportToCSV: () => string;
}

export const useTrackerStore = create<TrackerState>((set, get) => ({
  applications: [],
  currentApplication: null,
  viewMode: "kanban",
  filters: {},

  setApplications: (applications) => set({ applications }),

  addApplication: async (application) => {
    try {
      const result = await window.electronAPI.saveTracker(application);
      const now = new Date().toISOString();
      const newApplication: ApplicationRecord = {
        ...application,
        id: (result as any).id || uuidv4(),
        status_history: [
          {
            status: application.status,
            timestamp: now,
            notes: "创建申请记录",
          },
        ],
        created_at: now,
        updated_at: now,
      };
      set((state) => ({
        applications: [newApplication, ...state.applications],
      }));
    } catch (error) {
      console.error("Failed to save application:", error);
    }
  },

  updateApplication: async (id, updates) => {
    try {
      await window.electronAPI.updateTracker(id, updates);
      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id
            ? { ...app, ...updates, updated_at: new Date().toISOString() }
            : app,
        ),
        currentApplication:
          state.currentApplication?.id === id
            ? {
                ...state.currentApplication,
                ...updates,
                updated_at: new Date().toISOString(),
              }
            : state.currentApplication,
      }));
    } catch (error) {
      console.error("Failed to update application:", error);
    }
  },

  deleteApplication: async (id) => {
    try {
      await window.electronAPI.deleteTracker(id);
      set((state) => ({
        applications: state.applications.filter((app) => app.id !== id),
        currentApplication:
          state.currentApplication?.id === id ? null : state.currentApplication,
      }));
    } catch (error) {
      console.error("Failed to delete application:", error);
    }
  },

  setCurrentApplication: (application) =>
    set({ currentApplication: application }),

  updateStatus: async (id, newStatus, notes) => {
    const application = get().applications.find((app) => app.id === id);
    if (!application) return;

    const validStatuses = STATUS_FLOW[application.status] || [];
    if (!validStatuses.includes(newStatus)) {
      console.error(
        `Invalid status transition: ${application.status} -> ${newStatus}`,
      );
      return;
    }

    try {
      await window.electronAPI.updateTrackerStatus(id, newStatus, notes);
      const now = new Date().toISOString();
      const statusEntry = {
        status: newStatus,
        timestamp: now,
        notes,
      };

      set((state) => ({
        applications: state.applications.map((app) =>
          app.id === id
            ? {
                ...app,
                status: newStatus,
                status_history: [...app.status_history, statusEntry],
                updated_at: now,
              }
            : app,
        ),
        currentApplication:
          state.currentApplication?.id === id
            ? {
                ...state.currentApplication,
                status: newStatus,
                status_history: [
                  ...state.currentApplication.status_history,
                  statusEntry,
                ],
                updated_at: now,
              }
            : state.currentApplication,
      }));
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  },

  getValidNextStatuses: (id) => {
    const application = get().applications.find((app) => app.id === id);
    if (!application) return [];
    return STATUS_FLOW[application.status] || [];
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  clearFilters: () => set({ filters: {} }),

  getFilteredApplications: () => {
    const { applications, filters } = get();

    return applications.filter((app) => {
      if (filters.status && app.status !== filters.status) return false;
      if (filters.company && !app.company.includes(filters.company))
        return false;
      if (filters.dateRange) {
        const appDate = new Date(app.created_at);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (appDate < startDate || appDate > endDate) return false;
      }
      return true;
    });
  },

  loadFromBackend: async () => {
    try {
      const data = await window.electronAPI.getTrackers();
      set({ applications: (data as ApplicationRecord[]) || [] });
    } catch (error) {
      console.error("Failed to load applications:", error);
    }
  },

  getStats: () => {
    const { applications } = get();

    if (applications.length === 0) {
      return {
        total: 0,
        byStatus: {},
        averageTimeInPipeline: 0,
        conversionRate: 0,
      };
    }

    const byStatus: { [key: string]: number } = {};
    applications.forEach((app) => {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
    });

    // 计算平均 pipeline 时间（天）
    const now = Date.now();
    const totalTime = applications.reduce((sum, app) => {
      const created = new Date(app.created_at).getTime();
      return sum + (now - created);
    }, 0);
    const averageTimeInPipeline =
      totalTime / applications.length / (24 * 60 * 60 * 1000);

    // 计算转化率（从发现到 offer）
    const discoveredCount = applications.length;
    const offerCount = applications.filter(
      (app) =>
        app.status === JobStatus.OFFER || app.status === JobStatus.ACCEPTED,
    ).length;
    const conversionRate =
      discoveredCount > 0 ? (offerCount / discoveredCount) * 100 : 0;

    return {
      total: applications.length,
      byStatus,
      averageTimeInPipeline,
      conversionRate,
    };
  },

  exportToCSV: () => {
    const { applications } = get();

    const headers = ["职位", "公司", "状态", "投递时间", "最后更新", "备注"];

    const rows = applications.map((app) => [
      app.job_title,
      app.company,
      app.status,
      app.created_at,
      app.updated_at,
      app.notes || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    return csvContent;
  },
}));
