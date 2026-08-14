import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  ResumeTemplate,
  GeneratedResume,
} from "../services/ai/AIServiceAdapter";

interface ResumeState {
  // 简历模板
  templates: ResumeTemplate[];
  currentTemplate: ResumeTemplate | null;

  // 生成的简历
  generatedResumes: GeneratedResume[];
  currentResume: GeneratedResume | null;

  // 基础简历内容
  baseResume: string;

  // 生成状态
  isGenerating: boolean;
  generationProgress: number;
  generationError: string | null;

  // Actions - 模板
  setTemplates: (templates: ResumeTemplate[]) => void;
  addTemplate: (
    template: Omit<ResumeTemplate, "id" | "created_at">,
  ) => Promise<void>;
  updateTemplate: (
    id: string,
    updates: Partial<ResumeTemplate>,
  ) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  setCurrentTemplate: (template: ResumeTemplate | null) => void;

  // Actions - 生成的简历
  setGeneratedResumes: (resumes: GeneratedResume[]) => void;
  addGeneratedResume: (
    resume: Omit<GeneratedResume, "id" | "created_at">,
  ) => Promise<void>;
  updateGeneratedResume: (
    id: string,
    updates: Partial<GeneratedResume>,
  ) => Promise<void>;
  deleteGeneratedResume: (id: string) => Promise<void>;
  setCurrentResume: (resume: GeneratedResume | null) => void;

  // 基础简历
  setBaseResume: (content: string) => void;

  // 生成简历
  generateResume: (
    jobListingId: string,
    jobDescription: string,
    keywords: string[],
    templateId?: string,
  ) => Promise<GeneratedResume>;

  // 预览简历
  previewResume: (resumeId: string) => Promise<string>;

  // 导出简历
  exportResume: (
    resumeId: string,
    format: "pdf" | "html" | "docx",
  ) => Promise<string>;

  // 从后端加载
  loadFromBackend: () => Promise<void>;

  // 获取默认模板
  getDefaultTemplate: () => ResumeTemplate | null;

  // 获取模板列表
  getTemplateList: () => { id: string; name: string; description?: string }[];
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  templates: [],
  currentTemplate: null,
  generatedResumes: [],
  currentResume: null,
  baseResume: "",
  isGenerating: false,
  generationProgress: 0,
  generationError: null,

  setTemplates: (templates) => set({ templates }),

  addTemplate: async (template) => {
    try {
      const result = await window.electronAPI.saveResumeTemplate(template);
      const newTemplate: ResumeTemplate = {
        ...template,
        id: (result as any).id || uuidv4(),
        created_at: new Date().toISOString(),
      };
      set((state) => ({
        templates: [...state.templates, newTemplate],
      }));
    } catch (error) {
      console.error("Failed to save template:", error);
    }
  },

