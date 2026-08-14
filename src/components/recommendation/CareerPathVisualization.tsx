import { useState, useEffect, useRef } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Badge,
  Group,
  Timeline,
  Alert,
  Button,
  Textarea,
  Loader,
  Collapse,
  ThemeIcon,
  Divider,
  SimpleGrid,
  Paper,
  ScrollArea,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import {
  IconBriefcase,
  IconTrendingUp,
  IconStar,
  IconTarget,
  IconSchool,
  IconSend,
  IconChevronDown,
  IconChevronUp,
  IconAlertTriangle,
  IconRobot,
  IconClock,
  IconCurrency,
  IconMapPin,
  IconBuilding,
  IconUsers,
  IconBrain,
  IconRoute,
  IconSparkles,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../../stores/useUserStore";
import { useAssessmentStore } from "../../stores/useAssessmentStore";
import AIActivityLog from "../common/AIActivityLog";
import type { AILogEntry } from "../common/AIActivityLog";
import { createLogEntry } from "../common/AIActivityLog";

interface CareerStage {
  ageRange: string;
  title: string;
  role: string;
  salary: string;
  skills: string[];
  companies: string[];
  description: string;
  warning?: string; // 反骗提醒
  opportunityCost?: string;
  aiAnswer?: string; // 用户对该阶段提问后AI的回答
  aiLoading?: boolean;
}

interface CareerPath {
  currentAge: number;
  currentRole: string;
  stages: CareerStage[];
  scamWarnings: string[]; // "挂羊头卖狗肉"常见骗局
  overallAdvice: string;
}

export default function CareerPathVisualization() {
  const navigate = useNavigate();
  const profile = useUserStore((s) => s.profile);
  const assessmentResults = useAssessmentStore((s) => s.results);

  const [careerPath, setCareerPath] = useState<CareerPath | null>(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AILogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 每个阶段的用户提问状态
  const [questions, setQuestions] = useState<Record<number, string>>({});
  const [answers, setAnswers] = useState<
    Record<number, { text: string; loading: boolean }>
  >({});

  const mbtiResult = assessmentResults.find((r) => r.type === "mbti");
  const interestResult = assessmentResults.find((r) => r.type === "interest");

  const addLog = (entry: AILogEntry) => setLogs((prev) => [...prev, entry]);

  // 生成职业路径
  const generateCareerPath = async () => {
    if (!profile) {
      setError("请先完善个人档案");
      return;
    }
    setLoading(true);
    setError(null);
    setCareerPath(null);
    setLogs([]);
    setQuestions({});
    setAnswers({});

    try {
      const age = profile.age || 22;
      const major = profile.major || "未知专业";
      const education = profile.education || "本科";
      const name = profile.name || "用户";
      const selfIntro = (profile as any).selfIntro || "";
      const interests = Array.isArray(profile.interests)
        ? profile.interests.join("、")
        : "未知";
      const careerGoals = (profile as any).careerGoals || "未知";
      const mbti = (mbtiResult?.data as any)?.type || "未知";
      const resumeText = (profile as any).resumeText || "";

      addLog(
        createLogEntry(
          "info",
          `开始生成职业路径：${name}，${age}岁，${major}，${education}`,
        ),
      );

      const prompt = `你是一位资深职业规划师和人力资源专家。请为以下用户生成一份**详细的、现实的**职业发展路径规划。

用户信息：
- 姓名：${name}
- 年龄：${age}岁
- 专业：${major}
- 学历：${education}
- 性格类型：${mbti}
- 兴趣方向：${interests}
- 职业目标：${careerGoals}
- 自我介绍：${selfIntro}
${resumeText ? `- 简历摘要：${resumeText.slice(0, 500)}` : ""}

请按以下JSON格式返回（不要markdown代码块）：

{
  "currentRole": "当前身份/角色描述",
  "stages": [
    {
      "ageRange": "22-24岁",
      "title": "阶段标题",
      "role": "推荐岗位名称",
      "salary": "薪资范围",
      "skills": ["需要掌握的技能1", "技能2", "技能3"],
      "companies": ["推荐公司1", "公司2"],
      "description": "这个阶段详细说明（100字以上，包含具体该做什么、怎么做）",
      "warning": "这个阶段常见的'挂羊头卖狗肉'骗局提醒（如有）",
      "opportunityCost": "这个阶段如果选错路的机会成本分析"
    }
  ],
  "scamWarnings": [
    "针对该专业/行业的常见招聘骗局1",
    "骗局2",
    "骗局3"
  ],
  "overallAdvice": "总体建议（200字以上，结合用户年龄、专业、市场现状给出真实可操作的建议）"
}

要求：
1. 从当前年龄开始，每2-3年一个阶段，规划到45岁
2. 每个阶段的薪资要合理真实
3. 推荐的公司要是真实存在的中国知名企业
4. 要特别提醒"挂羊头卖狗肉"的职位（比如管培生实际是销售、储备干部实际是流水线）
5. 每个阶段要说明机会成本：选错路会浪费什么
6. 要结合用户的食品工程专业背景，给出可行的转型路径
7. skills要具体（如"Excel数据透视表"而非"数据分析能力"）
8. description要具体可操作，不要空话套话`;

      addLog(
        createLogEntry("ai_call", "调用 AI 生成职业路径规划", {
          toolName: "chatWithAI",
          prompt: prompt.slice(0, 500) + "...",
        }),
      );

      const response = await window.electronAPI.chatWithAI([
        {
          role: "system",
          content: "你是资深职业规划师，只返回JSON格式的职业路径数据。",
        },
        { role: "user", content: prompt },
      ]);

      addLog(
        createLogEntry("ai_response", "AI 返回职业路径规划", {
          response: (response as string).slice(0, 500) + "...",
        }),
      );

      // 解析JSON
      let jsonStr = (response as string).trim();
      const m = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (m) jsonStr = m[1].trim();
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }

      const data = JSON.parse(jsonStr);
      setCareerPath({
        currentAge: age,
        currentRole: data.currentRole || "求职者",
        stages: data.stages || [],
        scamWarnings: data.scamWarnings || [],
        overallAdvice: data.overallAdvice || "",
      });

      addLog(
        createLogEntry(
          "success",
          `职业路径生成完成：${data.stages?.length || 0} 个阶段，${data.scamWarnings?.length || 0} 条风险提示`,
        ),
      );
    } catch (err: any) {
      setError(`生成失败：${err.message || err}`);
      addLog(createLogEntry("error", `生成失败：${err.message || err}`));
    } finally {
      setLoading(false);
    }
  };

  // 对某个阶段提问
  const askAboutStage = async (stageIndex: number) => {
    const q = questions[stageIndex];
    if (!q?.trim() || !careerPath) return;

    const stage = careerPath.stages[stageIndex];
    setAnswers((prev) => ({
      ...prev,
      [stageIndex]: { text: "", loading: true },
    }));
    setLogs((prev) => [
      ...prev,
      createLogEntry("ai_call", `对「${stage.title}」提问`, {
        prompt: q,
        toolName: "chatWithAI",
      }),
    ]);

    try {
      const response = await window.electronAPI.chatWithAI([
        {
          role: "system",
          content: `你是一位资深职业规划师。用户当前${careerPath.currentAge}岁，正在规划职业路径。当前讨论的阶段是：${stage.title}（${stage.ageRange}），推荐岗位：${stage.role}，推荐公司：${stage.companies.join("、")}。请给出详细、具体、可操作的建议。`,
        },
        { role: "user", content: q },
      ]);

      const answer = response as string;
      setAnswers((prev) => ({
        ...prev,
        [stageIndex]: { text: answer, loading: false },
      }));
      setLogs((prev) => [
        ...prev,
        createLogEntry("ai_response", `AI 回答「${stage.title}」的提问`, {
          response: answer.slice(0, 500) + "...",
        }),
      ]);
    } catch (err: any) {
      setAnswers((prev) => ({
        ...prev,
        [stageIndex]: { text: `回答失败：${err.message}`, loading: false },
      }));
    }
  };

  // 自动加载
  useEffect(() => {
    if (profile && !careerPath && !loading) {
      generateCareerPath();
    }
  }, []);

  const stageColors = [
    "blue",
    "cyan",
    "teal",
    "green",
    "lime",
    "yellow",
    "orange",
    "red",
  ];
  const stageIcons = [
    <IconSchool size={14} />,
    <IconBriefcase size={14} />,
    <IconTrendingUp size={14} />,
    <IconStar size={14} />,
    <IconTarget size={14} />,
    <IconBuilding size={14} />,
    <IconUsers size={14} />,
    <IconBrain size={14} />,
  ];

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={2}>
              <Group gap="sm">
                <IconRoute size={32} color="blue" />
                <span>智能职业路径规划</span>
              </Group>
            </Title>
            <Text c="dimmed" mt="xs">
              基于你的年龄、专业、经历，AI 规划从现在到 45
              岁的详细职业路径，帮你避开招聘陷阱，减少机会成本
            </Text>
          </div>
          <Button
            leftSection={<IconSparkles size={16} />}
            loading={loading}
            onClick={generateCareerPath}
            gradient={{ from: "blue", to: "cyan" }}
            variant="gradient"
          >
            {careerPath ? "重新生成" : "生成职业路径"}
          </Button>
        </Group>

        {error && (
          <Alert color="red" title="错误">
            {error}
          </Alert>
        )}

        {!profile && (
          <Alert color="yellow" title="请先完善个人档案">
            <Group>
              <Text size="sm">
                需要你的年龄、专业、经历等信息才能生成精准的职业路径。
              </Text>
              <Button size="xs" onClick={() => navigate("/self-intro")}>
                填写个人情况
              </Button>
              <Button
                size="xs"
                variant="light"
                onClick={() => navigate("/resume")}
              >
                上传简历
              </Button>
            </Group>
          </Alert>
        )}

        {loading && (
          <Card withBorder shadow="sm" radius="md" padding="xl">
            <Stack gap="md" align="center">
              <Loader size="lg" />
              <Text fw={500}>AI 正在分析你的背景，规划职业路径...</Text>
              <Text size="sm" c="dimmed">
                这可能需要 30-60 秒，请耐心等待
              </Text>
            </Stack>
          </Card>
        )}

        {/* 招聘骗局警告 */}
        {careerPath && careerPath.scamWarnings.length > 0 && (
          <Card
            withBorder
            shadow="sm"
            radius="md"
            padding="lg"
            style={{ borderColor: "var(--mantine-color-red-4)" }}
          >
            <Stack gap="md">
              <Group gap="sm">
                <ThemeIcon size={36} radius="md" color="red" variant="light">
                  <IconAlertTriangle size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={600} c="red">
                    ⚠️ 招聘陷阱预警
                  </Text>
                  <Text size="sm" c="dimmed">
                    基于你的专业和求职意向，以下是常见的"挂羊头卖狗肉"骗局
                  </Text>
                </div>
              </Group>
              <Stack gap="xs">
                {careerPath.scamWarnings.map((warning, i) => (
                  <Group key={i} gap="sm" align="flex-start">
                    <IconX
                      size={16}
                      color="red"
                      style={{ marginTop: 2, flexShrink: 0 }}
                    />
                    <Text size="sm">{warning}</Text>
                  </Group>
                ))}
              </Stack>
            </Stack>
          </Card>
        )}

        {/* 总体建议 */}
        {careerPath && careerPath.overallAdvice && (
          <Card
            withBorder
            shadow="sm"
            radius="md"
            padding="lg"
            style={{ borderColor: "var(--mantine-color-blue-4)" }}
          >
            <Stack gap="md">
              <Group gap="sm">
                <ThemeIcon size={36} radius="md" color="blue" variant="light">
                  <IconBrain size={18} />
                </ThemeIcon>
                <div>
                  <Text fw={600}>💡 AI 职业顾问建议</Text>
                  <Text size="sm" c="dimmed">
                    结合你的年龄（{careerPath.currentAge}岁）、专业和市场现状
                  </Text>
                </div>
              </Group>
              <Text size="sm" style={{ lineHeight: 1.8 }}>
                {careerPath.overallAdvice}
              </Text>
            </Stack>
          </Card>
        )}

        {/* 职业路径时间线 */}
        {careerPath && careerPath.stages.length > 0 && (
          <Card withBorder shadow="sm" radius="md" padding="lg">
            <Title order={4} mb="lg">
              <Group gap="sm">
                <IconClock size={20} />
                <span>你的职业路径（{careerPath.currentAge}岁 → 45岁）</span>
              </Group>
            </Title>

            <Timeline active={0} bulletSize={30} lineWidth={2}>
              {careerPath.stages.map((stage, index) => {
                const color = stageColors[index % stageColors.length];
                const isCurrent = index === 0;
                const answer = answers[index];

                return (
                  <Timeline.Item
                    key={index}
                    bullet={stageIcons[index % stageIcons.length]}
                    title={
                      <Group gap="sm">
                        <Text fw={600}>{stage.title}</Text>
                        <Badge size="sm" color={color} variant="light">
                          {stage.ageRange}
                        </Badge>
                        {isCurrent && (
                          <Badge size="sm" color="green">
                            当前阶段
                          </Badge>
                        )}
                      </Group>
                    }
                    color={color}
                  >
                    <Stack gap="md">
                      {/* 岗位和薪资 */}
                      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="xs">
                        <Group gap="xs">
                          <IconBriefcase size={14} color="gray" />
                          <div>
                            <Text size="xs" c="dimmed">
                              推荐岗位
                            </Text>
                            <Text size="sm" fw={500}>
                              {stage.role}
                            </Text>
                          </div>
                        </Group>
                        <Group gap="xs">
                          <IconCurrency size={14} color="gray" />
                          <div>
                            <Text size="xs" c="dimmed">
                              薪资范围
                            </Text>
                            <Text size="sm" fw={500}>
                              {stage.salary}
                            </Text>
                          </div>
                        </Group>
                        <Group gap="xs">
                          <IconBuilding size={14} color="gray" />
                          <div>
                            <Text size="xs" c="dimmed">
                              目标公司
                            </Text>
                            <Text size="sm" fw={500}>
                              {stage.companies.join("、")}
                            </Text>
                          </div>
                        </Group>
                        <Group gap="xs">
                          <IconTarget size={14} color="gray" />
                          <div>
                            <Text size="xs" c="dimmed">
                              关键技能
                            </Text>
                            <Group gap={4}>
                              {stage.skills.slice(0, 4).map((s, i) => (
                                <Badge key={i} size="xs" variant="light">
                                  {s}
                                </Badge>
                              ))}
                            </Group>
                          </div>
                        </Group>
                      </SimpleGrid>

                      {/* 详细描述 */}
                      <Paper
                        p="md"
                        radius="md"
                        style={{ background: "var(--mantine-color-gray-0)" }}
                      >
                        <Text size="sm" style={{ lineHeight: 1.8 }}>
                          {stage.description}
                        </Text>
                      </Paper>

                      {/* 骗局提醒 */}
                      {stage.warning && (
                        <Alert
                          color="orange"
                          variant="light"
                          icon={<IconAlertTriangle size={16} />}
                        >
                          <Text size="sm" fw={500}>
                            ⚠️ 这个阶段的陷阱：{stage.warning}
                          </Text>
                        </Alert>
                      )}

                      {/* 机会成本 */}
                      {stage.opportunityCost && (
                        <Alert
                          color="yellow"
                          variant="light"
                          icon={<IconClock size={16} />}
                        >
                          <Text size="sm">
                            <strong>⏰ 机会成本：</strong>
                            {stage.opportunityCost}
                          </Text>
                        </Alert>
                      )}

                      {/* AI 所需技能 */}
                      {stage.skills.length > 4 && (
                        <Group gap={4}>
                          <Text size="xs" c="dimmed">
                            全部技能：
                          </Text>
                          {stage.skills.map((s, i) => (
                            <Badge key={i} size="xs" variant="outline">
                              {s}
                            </Badge>
                          ))}
                        </Group>
                      )}

                      <Divider />

                      {/* 用户提问区 */}
                      <Paper p="md" radius="md" withBorder>
                        <Stack gap="sm">
                          <Group gap="sm">
                            <IconRobot size={16} color="violet" />
                            <Text size="sm" fw={500}>
                              对「{stage.title}」有问题？直接问 AI
                            </Text>
                          </Group>
                          <Group gap="sm">
                            <Textarea
                              placeholder={`例如：这个阶段应该考什么证书？${stage.role}的真实工作日常是什么？如何从上一阶段过渡到这个阶段？`}
                              value={questions[index] || ""}
                              onChange={(e) =>
                                setQuestions((prev) => ({
                                  ...prev,
                                  [index]: e.currentTarget.value,
                                }))
                              }
                              style={{ flex: 1 }}
                              minRows={2}
                              maxRows={4}
                              size="sm"
                            />
                            <Button
                              size="sm"
                              leftSection={<IconSend size={14} />}
                              onClick={() => askAboutStage(index)}
                              loading={answer?.loading}
                              disabled={!questions[index]?.trim()}
                              style={{ alignSelf: "flex-end" }}
                            >
                              提问
                            </Button>
                          </Group>
                          {answer && !answer.loading && answer.text && (
                            <Paper
                              p="md"
                              radius="md"
                              style={{
                                background: "var(--mantine-color-violet-0)",
                              }}
                            >
                              <Text
                                size="sm"
                                style={{
                                  lineHeight: 1.8,
                                  whiteSpace: "pre-wrap",
                                }}
                              >
                                {answer.text}
                              </Text>
                            </Paper>
                          )}
                        </Stack>
                      </Paper>
                    </Stack>
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </Card>
        )}

        {/* AI 活动日志 */}
        <AIActivityLog logs={logs} maxHeight={300} />

        {/* 快捷入口 */}
        {careerPath && (
          <Group justify="center" gap="md">
            <Button
              variant="light"
              leftSection={<IconBriefcase size={16} />}
              onClick={() => navigate("/tracker")}
            >
              查看投递跟踪
            </Button>
            <Button
              variant="light"
              leftSection={<IconFileText size={16} />}
              onClick={() => navigate("/resume-generator")}
            >
              生成优化简历
            </Button>
            <Button
              variant="light"
              leftSection={<IconStar size={16} />}
              onClick={() => navigate("/interview")}
            >
              面试准备
            </Button>
          </Group>
        )}
      </Stack>
    </Container>
  );
}

function IconFileText(props: any) {
  return <IconBriefcase {...props} />;
}
