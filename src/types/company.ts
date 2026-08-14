export interface Company {
  id: string;
  name: string;
  industry: string;
  scale: "startup" | "medium" | "large";
  fundingStage?: string;
  location: {
    city: string;
    district?: string;
  };
  stabilityScore: number;
  promotionClarity: number;
  tags: string[];
  description?: string;
  source: string;
  createdAt: string;
}

export interface CompanyFilters {
  industry?: string;
  city?: string;
  minStabilityScore?: number;
}
