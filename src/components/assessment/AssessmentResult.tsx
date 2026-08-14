import React from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Group,
  Card,
  Badge,
  SimpleGrid,
  Divider,
  List,
} from "@mantine/core";
import { useNavigate, useLocation } from "react-router-dom";
import {
  IconArrowLeft,
  IconHome,
  IconBrain,
  IconHeart,
  IconChartBar,
  IconBulb,
  IconBriefcase,
  IconAlertTriangle,
} from "@tabler/icons-react";
import type { AssessmentResult } from "../../types/assessment";

const typeConfig: Record<
  string,
  { title: string; icon: typeof IconBrain; color: string }
> = {
  mbti: { title: "MBTI 性格类型", icon: IconBrain, color: "blue" },
  bigfive: { title: "大五人格测试", icon: IconBrain, color: "green" },
  interest: { title: "霍兰德兴趣测试", icon: IconHeart, color: "red" },
  career_match: { title: "职业匹配", icon: IconChartBar, color: "green" },
};

const getPercent = (value: number, type: string, key?: string) => {
  if (type === "bigfive") return Math.min(100, Math.max(0, Number(value) || 0));
  if (type === "mbti") {
    // MBTI 各维度题数不同：ei/tf 各 4 题（max 20），sn/jp 各 3 题（max 15）
    const max = key === "ei" || key === "tf" ? 20 : 15;
    return Math.min(100, Math.round((Number(value) / max) * 100));
  }
  return Math.min(100, Math.round(Number(value) * 20));
};

