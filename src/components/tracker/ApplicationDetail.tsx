import React from "react";
import {
  Stack,
  Text,
  Badge,
  Button,
  Group,
  Paper,
  Grid,
  Timeline,
  Box,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconClock,
  IconMail,
  IconUser,
  IconCalendar,
  IconBuilding,
  IconBriefcase,
} from "@tabler/icons-react";
import { ApplicationRecord } from "../../stores/useTrackerStore";
import { JobStatus, STATUS_FLOW } from "../../services/ai/AIServiceAdapter";

interface ApplicationDetailProps {
  application: ApplicationRecord;
  onStatusChange: (id: string, newStatus: JobStatus) => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
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

const STATUS_COLORS: Record<string, string> = {
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

const ApplicationDetail: React.FC<ApplicationDetailProps> = ({
  application,
  onStatusChange,
  onClose,
}) => {
  const getStatusLabel = (status: JobStatus) => STATUS_LABELS[status] || status;

  const getStatusColor = (status: JobStatus) => STATUS_COLORS[status] || "gray";

  const getTimelineIcon = (status: JobStatus) => {
    if (status === JobStatus.REJECTED || status === JobStatus.WITHDRAWN) {
      return <IconX size={16} />;
    }
    if (status === JobStatus.ACCEPTED || status === JobStatus.OFFER) {
      return <IconCheck size={16} />;
    }
    return <IconClock size={16} />;
  };

  const getTimelineColor = (status: JobStatus): string => {
    if (status === JobStatus.REJECTED || status === JobStatus.WITHDRAWN)
      return "red";
    if (status === JobStatus.ACCEPTED || status === JobStatus.OFFER)
      return "green";
    return "blue";
  };

  const validNextStatuses = STATUS_FLOW[application.status] || [];

  return (
    <Stack gap="lg">
      {/* 标题和状态 */}
      <Box>
        <Group justify="space-between" align="center" mb="xs">
          <Title order={3}>{application.job_title}</Title>
          <Badge
            color={getStatusColor(application.status)}
            size="lg"
            variant="filled"
          >
            {getStatusLabel(application.status)}
          </Badge>
        </Group>
        <Text c="dimmed" size="sm">
          <IconBuilding
            size={14}
            style={{ verticalAlign: "middle", marginRight: 4 }}
          />
          {application.company}
        </Text>
      </Box>

      {/* 基本信息和备注 */}
      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md">
            <Title order={5} mb="sm">
              基本信息
            </Title>
            <Stack gap="xs">
              <Group gap="xs">
                <IconCalendar size={16} color="var(--mantine-color-dimmed)" />
                <Text size="sm">
                  <strong>投递时间：</strong>
                  {new Date(application.created_at).toLocaleString()}
                </Text>
              </Group>
              <Group gap="xs">
                <IconClock size={16} color="var(--mantine-color-dimmed)" />
                <Text size="sm">
                  <strong>最后更新：</strong>
                  {new Date(application.updated_at).toLocaleString()}
                </Text>
              </Group>
              {application.contact_person && (
                <Group gap="xs">
                  <IconUser size={16} color="var(--mantine-color-dimmed)" />
                  <Text size="sm">
                    <strong>联系人：</strong>
                    {application.contact_person}
                  </Text>
                </Group>
              )}
              {application.contact_email && (
                <Group gap="xs">
                  <IconMail size={16} color="var(--mantine-color-dimmed)" />
                  <Text size="sm">
                    <strong>联系邮箱：</strong>
                    {application.contact_email}
                  </Text>
                </Group>
              )}
              {application.follow_up_date && (
                <Group gap="xs">
                  <IconCalendar size={16} color="var(--mantine-color-dimmed)" />
                  <Text size="sm">
                    <strong>跟进日期：</strong>
                    {new Date(application.follow_up_date).toLocaleDateString()}
                  </Text>
                </Group>
              )}
            </Stack>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md">
            <Title order={5} mb="sm">
              备注
            </Title>
            <Text size="sm">{application.notes || "暂无备注"}</Text>
          </Paper>
        </Grid.Col>
      </Grid>

      {/* 更新状态 */}
      {validNextStatuses.length > 0 && (
        <Paper withBorder p="md">
          <Title order={5} mb="sm">
            更新状态
          </Title>
          <Group gap="xs" wrap="wrap">
            {validNextStatuses.map((status) => (
              <Button
                key={status}
                variant="outline"
                size="compact-sm"
                color={getStatusColor(status)}
                onClick={() => onStatusChange(application.id, status)}
              >
                {getStatusLabel(status)}
              </Button>
            ))}
          </Group>
        </Paper>
      )}

      {/* 状态历史 */}
      <Paper withBorder p="md">
        <Title order={5} mb="sm">
          状态历史
        </Title>
        <Timeline
          active={application.status_history.length - 1}
          bulletSize={24}
          lineWidth={2}
        >
          {application.status_history.map((entry, index) => (
            <Timeline.Item
              key={index}
              bullet={getTimelineIcon(entry.status)}
              title={getStatusLabel(entry.status)}
              color={getTimelineColor(entry.status)}
            >
              <Text c="dimmed" size="xs">
                {new Date(entry.timestamp).toLocaleString()}
              </Text>
              {entry.notes && (
                <Text size="sm" mt={4}>
                  {entry.notes}
                </Text>
              )}
            </Timeline.Item>
          ))}
        </Timeline>
      </Paper>

      {/* 关闭按钮 */}
      <Group justify="flex-end">
        <Button variant="default" onClick={onClose}>
          关闭
        </Button>
      </Group>
    </Stack>
  );
};

export default ApplicationDetail;
