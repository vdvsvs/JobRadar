import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import {
  InterviewStory,
  InterviewQuestion,
} from "../services/ai/AIServiceAdapter";

interface InterviewState {
  // 面试故事
  stories: InterviewStory[];
  currentStory: InterviewStory | null;

  // 面试问题
  questions: InterviewQuestion[];
  currentQuestion: InterviewQuestion | null;

  // 筛选条件
  storyFilters: {
    competency?: string;
    tags?: string[];
  };

  questionFilters: {
    job_listing_id?: string;
    question_type?: string;
  };

  // Actions - 故事
  setStories: (stories: InterviewStory[]) => void;
  addStory: (
    story: Omit<
      InterviewStory,
      "id" | "use_count" | "last_used_at" | "created_at"
    >,
  ) => Promise<void>;
  updateStory: (id: string, updates: Partial<InterviewStory>) => Promise<void>;
  deleteStory: (id: string) => Promise<void>;
  setCurrentStory: (story: InterviewStory | null) => void;

  // Actions - 问题
  setQuestions: (questions: InterviewQuestion[]) => void;
  addQuestion: (
    question: Omit<InterviewQuestion, "id" | "created_at">,
  ) => Promise<void>;
  updateQuestion: (
    id: string,
    updates: Partial<InterviewQuestion>,
  ) => Promise<void>;
  deleteQuestion: (id: string) => Promise<void>;
  setCurrentQuestion: (question: InterviewQuestion | null) => void;

  // 筛选
  setStoryFilters: (filters: Partial<InterviewState["storyFilters"]>) => void;
  clearStoryFilters: () => void;
  getFilteredStories: () => InterviewStory[];

  setQuestionFilters: (
    filters: Partial<InterviewState["questionFilters"]>,
  ) => void;
  clearQuestionFilters: () => void;
  getFilteredQuestions: () => InterviewQuestion[];

  // 故事-问题关联
  linkStoryToQuestion: (storyId: string, questionId: string) => Promise<void>;
  unlinkStoryFromQuestion: (questionId: string) => Promise<void>;

  // 使用统计
  incrementStoryUsage: (storyId: string) => Promise<void>;
  getMostUsedStories: (limit?: number) => InterviewStory[];

  // 从后端加载
  loadFromBackend: () => Promise<void>;

  // 获取所有能力维度
  getCompetencies: () => string[];

  // 获取所有标签
  getAllTags: () => string[];
}