const AssessmentResult: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result as AssessmentResult | undefined;

  if (!result) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md">
          <Text c="dimmed">没有找到评估结果</Text>
          <Button onClick={() => navigate("/assessment")}>返回评估中心</Button>
        </Stack>
      </Container>
    );
  }

  const config = typeConfig[result.type];
  const data = result.data as Record<string, unknown>;

  // 从 router state 或结果对象中读取 AI insights
  const aiInsightsRaw =
    (location.state as { aiInsights?: string } | null)?.aiInsights ||
    result.aiInsights;
  let aiInsights: {
    strengths?: string[];
    careers?: string[];
    cautions?: string[];
  } | null = null;
  let parseFailed = false;
  if (aiInsightsRaw) {
    try {
      let jsonStr = aiInsightsRaw.trim();
      const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      }
      const parsed = JSON.parse(jsonStr);
      // 运行时校验：解析结果必须是对象，且数组字段为数组类型
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        aiInsights = {
          strengths: Array.isArray(parsed.strengths)
            ? parsed.strengths
            : undefined,
          careers: Array.isArray(parsed.careers) ? parsed.careers : undefined,
          cautions: Array.isArray(parsed.cautions)
            ? parsed.cautions
            : undefined,
        };
      } else {
        parseFailed = true;
      }
    } catch {
      parseFailed = true;
    }
  }

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2} mb="xs">
            {config.title}结果
          </Title>
          <Text c="dimmed" size="sm">
            评估时间: {new Date(result.createdAt).toLocaleString("zh-CN")}
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => navigate(-1)}
          >
            返回
          </Button>
          <Button
            leftSection={<IconHome size={16} />}
            onClick={() => navigate("/")}
          >
            首页
          </Button>
        </Group>
      </Group>

      <Card withBorder shadow="sm" radius="md" padding="lg" mb="lg">
        <Stack gap="md">
          <Group>
            <config.icon size={40} color={config.color} />
            <div>
              <Title order={3}>
                {result.type === "mbti" &&
                  `你的 MBTI 类型: ${(data as { mbtiType?: string }).mbtiType || "未知"}`}
                {result.type === "bigfive" && "大五人格测试结果"}
                {result.type === "interest" &&
                  `主要兴趣类型: ${(data as { primaryType?: string }).primaryType || "未知"}`}
                {result.type === "career_match" && "职业匹配分析"}
              </Title>
              {result.type === "interest" &&
                (data as { scores?: Array<{ label: string }> }).scores && (
                  <Badge color={config.color} size="lg" mt="xs">
                    {
                      (data as { scores: Array<{ label: string }> }).scores[0]
                        ?.label
                    }
                  </Badge>
                )}
            </div>
          </Group>

          <Divider label="AI 洞察" labelPosition="left" />
          {aiInsights ? (
            <Stack gap="md">
              {aiInsights.strengths && aiInsights.strengths.length > 0 && (
                <Card withBorder p="md" radius="md">
                  <Group gap="xs" mb="xs">
                    <IconBulb size={18} color="var(--mantine-color-green-6)" />
                    <Text fw={500}>职业优势</Text>
                  </Group>
                  <List size="sm" spacing="xs">
                    {aiInsights.strengths.map((item, idx) => (
                      <List.Item key={idx}>{item}</List.Item>
                    ))}
                  </List>
                </Card>
              )}

              {aiInsights.careers && aiInsights.careers.length > 0 && (
                <Card withBorder p="md" radius="md">
                  <Group gap="xs" mb="xs">
                    <IconBriefcase
                      size={18}
                      color="var(--mantine-color-blue-6)"
                    />
                    <Text fw={500}>适合的职业方向</Text>
                  </Group>
                  <List size="sm" spacing="xs">
                    {aiInsights.careers.map((item, idx) => (
                      <List.Item key={idx}>{item}</List.Item>
                    ))}
                  </List>
                </Card>
              )}

              {aiInsights.cautions && aiInsights.cautions.length > 0 && (
                <Card withBorder p="md" radius="md">
                  <Group gap="xs" mb="xs">
                    <IconAlertTriangle
                      size={18}
                      color="var(--mantine-color-orange-6)"
                    />
                    <Text fw={500}>需要注意的短板</Text>
                  </Group>
                  <List size="sm" spacing="xs">
                    {aiInsights.cautions.map((item, idx) => (
                      <List.Item key={idx}>{item}</List.Item>
                    ))}
                  </List>
                </Card>
              )}
            </Stack>
          ) : parseFailed && aiInsightsRaw ? (
            <Card bg="gray.0" p="md" radius="md">
              <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {aiInsightsRaw}
              </Text>
            </Card>
          ) : (
            <Card bg="gray.0" p="md" radius="md">
              <Text size="sm" c="dimmed" ta="center">
                暂无 AI 分析
              </Text>
            </Card>
          )}
        </Stack>
      </Card>

      {(result.type === "mbti" || result.type === "bigfive") &&
        (data as { dimensions?: Record<string, number> }).dimensions && (
          <Card withBorder shadow="sm" radius="md" padding="lg" mb="lg">
            <Title order={4} mb="md">
              {result.type === "mbti" ? "MBTI 维度分析" : "大五人格维度"}
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {Object.entries(
                (data as { dimensions: Record<string, number> }).dimensions,
              ).map(([key, value]) => {
                const percent = getPercent(Number(value), result.type, key);
                return (
                  <div key={key}>
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>
                        {key === "ei" && "外向 (E)"}
                        {key === "sn" && "实感 (S)"}
                        {key === "tf" && "思考 (T)"}
                        {key === "jp" && "判断 (J)"}
                        {key === "extroversion" && "外向性 (E/I)"}
                        {key === "extraversion" && "外向性"}
                        {key === "openness" && "开放性 (S/N)"}
                        {key === "conscientiousness" && "尽责性 (J/P)"}
                        {key === "agreeableness" && "宜人性 (T/F)"}
                        {key === "neuroticism" && "情绪稳定性"}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {percent}%
                      </Text>
                    </Group>
                    <div
                      style={{
                        height: 8,
                        background: "#e9ecef",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${percent}%`,
                          background: "var(--mantine-color-blue-6)",
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </SimpleGrid>
          </Card>
        )}

      {result.type === "interest" &&
        (
          data as {
            scores?: Array<{ category: string; label: string; score: number }>;
          }
        ).scores && (
          <Card withBorder shadow="sm" radius="md" padding="lg" mb="lg">
            <Title order={4} mb="md">
              兴趣类型得分
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
              {(
                data as {
                  scores: Array<{
                    category: string;
                    label: string;
                    score: number;
                  }>;
                }
              ).scores.map((item) => (
                <Card key={item.category} withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>{item.label}</Text>
                      <Text size="xs" c="dimmed">
                        {item.category}
                      </Text>
                    </div>
                    <Badge color="blue" variant="light" size="lg">
                      {item.score} 分
                    </Badge>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          </Card>
        )}

      <Group justify="center" mt="xl">
        <Button onClick={() => navigate("/assessment")} variant="light">
          返回评估中心
        </Button>
        <Button onClick={() => navigate("/self-intro")}>完善个人情况</Button>
        <Button onClick={() => navigate("/recommendations")}>查看推荐</Button>
      </Group>
    </Container>
  );
};

export default AssessmentResult;
