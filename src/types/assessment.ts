export interface AssessmentResult {
  id: string;
  userId: string;
  type: "mbti" | "bigfive" | "interest" | "career_match";
  data: Record<string, unknown>;
  aiInsights?: string;
  createdAt: string;
}

export interface MBTIResult {
  type: string;
  dimensions: {
    ei: number;
    sn: number;
    tf: number;
    jp: number;
  };
}

export interface BigFiveResult {
  type: string;
  dimensions: {
    extroversion: number;
    openness: number;
    conscientiousness: number;
    agreeableness: number;
    neuroticism: number;
  };
}
