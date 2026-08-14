import React from "react";
import {
  Box,
  Paper,
  Text,
  SimpleGrid,
  Card,
  Group,
  Stack,
  Progress,
  Badge,
  Center,
  ThemeIcon,
} from "@mantine/core";
import {
  IconBriefcase,
  IconCheck,
  IconTrendingUp,
  IconClock,
  IconX,
  IconCalendar,
} from "@tabler/icons-react";

interface StatsDashboardProps {
  stats: {
    total: number;
    byStatus: { [key: string]: number };
    averageTimeInPipeline: number;
    conversionRate: number;
  };
}

const statusLabels: Record<string, string> = {
  discovered: "已发现",
  evaluated: "已评估",
  applied: "已投递",
  phone_screen: "电话面试",
  technical_interview: "技术面试",
  onsite: "现场面试",
  offer: "收到Offer",
  accepted: "已接受",
  rejected: "已拒绝",
  withdrawn: "已撤回",
};

const statusColors: Record<string, string> = {
  discovered: "gray",
  evaluated: "blue",
  applied: "orange",
  phone_screen: "violet",
  technical_interview: "indigo",
  onsite: "cyan",
  offer: "green",
  accepted: "lime",
  rejected: "red",
  withdrawn: "brown",
};

const mainStatuses = [
  "discovered",
  "evaluated",
  "applied",
  "phone_screen",
  "technical_interview",
  "onsite",
  "offer",
];

const StatsDashboard: React.FC<StatsDashboardProps> = ({ stats }) => {
  const offerCount = stats.byStatus["offer"] || 0;
  const rejectedCount = stats.byStatus["rejected"] || 0;
  const withdrawnCount = stats.byStatus["withdrawn"] || 0;
  const phoneScreenCount = stats.byStatus["phone_screen"] || 0;
  const technicalCount = stats.byStatus["technical_interview"] || 0;
  const onsiteCount = stats.byStatus["onsite"] || 0;

  const overviewCards = [
    {
      label: "总申请数",
      value: String(stats.total),
      icon: IconBriefcase,
      color: "blue",
    },
    {
      label: "收到Offer",
      value: String(offerCount),
      icon: IconCheck,
      color: "green",
    },
    {
      label: "转化率",
      value: `${stats.conversionRate.toFixed(1)}%`,
      icon: IconTrendingUp,
      color: "orange",
    },
    {
      label: "平均周期",
      value: `${stats.averageTimeInPipeline.toFixed(0)}天`,
      icon: IconClock,
      color: "red",
    },
  ];

  return (
    <Stack gap="lg">
      {/* 概览统计卡片 */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {overviewCards.map((card) => (
          <Card key={card.label} withBorder padding="lg" radius="md">
            <Group mb="xs">
              <ThemeIcon
                variant="light"
                color={card.color}
                size="lg"
                radius="md"
              >
                <card.icon size={22} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" fw={500} c="dimmed">
                {card.label}
              </Text>
            </Group>
            <Text size="xl" fw={700}>
              {card.value}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      {/* 状态分布 */}
      <Paper withBorder p="lg" radius="md">
        <Text size="lg" fw={600} mb="md">
          申请状态分布
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          {mainStatuses.map((status) => {
            const count = stats.byStatus[status] || 0;
            const percentage =
              stats.total > 0 ? (count / stats.total) * 100 : 0;
            const color = statusColors[status] || "gray";

            return (
              <Box key={status}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm">{statusLabels[status] || status}</Text>
                  <Text size="sm" fw={700}>
                    {count}
                  </Text>
                </Group>
                <Progress
                  value={percentage}
                  color={color}
                  size="md"
                  radius="xl"
                />
                <Text size="xs" c="dimmed" mt={4}>
                  {percentage.toFixed(1)}%
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </Paper>

      {/* 流失分析 + 面试进展 */}
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {/* 流失分析 */}
        <Paper withBorder p="lg" radius="md">
          <Text size="lg" fw={600} mb="md">
            流失分析
          </Text>
          <Stack gap="lg">
            <Group justify="space-between">
              <Group>
                <ThemeIcon variant="light" color="red" size="lg" radius="md">
                  <IconX size={22} stroke={1.5} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  被拒绝数量
                </Text>
              </Group>
              <Text size="xl" fw={700} c="red">
                {rejectedCount}
              </Text>
            </Group>
            <Group justify="space-between">
              <Group>
                <ThemeIcon variant="light" color="brown" size="lg" radius="md">
                  <IconCalendar size={22} stroke={1.5} />
                </ThemeIcon>
                <Text size="sm" c="dimmed">
                  主动撤回数量
                </Text>
              </Group>
              <Text size="xl" fw={700} c="brown">
                {withdrawnCount}
              </Text>
            </Group>
          </Stack>
        </Paper>

        {/* 面试进展 */}
        <Paper withBorder p="lg" radius="md">
          <Text size="lg" fw={600} mb="md">
            面试进展
          </Text>
          <SimpleGrid cols={3} spacing="md">
            <Center>
              <Stack align="center" gap={4}>
                <Badge variant="light" color="violet" size="lg">
                  {phoneScreenCount}
                </Badge>
                <Text size="sm" ta="center">
                  电话面试
                </Text>
              </Stack>
            </Center>
            <Center>
              <Stack align="center" gap={4}>
                <Badge variant="light" color="indigo" size="lg">
                  {technicalCount}
                </Badge>
                <Text size="sm" ta="center">
                  技术面试
                </Text>
              </Stack>
            </Center>
            <Center>
              <Stack align="center" gap={4}>
                <Badge variant="light" color="cyan" size="lg">
                  {onsiteCount}
                </Badge>
                <Text size="sm" ta="center">
                  现场面试
                </Text>
              </Stack>
            </Center>
          </SimpleGrid>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
};

export default StatsDashboard;
