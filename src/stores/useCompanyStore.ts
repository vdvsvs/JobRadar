import { create } from "zustand";
import type { Company, CompanyFilters } from "../types/company";

interface CompanyState {
  companies: Company[];
  filters: CompanyFilters;
  loading: boolean;
  setCompanies: (companies: Company[]) => void;
  loadFromBackend: () => Promise<void>;
  addCompany: (company: Company) => void;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  removeCompany: (id: string) => Promise<void>;
  setFilters: (filters: CompanyFilters) => void;
  clearFilters: () => void;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  companies: [],
  filters: {},
  loading: false,
  setCompanies: (companies) => set({ companies }),
  loadFromBackend: async () => {
    set({ loading: true });
    try {
      const data = (await window.electronAPI?.getCompanies?.()) as
        Company[] | undefined;
      set({ companies: data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },
  addCompany: (company) =>
    set((state) => ({ companies: [company, ...state.companies] })),
  updateCompany: async (id, updates) => {
    const current = get().companies.find((c) => c.id === id);
    if (!current) return;
    const updated = { ...current, ...updates } as Company;
    set((state) => ({
      companies: state.companies.map((c) => (c.id === id ? updated : c)),
    }));
    try {
      await window.electronAPI?.saveCompany?.(updated);
    } catch {
      // ignore persistence errors
    }
  },
  removeCompany: async (id) => {
    set((state) => ({
      companies: state.companies.filter((c) => c.id !== id),
    }));
    try {
      await window.electronAPI?.deleteCompany?.(id);
    } catch {
      // ignore persistence errors
    }
  },
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
}));
