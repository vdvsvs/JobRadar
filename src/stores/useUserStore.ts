import { create } from "zustand";
import type { UserProfile } from "../types/user";

interface UserState {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  clearProfile: () => void;
  loadFromBackend: () => Promise<void>;
}

function createDefaultProfile(updates: Partial<UserProfile> = {}): UserProfile {
  const now = new Date().toISOString();
  return {
    id: "default",
    name: "",
    age: 0,
    major: "",
    personality: {
      mbti: null,
      extroversion: 50,
      openness: 50,
      conscientiousness: 50,
      agreeableness: 50,
      neuroticism: 50,
    },
    interests: [],
    riskPreference: "balanced",
    assessmentUnlocked: false,
    createdAt: now,
    updatedAt: now,
    ...updates,
  };
}

export const useUserStore = create<UserState>((set, get) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  updateProfile: async (updates) => {
    const backendProfile =
      get().profile || (await window.electronAPI?.getProfile?.());
    const current = backendProfile || createDefaultProfile();
    const updated: UserProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    set({ profile: updated });
    if (window.electronAPI?.saveProfile) {
      try {
        const saved = await window.electronAPI.saveProfile(updated);
        if (saved) {
          set({ profile: saved as UserProfile });
        }
      } catch (e) {
        console.error("Failed to persist profile to backend:", e);
      }
    }
  },
  clearProfile: () => set({ profile: null }),
  loadFromBackend: async () => {
    try {
      const profile = await window.electronAPI?.getProfile?.();
      if (profile) {
        set({ profile: profile as UserProfile });
      }
    } catch (e) {
      console.error("Failed to load profile from backend:", e);
    }
  },
}));
