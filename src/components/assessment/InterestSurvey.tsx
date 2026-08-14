import React, { useState, useMemo } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Button,
  Group,
  Progress,
  UnstyledButton,
  Box,
  Card,
  Alert,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { useAssessmentStore } from "../../stores/useAssessmentStore";
import { useUserStore } from "../../stores/useUserStore";

interface Question {
  id: number;
  text: string;
  category: "R" | "I" | "A" | "S" | "E" | "C";
}

const questions: Question[] = [
  { id: 1, text: "我喜欢修理电器或机械", category: "R" },
  { id: 2, text: "我喜欢阅读科技或研究类书籍", category: "I" },
  { id: 3, text: "我喜欢画画、写作或演奏音乐", category: "A" },
  { id: 4, text: "我喜欢帮助他人解决困难", category: "S" },
  { id: 5, text: "我喜欢组织和领导团队活动", category: "E" },
  { id: 6, text: "我喜欢整理文件和数据，保持工作有序", category: "C" },
  { id: 7, text: "我喜欢在户外进行体力劳动", category: "R" },
  { id: 8, text: "我喜欢解决复杂的数学或科学问题", category: "I" },
  { id: 9, text: "我喜欢创作艺术作品或设计东西", category: "A" },
  { id: 10, text: "我喜欢教别人学习新知识", category: "S" },
  { id: 11, text: "我喜欢说服他人接受我的观点", category: "E" },
  { id: 12, text: "我喜欢按照规章制度办事", category: "C" },
  { id: 13, text: "我喜欢操作机器或使用工具", category: "R" },
  { id: 14, text: "我喜欢进行科学实验或研究", category: "I" },
  { id: 15, text: "我喜欢摄影、电影或其他艺术形式", category: "A" },
  { id: 16, text: "我喜欢照顾小孩或老人", category: "S" },
  { id: 17, text: "我喜欢销售或推广产品", category: "E" },
  { id: 18, text: "我喜欢记录和管理财务信息", category: "C" },
  { id: 19, text: "我喜欢种植花草或饲养动物", category: "R" },
  { id: 20, text: "我喜欢分析数据并得出结论", category: "I" },
  { id: 21, text: "我喜欢表演或在公众面前演讲", category: "A" },
  { id: 22, text: "我喜欢为社区或他人服务", category: "S" },
  { id: 23, text: "我喜欢管理项目和协调资源", category: "E" },
  { id: 24, text: "我喜欢处理文书工作和表格", category: "C" },
  { id: 25, text: "我喜欢建造或制作东西", category: "R" },
  { id: 26, text: "我喜欢探索新事物和未知领域", category: "I" },
  { id: 27, text: "我喜欢装饰房间或设计空间", category: "A" },
  { id: 28, text: "我喜欢倾听他人的烦恼并给予建议", category: "S" },
];

const hollandLabels: Record<string, string> = {
  R: "现实型",
  I: "研究型",
  A: "艺术型",
  S: "社会型",
  E: "企业型",
  C: "常规型",
};

