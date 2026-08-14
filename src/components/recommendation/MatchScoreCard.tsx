import React, { useState } from "react";
import {
  Card,
  Text,
  Badge,
  Stack,
  Group,
  Progress,
  Divider,
  Box,
  Button,
} from "@mantine/core";
import type { Company } from "../../types/company";

interface Dimension {
  score: number;
  reason: string;
}

interface MatchScoreCardProps {
  company: Company;
  matchScore: number;
  reasons: string[];
  dimensions?: {
    stability: Dimension;
    growth: Dimension;
    culture: Dimension;
    location: Dimension;
  };
  matchFactors?: string[];
  risks?: string[];
  actions?: string[];
  onClick?: () => void;
}

const dimensionLabels: Record<string, string> = {
  stability: "稳定性",
  growth: "成长性",
  culture: "文化匹配",
  location: "地域匹配",
};

const MatchScoreCard: React.FC<MatchScoreCardProps> = ({
  company,
  matchScore,
  reasons,
  dimensions,
  matchFactors,
  risks,
  actions,
  onClick,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "green";
    if (score >= 60) return "yellow";
    return "red";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "高度匹配";
    if (score >= 60) return "较为匹配";
    return "一般匹配";
  };

  const visibleReasons = expanded ? reasons : reasons.slice(0, 2);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && e.key === "Enter") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Card
      withBorder
      shadow="sm"
      padding="lg"
      radius="md"
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      style={{ cursor: onClick ? "pointer" : "default", height: "100%" }}
      onClick={onClick}
    >
      <Stack gap="sm">
        <Group justify="space-between">
          <div>
            <Text fw={500} size="lg" lineClamp={1}>
              {company.name}
            </Text>
            <Text size="sm" c="dimmed">
              {company.industry}
            </Text>
          </div>
          <Badge color={getScoreColor(matchScore)} size="lg" variant="filled">
            {matchScore} 分
          </Badge>
        </Group>

        <Group gap="xs">
          <Badge color="blue" variant="light" size="sm">
            {company.scale === "large"
              ? "大型"
              : company.scale === "medium"
                ? "中型"
                : "初创"}
          </Badge>
          <Badge variant="light" color="gray" size="sm">
            {company.location.city}
          </Badge>
        </Group>

        <Progress
          value={matchScore}
          color={getScoreColor(matchScore)}
          size="sm"
          radius="xl"
        />

        <Text size="xs" c="dimmed" ta="center">
          {getScoreLabel(matchScore)}
        </Text>

        {dimensions && (
          <>
            <Divider my="xs" label="分维度评分" labelPosition="center" />
            <Stack gap="xs">
              {Object.entries(dimensions).map(([key, dim]) => (
                <Box key={key}>
                  <Group justify="space-between" mb={2}>
                    <Text size="xs" fw={500}>
                      {dimensionLabels[key] || key}
                    </Text>
                    <Text
                      size="xs"
                      fw={500}
                      c={
                        getScoreColor(dim.score) === "green"
                          ? "teal"
                          : getScoreColor(dim.score) === "yellow"
                            ? "orange"
                            : "red"
                      }
                    >
                      {dim.score}
                    </Text>
                  </Group>
                  <Progress
                    value={dim.score}
                    color={getScoreColor(dim.score)}
                    size="xs"
                    radius="xl"
                    mb={2}
                  />
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    {dim.reason}
                  </Text>
                </Box>
              ))}
            </Stack>
          </>
        )}

        {matchFactors && matchFactors.length > 0 && (
          <>
            <Divider my="xs" label="匹配因素" labelPosition="center" />
            <Stack gap={4}>
              {matchFactors.map((factor, i) => (
                <Text key={`factor-${i}`} size="xs" c="dimmed">
                  • {factor}
                </Text>
              ))}
            </Stack>
          </>
        )}

        {reasons.length > 0 && (
          <>
            <Divider my="xs" label="推荐理由" labelPosition="center" />
            <Stack gap="xs">
              {visibleReasons.map((reason, index) => (
                <Text key={`reason-${index}`} size="xs" c="dimmed">
                  • {reason}
                </Text>
              ))}
              {reasons.length > 2 && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                >
                  {expanded ? "收起" : `展开全部 ${reasons.length} 条`}
                </Button>
              )}
            </Stack>
          </>
        )}

        {risks && risks.length > 0 && (
          <>
            <Divider my="xs" label="风险提示" labelPosition="center" />
            <Stack gap={4}>
              {risks.map((risk, i) => (
                <Text key={`risk-${i}`} size="xs" c="red">
                  • {risk}
                </Text>
              ))}
            </Stack>
          </>
        )}

        {actions && actions.length > 0 && (
          <>
            <Divider my="xs" label="行动建议" labelPosition="center" />
            <Stack gap={4}>
              {actions.map((action, i) => (
                <Text key={`action-${i}`} size="xs" c="blue">
                  • {action}
                </Text>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
};

export default MatchScoreCard;