  updateTemplate: async (id, updates) => {
    try {
      await window.electronAPI.updateResumeTemplate(id, updates);
      set((state) => ({
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, ...updates } : t,
        ),
        currentTemplate:
          state.currentTemplate?.id === id
            ? { ...state.currentTemplate, ...updates }
            : state.currentTemplate,
      }));
    } catch (error) {
      console.error("Failed to update template:", error);
    }
  },

  deleteTemplate: async (id) => {
    try {
      await window.electronAPI.deleteResumeTemplate(id);
      set((state) => ({
        templates: state.templates.filter((t) => t.id !== id),
        currentTemplate:
          state.currentTemplate?.id === id ? null : state.currentTemplate,
      }));
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  },

  setCurrentTemplate: (template) => set({ currentTemplate: template }),

  setGeneratedResumes: (resumes) => set({ generatedResumes: resumes }),

  addGeneratedResume: async (resume) => {
    try {
      const result = await window.electronAPI.saveGeneratedResume(resume);
      const newResume: GeneratedResume = {
        ...resume,
        id: (result as any).id || uuidv4(),
        created_at: new Date().toISOString(),
      };
      set((state) => ({
        generatedResumes: [newResume, ...state.generatedResumes],
      }));
    } catch (error) {
      console.error("Failed to save generated resume:", error);
    }
  },

  updateGeneratedResume: async (id, updates) => {
    try {
      await window.electronAPI.updateGeneratedResume(id, updates);
      set((state) => ({
        generatedResumes: state.generatedResumes.map((r) =>
          r.id === id ? { ...r, ...updates } : r,
        ),
        currentResume:
          state.currentResume?.id === id
            ? { ...state.currentResume, ...updates }
            : state.currentResume,
      }));
    } catch (error) {
      console.error("Failed to update generated resume:", error);
    }
  },

  deleteGeneratedResume: async (id) => {
    try {
      await window.electronAPI.deleteGeneratedResume(id);
      set((state) => ({
        generatedResumes: state.generatedResumes.filter((r) => r.id !== id),
        currentResume:
          state.currentResume?.id === id ? null : state.currentResume,
      }));
    } catch (error) {
      console.error("Failed to delete generated resume:", error);
    }
  },

  setCurrentResume: (resume) => set({ currentResume: resume }),

  setBaseResume: (content) => set({ baseResume: content }),

  generateResume: async (
    jobListingId,
    jobDescription,
    keywords,
    templateId,
  ) => {
    set({ isGenerating: true, generationProgress: 0, generationError: null });

    try {
      const template = templateId
        ? get().templates.find((t) => t.id === templateId)
        : get().getDefaultTemplate();

      if (!template) {
        throw new Error("未找到简历模板");
      }

      set({ generationProgress: 20 });

      // 模拟关键词注入
      const keywordsInjected = keywords;

      set({ generationProgress: 50 });

      // 模拟简历生成
      const baseResume = get().baseResume;
      const resumeContent = `
        <html>
          <head>
            <style>${template.css_styles || ""}</style>
          </head>
          <body>
            ${template.html_template
              .replace("{{content}}", baseResume)
              .replace("{{keywords}}", keywords.join(", "))
              .replace("{{job_description}}", jobDescription)}
          </body>
        </html>
      `;

      set({ generationProgress: 80 });

      const newResume: GeneratedResume = {
        id: uuidv4(),
        user_id: "current-user", // 应该从用户store获取
        job_listing_id: jobListingId,
        template_id: template.id,
        resume_content: resumeContent,
        keywords_injected: keywordsInjected,
        created_at: new Date().toISOString(),
      };

      set((state) => ({
        generatedResumes: [newResume, ...state.generatedResumes],
        currentResume: newResume,
        isGenerating: false,
        generationProgress: 100,
      }));

      return newResume;
    } catch (error) {
      set({
        isGenerating: false,
        generationError: error instanceof Error ? error.message : "生成失败",
      });
      throw error;
    }
  },

  previewResume: async (resumeId) => {
    const resume = get().generatedResumes.find((r) => r.id === resumeId);
    if (!resume) {
      throw new Error("未找到简历");
    }
    return resume.resume_content;
  },

  exportResume: async (resumeId, format) => {
    const resume = get().generatedResumes.find((r) => r.id === resumeId);
    if (!resume) {
      throw new Error("未找到简历");
    }

    // 这里应该调用实际的导出逻辑
    // 为了演示，返回模拟路径
    return `/path/to/resume.${format}`;
  },

  loadFromBackend: async () => {
    try {
      const templates = await window.electronAPI.getResumeTemplates();
      const resumes = await window.electronAPI.getGeneratedResumes();
      set({
        templates: (templates as ResumeTemplate[]) || [],
        generatedResumes: (resumes as GeneratedResume[]) || [],
      });
    } catch (error) {
      console.error("Failed to load resume data:", error);
    }
  },

  getDefaultTemplate: () => {
    const { templates } = get();
    return templates.find((t) => t.is_default) || templates[0] || null;
  },

  getTemplateList: () => {
    const { templates } = get();
    return templates.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
    }));
  },
}));