const InterestSurvey: React.FC = () => {
  const navigate = useNavigate();
  const addResult = useAssessmentStore((state) => state.addResult);
  const profile = useUserStore((state) => state.profile);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(() => {
    return Math.round(((currentQuestion + 1) / questions.length) * 100);
  }, [currentQuestion]);

  const calculateResult = () => {
    const scores: Record<string, number> = {
      R: 0,
      I: 0,
      A: 0,
      S: 0,
      E: 0,
      C: 0,
    };

    questions.forEach((q) => {
      const answer = answers[q.id];
      if (answer !== undefined) {
        scores[q.category] += answer;
      }
    });

    return Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([key, value]) => ({
        category: key,
        label: hollandLabels[key] || key,
        score: value,
      }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      setError("请回答所有问题");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const result = calculateResult();
      const primaryType = result[0].category;
      const primaryLabel = result[0].label;

      // 生成 AI insights（不阻塞主流程）
      let aiInsights: string | undefined;
      try {
        if (window.electronAPI?.chatWithAI) {
          const scoresDesc = result
            .map((r) => `${r.label}(${r.category}):${r.score}分`)
            .join("、");
          const prompt = `你是一位职业规划专家。用户完成了霍兰德职业兴趣测评，主要兴趣类型为：${primaryLabel}（${primaryType}）。各类型得分：${scoresDesc}。请用中文分析：1. 该兴趣类型的职业优势 2. 适合的职业方向 3. 需要注意的短板。请用 JSON 格式返回：{"strengths": [...], "careers": [...], "cautions": [...]}`;
          const aiResponse = await window.electronAPI.chatWithAI([
            { role: "user", content: prompt },
          ]);
          // 验证返回内容为合法 JSON（兼容 markdown 代码块包裹）
          let jsonStr = aiResponse.trim();
          const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1].trim();
          }
          JSON.parse(jsonStr);
          aiInsights = jsonStr;
        }
      } catch (aiErr) {
        // AI 调用失败，不阻塞跳转
        console.warn("AI insights 生成失败:", aiErr);
      }

      const assessmentResult = {
        id: Date.now().toString(),
        userId: profile?.id || "guest",
        type: "interest" as const,
        data: { primaryType, scores: result },
        aiInsights,
        createdAt: new Date().toISOString(),
      };

      addResult(assessmentResult);

      if (window.electronAPI?.saveAssessment) {
        await window.electronAPI.saveAssessment(assessmentResult);
      }

      navigate("/assessment/result", {
        state: { result: assessmentResult, aiInsights },
      });
    } catch (err) {
      setError("保存评估结果失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = () => {
    const currentQ = questions[currentQuestion];
    if (!currentQ || answers[currentQ.id] === undefined) {
      setError("请选择一个答案");
      return;
    }
    setError(null);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    setError(null);
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const question = questions[currentQuestion];

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="xs">
        霍兰德职业兴趣测试
      </Title>
      <Text c="dimmed" mb="lg">
        探索你的职业兴趣倾向，找到最适合的职业方向
      </Text>

      <Progress value={progress} mb="xl" size="lg" radius="xl" />
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed">
          问题 {currentQuestion + 1} / {questions.length}
        </Text>
        <Text size="sm" c="dimmed">
          非常不喜欢 / 非常喜欢
        </Text>
      </Group>

      <Card withBorder shadow="sm" radius="md" padding="xl" mb="lg">
        <Stack gap="lg">
          <Text size="lg" fw={500}>
            {question.text}
          </Text>

          <Stack gap="sm" role="radiogroup" aria-label={question.text}>
            {[1, 2, 3, 4, 5].map((val) => {
              const isSelected = answers[question.id] === val;
              const labels = [
                "",
                "非常不喜欢",
                "不太喜欢",
                "中立",
                "比较喜欢",
                "非常喜欢",
              ];
              return (
                <UnstyledButton
                  key={val}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setAnswers((prev) => ({ ...prev, [question.id]: val }));
                      setError(null);
                    }
                  }}
                  onClick={() => {
                    setAnswers((prev) => ({ ...prev, [question.id]: val }));
                    setError(null);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: isSelected
                      ? "2px solid var(--mantine-color-blue-6)"
                      : "1px solid var(--mantine-color-gray-3)",
                    backgroundColor: isSelected
                      ? "var(--mantine-color-blue-0)"
                      : "transparent",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                  }}
                >
                  <Box
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      border: isSelected
                        ? "6px solid var(--mantine-color-blue-6)"
                        : "2px solid var(--mantine-color-gray-4)",
                      flexShrink: 0,
                    }}
                  />
                  <Text size="sm">{labels[val]}</Text>
                </UnstyledButton>
              );
            })}
          </Stack>

          {error && (
            <Alert color="red" title="提示">
              {error}
            </Alert>
          )}
        </Stack>
      </Card>

      <Group justify="space-between">
        <Button
          variant="default"
          leftSection={<IconArrowLeft size={16} />}
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          上一题
        </Button>
        <Group>
          <Button variant="subtle" onClick={() => navigate("/assessment")}>
            退出测试
          </Button>
          {currentQuestion === questions.length - 1 ? (
            <Button
              onClick={handleSubmit}
              color="green"
              loading={submitting}
              disabled={submitting}
            >
              查看结果
            </Button>
          ) : (
            <Button
              rightSection={<IconArrowRight size={16} />}
              onClick={handleNext}
            >
              下一题
            </Button>
          )}
        </Group>
      </Group>
    </Container>
  );
};

export default InterestSurvey;
