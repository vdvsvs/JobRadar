export interface CompanyRiskInput {
  name: string;
  industry?: string;
  description?: string;
  jobDescription?: string;
  registryStatus?: string;
  newsSummary?: string;
}

export interface CompanyRiskReport {
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  registryRisk: number;
  sentimentRisk: number;
  trainingRisk: number;
  flags: string[];
  recommendations: string[];
}

const REGISTRY_RISK = [/经营异常|严重违法|吊销|注销|失信|被执行|行政处罚/];
const SENTIMENT_RISK = [/欠薪|裁员|暴雷|跑路|劳动仲裁|加班严重|拖欠|纠纷|投诉/];
const TRAINING_RISK = [
  /培训|实训|招生|学费|贷款|包就业|转行|零基础|入职收费|押金/,
];

function scoreBy(patterns: RegExp[], text: string, weight: number): number {
  return Math.min(
    100,
    patterns.reduce(
      (sum, pattern) => sum + (pattern.test(text) ? weight : 0),
      0,
    ),
  );
}

export function assessCompanyRisk(input: CompanyRiskInput): CompanyRiskReport {
  const text = [
    input.name,
    input.industry,
    input.description,
    input.jobDescription,
    input.registryStatus,
    input.newsSummary,
  ]
    .filter(Boolean)
    .join("\n");

  const registryRisk = scoreBy(REGISTRY_RISK, text, 45);
  const sentimentRisk = scoreBy(SENTIMENT_RISK, text, 25);
  const trainingRisk = scoreBy(TRAINING_RISK, text, 30);
  const riskScore = Math.max(
    registryRisk,
    Math.round(sentimentRisk * 0.8 + trainingRisk * 0.7),
  );
  const flags: string[] = [];
  if (registryRisk >= 45) flags.push("工商/司法风险需核验");
  if (sentimentRisk >= 25) flags.push("舆情口碑风险");
  if (trainingRisk >= 30) flags.push("疑似培训/招生包装");
  if (!input.registryStatus) flags.push("未接入工商状态数据");
  if (!input.newsSummary) flags.push("未接入舆情摘要数据");

  const riskLevel =
    riskScore >= 70 ? "high" : riskScore >= 35 ? "medium" : "low";
  const recommendations = [
    "投递前核验国家企业信用信息公示系统、企查查/天眼查等工商状态。",
    "面试前搜索近一年欠薪、裁员、劳动仲裁、培训收费等舆情。",
  ];
  if (trainingRisk >= 30)
    recommendations.unshift(
      "谨慎处理要求培训费、贷款、押金或先培训再就业的岗位。",
    );
  if (registryRisk >= 45)
    recommendations.unshift("工商/司法异常未排除前不建议优先投递。");

  return {
    riskLevel,
    riskScore,
    registryRisk,
    sentimentRisk,
    trainingRisk,
    flags,
    recommendations,
  };
}
