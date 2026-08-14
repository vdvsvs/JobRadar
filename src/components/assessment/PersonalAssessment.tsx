import React from "react";
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Button,
  Group,
  ThemeIcon,
  Stack,
  Paper,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import {
  IconBrain,
  IconHeart,
  IconChartBar,
  IconArrowRight,
  IconStar,
} from "@tabler/icons-react";
import { useUserStore } from "../../stores/useUserStore";
import CardComponent from "../common/Card";

const assessments = [
  {
    title: "MBTI 性格测试",
    description: "28 道精简题目，快速了解你的性格类型",
    icon: IconBrain,
    color: "blue",
    link: "/assessment/mbti",
    duration: "约 5 分钟",
  },
  {
    title: "五大人格测试",
    description: "30 道题目，全面评估开放性、尽责性、外向性、宜人性、神经质",
    icon: IconStar,
    color: "teal",
    link: "/assessment/bigfive",
    duration: "约 6 分钟",
  },
  {
    title: "霍兰德职业兴趣",
    description: "探索你的职业兴趣倾向，找到适合的职业方向",
    icon: IconHeart,
    color: "red",
    link: "/assessment/interest",
    duration: "约 8 分钟",
  },
  {
    title: "综合职业匹配",
    description: "结合性格、兴趣与能力，评估职业适配度",
    icon: IconChartBar,
    color: "green",
    link: "/assessment/career-match",
    duration: "约 10 分钟",
  },
];

const PersonalAssessment: React.FC = () => {
  const navigate = useNavigate();
  const profile = useUserStore((state) => state.profile);

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="xs">
        个人评估中心
      </Title>
      <Text c="dimmed" mb="xl">
        通过科学的测评工具，深入了解自己的性格、兴趣和职业倾向
      </Text>

      {profile && (
        <CardComponent
          mb="lg"
          title="当前档案"
          subtitle={profile.name}
          extra={
            <Button
              variant="light"
              size="xs"
              onClick={() => navigate("/profile")}
            >
              查看详情
            </Button>
          }
        >
          <Text size="sm">
            MBTI:{" "}
            <Text span fw={500}>
              {profile.personality.mbti || "未测试"}
            </Text>
          </Text>
          <Text size="sm">
            风险偏好:{" "}
            <Text span fw={500}>
              {profile.riskPreference || "未设置"}
            </Text>
          </Text>
        </CardComponent>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {assessments.map((item) => (
          <Paper
            key={item.title}
            shadow="sm"
            p="lg"
            radius="md"
            withBorder
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                navigate(item.link);
              }
            }}
            style={{ cursor: "pointer", height: "100%" }}
            onClick={() => navigate(item.link)}
          >
            <Stack align="center" gap="md">
              <ThemeIcon
                size={60}
                radius="md"
                color={item.color}
                variant="light"
              >
                <item.icon size={30} />
              </ThemeIcon>
              <Text fw={500} size="lg" ta="center">
                {item.title}
              </Text>
              <Text size="sm" c="dimmed" ta="center">
                {item.description}
              </Text>
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  {item.duration}
                </Text>
              </Group>
              <Button
                variant="light"
                color={item.color}
                rightSection={<IconArrowRight size={16} />}
                fullWidth
                mt="sm"
              >
                开始测试
              </Button>
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>
    </Container>
  );
};

export default PersonalAssessment;
