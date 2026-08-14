import React from "react";
import {
  Box,
  Paper,
  Text,
  Badge,
  Card,
  Group,
  Stack,
  ScrollArea,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconEye, IconEdit, IconTrash } from "@tabler/icons-react";
import { ApplicationRecord } from "../../stores/useTrackerStore";
import { JobStatus } from "../../services/ai/AIServiceAdapter";

interface KanbanViewProps {
  applications: ApplicationRecord[];
  onStatusChange: (id: string, newStatus: JobStatus) => void;
  onView: (application: ApplicationRecord) => void;
  onEdit: (application: ApplicationRecord) => void;
  onDelete: (id: string) => void;
}

const KanbanView: React.FC<KanbanViewProps> = ({
  applications,
  onStatusChange,
  onView,
  onEdit,
  onDelete,
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

  const mainStatuses: JobStatus[] = [
    JobStatus.DISCOVERED,
    JobStatus.EVALUATED,
    JobStatus.APPLIED,
    JobStatus.PHONE_SCREEN,
    JobStatus.TECHNICAL_INTERVIEW,
    JobStatus.ONSITE,
    JobStatus.OFFER,
  ];

  const groupedApplications = mainStatuses.reduce<
    Record<string, ApplicationRecord[]>
  >((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status);
    return acc;
  }, {});

  return (
    <ScrollArea>
      <Group align="flex-start" gap="md" wrap="nowrap">
        {mainStatuses.map((status) => (
          <Paper
            key={status}
            shadow="sm"
            radius="md"
            withBorder
            style={{
              minWidth: 280,
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Column Header */}
            <Box
              bg={getStatusColor(status)}
              px="sm"
              py={8}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTopLeftRadius: "var(--mantine-radius-md)",
                borderTopRightRadius: "var(--mantine-radius-md)",
              }}
            >
              <Text size="sm" fw={700} c="white">
                {getStatusLabel(status)}
              </Text>
              <Badge size="sm" variant="white" color={getStatusColor(status)}>
                {groupedApplications[status]?.length || 0}
              </Badge>
            </Box>

            {/* Column Body */}
            <ScrollArea style={{ flex: 1 }}>
              <Stack gap="xs" p="xs">
                {groupedApplications[status]?.length > 0 ? (
                  groupedApplications[status].map((app) => (
                    <Card
                      key={app.id}
                      shadow="xs"
                      padding="sm"
                      radius="sm"
                      withBorder
                      style={{ cursor: "pointer" }}
                    >
                      <Group
                        justify="space-between"
                        align="flex-start"
                        wrap="nowrap"
                      >
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={600} truncate>
                            {app.job_title}
                          </Text>
                          <Text size="xs" c="dimmed" truncate>
                            {app.company}
                          </Text>
                        </Box>
                        <Group gap={4} wrap="nowrap">
                          <Tooltip label="查看">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="blue"
                              onClick={(e) => {
                                e.stopPropagation();
                                onView(app);
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="编辑">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="orange"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(app);
                              }}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="删除">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(app.id);
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>
                      {app.notes && (
                        <Text size="xs" c="dimmed" mt={4} lineClamp={2}>
                          {app.notes}
                        </Text>
                      )}
                    </Card>
                  ))
                ) : (
                  <Text size="sm" c="dimmed" ta="center" py="md">
                    暂无申请
                  </Text>
                )}
              </Stack>
            </ScrollArea>
          </Paper>
        ))}
      </Group>
    </ScrollArea>
  );
};

export default KanbanView;
