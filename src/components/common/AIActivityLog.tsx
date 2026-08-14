import { useState } from "react";
import {
  Card,
  Stack,
  Group,
  Text,
  Badge,
  ScrollArea,
  Collapse,
  ActionIcon,
  Code,
} from "@mantine/core";
import { IconRobot, IconChevronDown, IconChevronUp } from "@tabler/icons-react";

export interface AILogEntry {
  id: string;
  time: string;
  type:
    | "ai_call"
    | "ai_response"
    | "tool_call"
    | "success"
    | "warning"
    | "error"
    | "info";
  title: string;
  detail?: string;
  prompt?: string;
  response?: string;
  toolName?: string;
}

const LOG_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  info: { label: "信息", color: "blue" },
  ai_call: { label: "AI 调用", color: "violet" },
  ai_response: { label: "AI 响应", color: "grape" },
  tool_call: { label: "工具调用", color: "cyan" },
  success: { label: "完成", color: "green" },
  warning: { label: "警告", color: "yellow" },
  error: { label: "错误", color: "red" },
};

function LogItem({ entry }: { entry: AILogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const badge = LOG_TYPE_BADGE[entry.type] || LOG_TYPE_BADGE.info;
  const hasDetail = entry.detail || entry.prompt || entry.response;

  return (
    <div
      style={{
        padding: "6px 0",
        borderBottom: "1px solid var(--mantine-color-gray-2)",
      }}
    >
      <Group
        gap="xs"
        wrap="nowrap"
        style={{ cursor: hasDetail ? "pointer" : "default" }}
        onClick={() => hasDetail && setExpanded(!expanded)}
      >
        <Text
          size="xs"
          c="dimmed"
          style={{ fontFamily: "monospace", minWidth: 60 }}
        >
          {entry.time}
        </Text>
        <Badge size="xs" color={badge.color} variant="light">
          {badge.label}
        </Badge>
        {entry.toolName && (
          <Badge size="xs" color="cyan" variant="outline">
            {entry.toolName}
          </Badge>
        )}
        <Text size="xs" fw={500} style={{ flex: 1 }}>
          {entry.title}
        </Text>
        {hasDetail && (
          <ActionIcon size="xs" variant="subtle">
            {expanded ? (
              <IconChevronUp size={12} />
            ) : (
              <IconChevronDown size={12} />
            )}
          </ActionIcon>
        )}
      </Group>
      <Collapse in={expanded}>
        <div style={{ marginLeft: 60, marginTop: 4 }}>
          {entry.detail && (
            <Text size="xs" c="dimmed" mb={4}>
              {entry.detail}
            </Text>
          )}
          {entry.prompt && (
            <div style={{ marginBottom: 4 }}>
              <Text size="xs" fw={600} c="violet">
                📤 发送给 AI：
              </Text>
              <Code
                block
                style={{
                  fontSize: 11,
                  maxHeight: 150,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {entry.prompt.length > 500
                  ? entry.prompt.slice(0, 500) + "..."
                  : entry.prompt}
              </Code>
            </div>
          )}
          {entry.response && (
            <div>
              <Text size="xs" fw={600} c="grape">
                📥 AI 返回：
              </Text>
              <Code
                block
                style={{
                  fontSize: 11,
                  maxHeight: 150,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                }}
              >
                {entry.response.length > 500
                  ? entry.response.slice(0, 500) + "..."
                  : entry.response}
              </Code>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  );
}

interface AIActivityLogProps {
  logs: AILogEntry[];
  maxHeight?: number;
  title?: string;
}

export default function AIActivityLog({
  logs,
  maxHeight = 300,
  title = "AI 活动日志",
}: AIActivityLogProps) {
  if (logs.length === 0) return null;

  return (
    <Card withBorder shadow="sm" radius="md" padding="lg">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="sm">
            <IconRobot size={20} color="violet" />
            <Text fw={600}>{title}</Text>
            <Badge size="sm" color="violet" variant="light">
              {logs.length} 条
            </Badge>
          </Group>
        </Group>
        <Text size="xs" c="dimmed">
          点击条目查看 AI 思维链和返回结果
        </Text>
        <ScrollArea h={logs.length > 10 ? maxHeight : undefined}>
          <div style={{ padding: "4px 0" }}>
            {logs.map((entry) => (
              <LogItem key={entry.id} entry={entry} />
            ))}
          </div>
        </ScrollArea>
      </Stack>
    </Card>
  );
}

// 生成日志条目ID和时间戳的工具函数
let logCounter = 0;
export function createLogEntry(
  type: AILogEntry["type"],
  title: string,
  options?: {
    detail?: string;
    prompt?: string;
    response?: string;
    toolName?: string;
  },
): AILogEntry {
  const d = new Date();
  return {
    id: `log-${++logCounter}-${Date.now()}`,
    time: `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`,
    type,
    title,
    ...options,
  };
}
