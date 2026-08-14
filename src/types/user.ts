export interface UserProfile {
  id: string;
  name: string;
  age: number;
  major: string;
  education?: string;
  graduationYear?: number;
  personality: {
    mbti: string | null;
    extroversion: number;
    openness: number;
    conscientiousness: number;
    agreeableness: number;
    neuroticism: number;
  };
  interests: string[];
  careerGoals?: Record<string, unknown> | string;
  riskPreference: "conservative" | "balanced" | "aggressive";
  selfIntro?: string;
  identity?: string | null;
  gender?: string | null;
  skills?: string[];
  values?: string[];
  resumeText?: string;
  resumePath?: string;
  resume?: {
    fileName?: string;
    filePath?: string;
    extractedText?: string;
  };
  assessmentUnlocked: boolean;
  createdAt: string;
  updatedAt: string;
}