export const useInterviewStore = create<InterviewState>((set, get) => ({
  stories: [],
  currentStory: null,
  questions: [],
  currentQuestion: null,
  storyFilters: {},
  questionFilters: {},

  setStories: (stories) => set({ stories }),

  addStory: async (story) => {
    try {
      const result = await window.electronAPI.saveInterviewStory(story);
      const newStory: InterviewStory = {
        ...story,
        id: (result as any).id || uuidv4(),
        use_count: 0,
        created_at: new Date().toISOString(),
      };
      set((state) => ({
        stories: [newStory, ...state.stories],
      }));
    } catch (error) {
      console.error("Failed to save story:", error);
    }
  },

  updateStory: async (id, updates) => {
    try {
      await window.electronAPI.updateInterviewStory(id, updates);
      set((state) => ({
        stories: state.stories.map((s) =>
          s.id === id ? { ...s, ...updates } : s,
        ),
        currentStory:
          state.currentStory?.id === id
            ? { ...state.currentStory, ...updates }
            : state.currentStory,
      }));
    } catch (error) {
      console.error("Failed to update story:", error);
    }
  },

  deleteStory: async (id) => {
    try {
      await window.electronAPI.deleteInterviewStory(id);
      set((state) => ({
        stories: state.stories.filter((s) => s.id !== id),
        currentStory: state.currentStory?.id === id ? null : state.currentStory,
      }));
    } catch (error) {
      console.error("Failed to delete story:", error);
    }
  },

  setCurrentStory: (story) => set({ currentStory: story }),

  setQuestions: (questions) => set({ questions }),

  addQuestion: async (question) => {
    try {
      const result = await window.electronAPI.saveInterviewQuestion(question);
      const newQuestion: InterviewQuestion = {
        ...question,
        id: (result as any).id || uuidv4(),
        created_at: new Date().toISOString(),
      };
      set((state) => ({
        questions: [newQuestion, ...state.questions],
      }));
    } catch (error) {
      console.error("Failed to save question:", error);
    }
  },

  updateQuestion: async (id, updates) => {
    try {
      await window.electronAPI.updateInterviewQuestion(id, updates);
      set((state) => ({
        questions: state.questions.map((q) =>
          q.id === id ? { ...q, ...updates } : q,
        ),
        currentQuestion:
          state.currentQuestion?.id === id
            ? { ...state.currentQuestion, ...updates }
            : state.currentQuestion,
      }));
    } catch (error) {
      console.error("Failed to update question:", error);
    }
  },

  deleteQuestion: async (id) => {
    try {
      await window.electronAPI.deleteInterviewQuestion(id);
      set((state) => ({
        questions: state.questions.filter((q) => q.id !== id),
        currentQuestion:
          state.currentQuestion?.id === id ? null : state.currentQuestion,
      }));
    } catch (error) {
      console.error("Failed to delete question:", error);
    }
  },

  setCurrentQuestion: (question) => set({ currentQuestion: question }),

  setStoryFilters: (filters) => {
    set((state) => ({
      storyFilters: { ...state.storyFilters, ...filters },
    }));
  },

  clearStoryFilters: () => set({ storyFilters: {} }),

  getFilteredStories: () => {
    const { stories, storyFilters } = get();

    return stories.filter((story) => {
      if (
        storyFilters.competency &&
        story.competency !== storyFilters.competency
      ) {
        return false;
      }
      if (storyFilters.tags && storyFilters.tags.length > 0) {
        const storyTags = story.tags || [];
        if (!storyFilters.tags.some((tag) => storyTags.includes(tag))) {
          return false;
        }
      }
      return true;
    });
  },

  setQuestionFilters: (filters) => {
    set((state) => ({
      questionFilters: { ...state.questionFilters, ...filters },
    }));
  },

  clearQuestionFilters: () => set({ questionFilters: {} }),

  getFilteredQuestions: () => {
    const { questions, questionFilters } = get();

    return questions.filter((question) => {
      if (
        questionFilters.job_listing_id &&
        question.job_listing_id !== questionFilters.job_listing_id
      ) {
        return false;
      }
      if (
        questionFilters.question_type &&
        question.question_type !== questionFilters.question_type
      ) {
        return false;
      }
      return true;
    });
  },

  linkStoryToQuestion: async (storyId, questionId) => {
    try {
      await window.electronAPI.linkStoryToQuestion(storyId, questionId);
      set((state) => ({
        questions: state.questions.map((q) =>
          q.id === questionId ? { ...q, suggested_story_id: storyId } : q,
        ),
      }));
    } catch (error) {
      console.error("Failed to link story to question:", error);
    }
  },

  unlinkStoryFromQuestion: async (questionId) => {
    try {
      await window.electronAPI.unlinkStoryFromQuestion(questionId);
      set((state) => ({
        questions: state.questions.map((q) =>
          q.id === questionId ? { ...q, suggested_story_id: undefined } : q,
        ),
      }));
    } catch (error) {
      console.error("Failed to unlink story from question:", error);
    }
  },

  incrementStoryUsage: async (storyId) => {
    try {
      await window.electronAPI.incrementStoryUsage(storyId);
      set((state) => ({
        stories: state.stories.map((s) =>
          s.id === storyId
            ? {
                ...s,
                use_count: (s.use_count || 0) + 1,
                last_used_at: new Date().toISOString(),
              }
            : s,
        ),
      }));
    } catch (error) {
      console.error("Failed to increment story usage:", error);
    }
  },

  getMostUsedStories: (limit = 5) => {
    const { stories } = get();
    return [...stories]
      .sort((a, b) => (b.use_count || 0) - (a.use_count || 0))
      .slice(0, limit);
  },

  loadFromBackend: async () => {
    try {
      const stories = await window.electronAPI.getInterviewStories();
      const questions = await window.electronAPI.getInterviewQuestions();
      set({
        stories: (stories as InterviewStory[]) || [],
        questions: (questions as InterviewQuestion[]) || [],
      });
    } catch (error) {
      console.error("Failed to load interview data:", error);
    }
  },

  getCompetencies: () => {
    const { stories } = get();
    const competencies = new Set(stories.map((s) => s.competency));
    return Array.from(competencies);
  },

  getAllTags: () => {
    const { stories } = get();
    const tags = new Set<string>();
    stories.forEach((s) => {
      (s.tags || []).forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  },
}));
