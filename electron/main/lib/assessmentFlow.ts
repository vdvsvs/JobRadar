export interface AssessmentFlowReport {
  complete: boolean;
  missing: string[];
  mbtiType?: string;
  hollandCode?: string;
  recommendedDirections: string[];
}

interface AssessmentRow {
  type?: unknown;
  data?: unknown;
}

function dataOf(row: AssessmentRow): Record<string, any> {
  if (!row.data) return {};
  if (typeof row.data === "string") {
    try {
      return JSON.parse(row.data);
    } catch {
      return {};
    }
  }
  return typeof row.data === "object" ? (row.data as Record<string, any>) : {};
}

export function validateAssessmentFlow(
  rows: AssessmentRow[],
): AssessmentFlowReport {
  const mbti = rows.find((row) => row.type === "mbti");
  const interest = rows.find((row) => row.type === "interest");
  const mbtiData = mbti ? dataOf(mbti) : {};
  const interestData = interest ? dataOf(interest) : {};
  const mbtiType = mbtiData.mbtiType || mbtiData.type;
  const scores = Array.isArray(interestData.scores) ? interestData.scores : [];
  const hollandCode =
    scores
      .slice(0, 3)
      .map((item: any) => item.category)
      .join("") || interestData.primaryType;

  const missing: string[] = [];
  if (!mbtiType) missing.push("MBTI 性格测试");
  if (!hollandCode) missing.push("霍兰德职业兴趣测试");

  const recommendedDirections = new Set<string>();
  if (/I|T/.test(String(mbtiType))) recommendedDirections.add("后端研发");
  if (/J/.test(String(mbtiType))) recommendedDirections.add("企业应用开发");
  if (/I|R|C/.test(String(hollandCode)))
    recommendedDirections.add("Java 后端开发");
  if (/E|S/.test(String(hollandCode)))
    recommendedDirections.add("项目协作/产品技术支持");
  if (recommendedDirections.size === 0)
    recommendedDirections.add("软件开发实习");

  return {
    complete: missing.length === 0,
    missing,
    mbtiType,
    hollandCode,
    recommendedDirections: Array.from(recommendedDirections),
  };
}
