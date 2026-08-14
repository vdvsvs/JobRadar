import React from "react";
import {
  CardProps as MantineCardProps,
  Card,
  Title,
  Text,
  Stack,
  Group,
} from "@mantine/core";

interface AppCardProps extends MantineCardProps {
  title?: string;
  subtitle?: string;
  extra?: React.ReactNode;
}

const CardComponent: React.FC<AppCardProps> = ({
  title,
  subtitle,
  extra,
  children,
  ...props
}) => {
  return (
    <Card withBorder shadow="sm" radius="md" padding="lg" {...props}>
      {(title || subtitle || extra) && (
        <Group justify="space-between" mb="md">
          <div>
            {title && (
              <Title order={3} size="h4">
                {title}
              </Title>
            )}
            {subtitle && (
              <Text size="sm" c="dimmed">
                {subtitle}
              </Text>
            )}
          </div>
          {extra && <div>{extra}</div>}
        </Group>
      )}
      <Stack gap="sm">{children}</Stack>
    </Card>
  );
};

export default CardComponent;
