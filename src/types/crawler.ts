export interface DataSource {
  id: string;
  name: string;
  type: "bing" | "serpapi" | "custom";
  config: {
    apiKey?: string;
    endpoint?: string;
    params?: Record<string, string>;
  };
  createdAt: string;
}

export interface ImportResult {
  success: boolean;
  count: number;
}
