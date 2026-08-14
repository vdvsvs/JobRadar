import React from "react";
import {
  Box,
  Paper,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  Timeline,
  Center,
} from "@mantine/core";
import { IconBriefcase } from "@tabler/icons-react";
import { ApplicationRecord } from "../../stores/useTrackerStore";
import { JobStatus } from "../../services/ai/AIServiceAdapter";

interface TimelineViewProps {
  applications: ApplicationRecord[];
  onView: (application: ApplicationRecord) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  applications,
  onView,
}) => {
  const getStatusColor = (status: JobStatus): string => {
    const colors: Record<string, string> = {
      [JobStatus.DISCOVERED]: "gray",
      [JobStatus.EVALUATED]: "blue",
      [JobStatus.APPLIED]: "orange",
      [JobStatus.PHONE_SCREEN]: "violet",
      [JobStatus.TECHNICAL_INTERVIEW]: "indigo",
      [JobStatus.ONSITE]: "cyan",
      [JobStatus.OFFER]: "green",
      [JobStatus.ACCEPTED]: "lime",
      [JobStatus.REJECTED]: "red",
      [JobStatus.WITHDRAWN]: "brown",
    };
    return colors[status] || "gray";
  };

  const getStatusLabel = (status: JobStatus): string => {
    const labels: Record<string, string> = {
      [JobStatus.DISCOVERED]: "已发现",
      [JobStatus.EVALUATED]: "已评估",
      [JobStatus.APPLIED]: "已投递",
      [JobStatus.PHONE_SCREEN]: "电话面试",
      [JobStatus.TECHNICAL_INTERVIEW]: "技术面试",
      [JobStatus.ONSITE]: "现场面试",
      [JobStatus.OFFER]: "收到Offer",
      [JobStatus.ACCEPTED]: "已接受",
      [JobStatus.REJECTED]: "已拒绝",
      [JobStatus.WITHDRAWN]: "已撤回",
    };
    return labels[status] || status;
  };

  // 按更新时间倒序排序
  const sortedApplications = [...applications].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  if (sortedApplications.length === 0) {
    return (
      <Paper p="xl" withBorder radius="md">
        <Center py="xl">
          <Stack align="center" gap="sm">
            <IconBriefcase
              size={48}
              stroke={1.5}
              color="var(--mantine-color-dimmed)"
            />
            <Text c="dimmed" size="lg">
              暂无申请记录
            </Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Paper p="md" withBorder radius="md">
      <Text size="lg" fw={700} mb="md">
        申请时间线
      </Text>
      <Timeline
        active={sortedApplications.length - 1}
        bulletSize={24}
        lineWidth={2}
        color="blue"
      >
        {sortedApplications.map((app) => {
          const updatedDate = new Date(app.updated_at);
          return (
            <Timeline.Item
              key={app.id}
              bullet={
                <Box
                  w={12}
                  h={12}
                  style={{
                    borderRadius: "50%",
                    backgroundColor: `var(--mantine-color-${getStatusColor(app.status)}-filled)`,
                  }}
                />
              }
              title={
                <Group
                  justify="space-between"
                  align="flex-start"
                  wrap="nowrap"
                  mb={4}
                >
                  <Box style={{ flex: 1 }}>
                    <Text size="sm" fw={600}>
                      {app.job_title}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {app.company}
                    </Text>
                  </Box>
                  <Badge
                    size="sm"
                    variant="light"
                    color={getStatusColor(app.status)}
                  >
                    {getStatusLabel(app.status)}
                  </Badge>
                </Group>
              }
            >
              <Stack gap="xs">
                <Text size="xs" c="dimmed">
                  {updatedDate.toLocaleDateString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  })}{" "}
                  {updatedDate.toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                {app.notes && (
                  <Text size="sm" c="dimmed">
                    {app.notes}
                  </Text>
                )}
                <Box>
                  <Button
                    size="xs"
                    variant="light"
                    color={getStatusColor(app.status)}
                    onClick={() => onView(app)}
                  >
                    查看详情
                  </Button>
                </Box>
              </Stack>
            </Timeline.Item>
          );
        })}
      </Timeline>
    </Paper>
  );
};

export default TimelineView;
