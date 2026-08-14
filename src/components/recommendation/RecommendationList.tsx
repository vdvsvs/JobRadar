import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Group,
  SimpleGrid,
  Alert,
  Tabs,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { IconSparkles, IconRefresh } from "@tabler/icons-react";
import { useCompanyStore } from "../../stores/useCompanyStore";
import { useUserStore } from "../../stores/useUserStore";
import Loading from "../common/Loading";
import MatchScoreCard from "./MatchScoreCard";
import CareerPathVisualization from "./CareerPathVisualization";

const RecommendationList: React.FC = () => {
  const navigate = useNavigate();
  const companies = useCompanyStore((state) => state.companies);
  const profile = useUserStore((state) => state.profile);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  type Dimension = { score: number; reason: string };
  type RecommendationItem = {
    company: (typeof companies)[0];
    matchScore: number;
    reasons: string[];
    dimensions?: {
      stability: Dimension;
      growth: Dimension;
      culture: Dimension;
      location: Dimension;
    };
    matchFactors?: string[];
    risks?: string[];
    actions?: string[];
  };
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(
    [],
  );
  const [activeTab, setActiveTab] = useState<string | null>("match");
  const [notice, setNotice] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const generateRuleBasedRecommendations = () => {
    const scored = companies.map((company) => {
      let score = 50;
      const reasons: string[] = [];

      if (company.stabilityScore >= 80) {
        score += 15;
        reasons.push("公司稳定性高");
      } else if (company.stabilityScore >= 60) {
        score += 8;
        reasons.push("公司稳定性较好");
      }

      if (company.promotionClarity >= 80) {
        score += 15;
        reasons.push("晋升路径清晰");
      } else if (company.promotionClarity >= 60) {
        score += 8;
        reasons.push("晋升机制较为明确");
      }

      if (profile?.personality.mbti) {
        const mbti = profile.personality.mbti;
        if (
          (mbti.includes("E") || mbti.includes("N")) &&
          company.industry === "互联网/科技"
        ) {
          score += 5;
          reasons.push("与你的性格类型匹配");
        }
        if (mbti.includes("J") && company.scale === "large") {
          score += 5;
          reasons.push("适合追求稳定的你");
        }
      }

      if (
        profile?.riskPreference === "conservative" &&
        company.stabilityScore >= 75
      ) {
        score += 10;
        reasons.push("符合你的风险偏好");
      }

      if (company.tags.some((tag) => profile?.interests?.includes(tag))) {
        score += 10;
        reasons.push("符合你的兴趣方向");
      }

      return {
        company,
        matchScore: Math.min(100, score),
        reasons,
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored;
  };

  useEffect(() => {
    const generateRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!companies.length) {
          setRecommendations([]);
          return;
        }

        setRecommendations(generateRuleBasedRecommendations());
      } catch (err) {
        setError("生成推荐失败");
      } finally {
        setLoading(false);
      }
    };

    generateRecommendations();
  }, [companies, profile]);

  const handleRefresh = async () => {
    setGenerating(true);
    setNotice(null);
    try {
      // 前置检查：给出明确的错误提示，而非笼统的"AI 功能暂不可用"
      if (!window.electronAPI?.chatWithAI) {
        setNotice("AI 功能未就绪，请检查配置");
        setGenerating(false);
        return;
      }
      if (!profile) {
        setNotice("请先完善个人情况（MBTI/兴趣/风险偏好）后再使用 AI 推荐");
        setGenerating(false);
        return;
      }
      if (companies.length === 0) {
        setNotice("请先添加公司后再生成推荐");
        setGenerating(false);
        return;
      }
      if (window.electronAPI?.chatWithAI && profile && companies.length > 0) {
        const companyList = companies
          .map(
            (c) =>
              `- ${c.name}（行业:${c.industry}, 稳定性:${c.stabilityScore}, 晋升清晰度:${c.promotionClarity}, 规模:${c.scale}, 标签:${c.tags.join("、")}）`,
          )
          .join("\n");
        const prompt = `你是一位资深职业规划专家。请基于以下用户信息和公司列表，为每家公司生成详细的职业推荐分析。

用户信息：
- MBTI性格：${profile.personality.mbti || "未知"}
- 兴趣方向：${profile.interests?.join("、") || "未知"}
- 风险偏好：${profile.riskPreference || "未知"}

公司列表：
${companyList}

请为每家公司给出匹配度评分(0-100整数)和详细分析。请严格使用以下JSON格式返回（仅返回JSON数组，不要包含其他文字、不要 markdown 代码块）：
[{
  "company": "公司名称",
  "score": 85,
  "dimensions": {
    "stability": {"score": 85, "reason": "稳定性评分具体依据"},
    "growth": {"score": 80, "reason": "成长性评分具体依据"},
    "culture": {"score": 75, "reason": "文化匹配评分具体依据"},
    "location": {"score": 90, "reason": "地域匹配评分具体依据"}
  },
  "reasons": ["总评理由1", "总评理由2"],
  "matchFactors": ["你的XX特质与公司的XX特点匹配"],
  "risks": ["潜在风险提示"],
  "actions": ["建议行动1", "建议行动2"]
}]
要求：
1. 每个维度的 score 是 0-100 整数，reason 必须具体说明评分依据
2. matchFactors 必须关联用户特质（MBTI/兴趣/风险偏好）和公司特点
3. risks 要有具体的风险点，不要笼统
4. actions 要有可操作的步骤
5. 只返回 JSON 数组`;

        const response = await window.electronAPI.chatWithAI([
          { role: "user", content: prompt },
        ]);
        if (!isMountedRef.current) return;

        try {
          // 容错解析：尝试提取 JSON 内容（兼容 markdown 代码块包裹）
          let jsonStr = response.trim();
          const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim();
          }
          // 提取第一个 [ 到最后一个 ]，兼容模型在数组外添加解释文字
          const firstBracket = jsonStr.indexOf("[");
          const lastBracket = jsonStr.lastIndexOf("]");
          if (firstBracket >= 0 && lastBracket > firstBracket) {
            jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
          }
          const parsed = JSON.parse(jsonStr);
          // 运行时校验：AI 必须返回 JSON 数组
          if (!Array.isArray(parsed)) throw new Error("AI 返回格式错误");
          const aiRecommendations = parsed as Array<{
            company: string;
            score: number;
            reasons: string[];
            dimensions?: {
              stability?: Dimension;
              growth?: Dimension;
              culture?: Dimension;
              location?: Dimension;
            };
            matchFactors?: string[];
            risks?: string[];
            actions?: string[];
          }>;

          // 将 AI 返回结果映射回推荐结构（按公司名称匹配）
          const mapped = aiRecommendations
            .map((ai): RecommendationItem | null => {
              const company = companies.find(
                (c) =>
                  c.name === ai.company ||
                  c.name.includes(ai.company) ||
                  ai.company.includes(c.name),
              );
              if (!company) return null;
              const dims = ai.dimensions;
              const fullDims =
                dims &&
                dims.stability &&
                dims.growth &&
                dims.culture &&
                dims.location
                  ? (dims as {
                      stability: Dimension;
                      growth: Dimension;
                      culture: Dimension;
                      location: Dimension;
                    })
                  : undefined;
              return {
                company,
                matchScore: Math.min(100, Math.max(0, ai.score)),
                reasons: Array.isArray(ai.reasons) ? ai.reasons : [],
                dimensions: fullDims,
                matchFactors: Array.isArray(ai.matchFactors)
                  ? ai.matchFactors
                  : undefined,
                risks: Array.isArray(ai.risks) ? ai.risks : undefined,
                actions: Array.isArray(ai.actions) ? ai.actions : undefined,
              };
            })
            .filter((item): item is RecommendationItem => item !== null);

          if (mapped.length > 0) {
            mapped.sort((a, b) => b.matchScore - a.matchScore);
            setRecommendations(mapped);
          } else {
            // AI 返回无法匹配到公司，降级为规则匹配
            setRecommendations(generateRuleBasedRecommendations());
            setNotice("AI 返回结果无法匹配公司，已使用规则匹配生成推荐");
          }
        } catch {
          // JSON 解析失败，降级为规则匹配
          setRecommendations(generateRuleBasedRecommendations());
          setNotice("AI 返回格式无法解析，已使用规则匹配生成推荐");
        }
      } else {
        // AI 不可用，使用规则匹配并显示友好提示
        setRecommendations(generateRuleBasedRecommendations());
        setNotice("AI 功能暂不可用，已使用规则匹配生成推荐");
      }
    } catch (err) {
      // AI 调用失败，降级为规则匹配
      if (isMountedRef.current) {
        setRecommendations(generateRuleBasedRecommendations());
        setNotice("AI 刷新失败，已使用规则匹配生成推荐");
      }
    } finally {
      if (isMountedRef.current) setGenerating(false);
    }
  };

  if (loading) {
    return <Loading message="正在生成推荐..." />;
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md">
          <Alert color="red" title="错误" w="100%">
            {error}
          </Alert>
          <Button onClick={() => navigate("/companies")}>添加公司</Button>
        </Stack>
      </Container>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md">
          <IconSparkles size={48} color="gray" />
          <Text c="dimmed">暂无推荐数据</Text>
          <Button onClick={() => navigate("/companies")}>添加公司</Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            智能推荐
          </Title>
          <Text c="dimmed">基于你的性格、兴趣和风险偏好的个性化推荐</Text>
        </div>
        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={handleRefresh}
          loading={generating}
        >
          AI 刷新
        </Button>
      </Group>

      {notice && (
        <Alert
          color="blue"
          title="提示"
          mb="lg"
          withCloseButton
          onClose={() => setNotice(null)}
        >
          {notice}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab} mb="lg">
        <Tabs.List>
          <Tabs.Tab value="match">匹配推荐</Tabs.Tab>
          <Tabs.Tab value="career">职业路径</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {activeTab === "match" && (
        <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
          {recommendations.map((item) => (
            <MatchScoreCard
              key={item.company.id}
              company={item.company}
              matchScore={item.matchScore}
              reasons={item.reasons}
              dimensions={item.dimensions}
              matchFactors={item.matchFactors}
              risks={item.risks}
              actions={item.actions}
              onClick={() => navigate(`/companies/${item.company.id}`)}
            />
          ))}
        </SimpleGrid>
      )}

      {activeTab === "career" && <CareerPathVisualization />}
    </Container>
  );
};

export default RecommendationList;
