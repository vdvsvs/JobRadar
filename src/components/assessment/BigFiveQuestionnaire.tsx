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
  dimension: "O" | "C" | "E" | "A" | "N"; // Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
  reverse?: boolean;
}

const questions: Question[] = [
  // Openness (开放性)
  { id: 1, text: "我对新事物和新想法充满好奇。", dimension: "O" },
  { id: 2, text: "我喜欢尝试不同的生活方式和体验。", dimension: "O" },
  { id: 3, text: "我对艺术和美学有很强的感受力。", dimension: "O" },
  { id: 4, text: "我喜欢思考抽象的概念和理论。", dimension: "O" },
  { id: 5, text: "我经常有丰富的想象力。", dimension: "O" },
  { id: 6, text: "我更喜欢熟悉和传统的事物。", dimension: "O", reverse: true },

  // Conscientiousness (尽责性)
  { id: 7, text: "我做事很有条理，喜欢提前规划。", dimension: "C" },
  { id: 8, text: "我能够坚持完成任务，即使遇到困难。", dimension: "C" },
  { id: 9, text: "我对自己要求严格，追求完美。", dimension: "C" },
  { id: 10, text: "我能够有效管理时间，按时完成任务。", dimension: "C" },
  { id: 11, text: "我做事认真负责，值得信赖。", dimension: "C" },
  { id: 12, text: "我有时候会拖延，不够自律。", dimension: "C", reverse: true },

  // Extraversion (外向性)
  { id: 13, text: "我喜欢社交活动，享受与人交往。", dimension: "E" },
  { id: 14, text: "我在人群中感到精力充沛。", dimension: "E" },
  { id: 15, text: "我喜欢成为注意力的焦点。", dimension: "E" },
  { id: 16, text: "我很容易与陌生人建立联系。", dimension: "E" },
  { id: 17, text: "我通常很活跃，充满活力。", dimension: "E" },
  {
    id: 18,
    text: "我更喜欢独处或与少数亲密朋友在一起。",
    dimension: "E",
    reverse: true,
  },

  // Agreeableness (宜人性)
  { id: 19, text: "我通常很体贴，关心他人的感受。", dimension: "A" },
  { id: 20, text: "我愿意帮助别人，即使会给自己带来不便。", dimension: "A" },
  { id: 21, text: "我通常信任他人，认为人性本善。", dimension: "A" },
  { id: 22, text: "我尽量避免与人发生冲突。", dimension: "A" },
  { id: 23, text: "我通常很谦虚，不喜欢炫耀。", dimension: "A" },
  { id: 24, text: "我有时候会怀疑别人的动机。", dimension: "A", reverse: true },

  // Neuroticism (神经质)
  { id: 25, text: "我经常感到焦虑或担心。", dimension: "N" },
  { id: 26, text: "我情绪波动较大，容易受外界影响。", dimension: "N" },
  { id: 27, text: "我经常感到压力很大。", dimension: "N" },
  { id: 28, text: "我容易感到沮丧或失落。", dimension: "N" },
  { id: 29, text: "我经常担心自己会犯错。", dimension: "N" },
  { id: 30, text: "我通常很冷静，情绪稳定。", dimension: "N", reverse: true },
];

const BigFiveQuestionnaire: React.FC = () => {
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
      O: 0,
      C: 0,
      E: 0,
      A: 0,
      N: 0,
    };

    questions.forEach((q) => {
      const answer = answers[q.id];
      if (answer !== undefined) {
        const value = q.reverse ? 6 - answer : answer;
        scores[q.dimension] += value;
      }
    });

    // 计算百分比（每个维度6题，最高30分）
    const percentages = {
      openness: Math.round((scores.O / 30) * 100),
      conscientiousness: Math.round((scores.C / 30) * 100),
      extraversion: Math.round((scores.E / 30) * 100),
      agreeableness: Math.round((scores.A / 30) * 100),
      neuroticism: Math.round((scores.N / 30) * 100),
    };

    return {
      type: "bigfive",
      dimensions: percentages,
      rawScores: scores,
    };
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

      // 生成 AI insights（不阻塞主流程）
      let aiInsights: string | undefined;
      try {
        if (window.electronAPI?.chatWithAI) {
          const dimensionDesc = `开放性:${result.dimensions.openness}%, 尽责性:${result.dimensions.conscientiousness}%, 外向性:${result.dimensions.extraversion}%, 宜人性:${result.dimensions.agreeableness}%, 神经质:${result.dimensions.neuroticism}%`;
          const prompt = `你是一位职业规划专家。用户完成了大五人格测评，结果如下：${dimensionDesc}。请用中文分析：1. 该人格特质的职业优势 2. 适合的职业方向 3. 需要注意的短板。请用 JSON 格式返回：{"strengths": [...], "careers": [...], "cautions": [...]}`;
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
        type: "bigfive" as const,
        data: result,
        aiInsights,
        createdAt: new Date().toISOString(),
      };

      addResult(assessmentResult);

      if (window.electronAPI?.saveAssessment) {
        await window.electronAPI.saveAssessment(assessmentResult);
      }

      if (profile) {
        useUserStore.getState().updateProfile({
          personality: {
            ...profile.personality,
            ...result.dimensions,
          },
        });
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
        五大人格测试
      </Title>
      <Text c="dimmed" mb="lg">
        请根据你的真实情况选择最符合的选项
      </Text>

      <Progress value={progress} mb="xl" size="lg" radius="xl" />
      <Group justify="space-between" mb="md">
        <Text size="sm" c="dimmed">
          问题 {currentQuestion + 1} / {questions.length}
        </Text>
        <Text size="sm" c="dimmed">
          完全不同意 / 完全同意
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
                "完全不同意",
                "不太同意",
                "中立",
                "比较同意",
                "完全同意",
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

export default BigFiveQuestionnaire;
