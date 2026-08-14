import { create } from "zustand";
import type { AssessmentResult } from "../types/assessment";

interface AssessmentState {
  results: AssessmentResult[];
  currentResult: AssessmentResult | null;
  loading: boolean;
  setResults: (results: AssessmentResult[]) => void;
  addResult: (result: AssessmentResult) => void;
  setCurrentResult: (result: AssessmentResult | null) => void;
  clearResults: () => void;
  loadFromBackend: () => Promise<void>;
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  results: [],
  currentResult: null,
  loading: false,
  setResults: (results) => set({ results }),
  addResult: (result) =>
    set((state) => ({ results: [result, ...state.results] })),
  setCurrentResult: (currentResult) => set({ currentResult }),
  clearResults: () => set({ results: [], currentResult: null }),
  loadFromBackend: async () => {
    set({ loading: true });
    try {
      const data = (await window.electronAPI?.getAssessments?.()) as
        AssessmentResult[] | undefined;
      set({ results: data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
