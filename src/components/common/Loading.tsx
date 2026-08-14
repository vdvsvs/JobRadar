import React from "react";
import { Loader, Center, Text, Stack } from "@mantine/core";

interface LoadingProps {
  message?: string;
  size?: number;
}

const Loading: React.FC<LoadingProps> = ({
  message = "加载中...",
  size = 40,
}) => {
  return (
    <Center py="xl">
      <Stack align="center" gap="md">
        <Loader size={size} color="blue" />
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      </Stack>
    </Center>
  );
};

export default Loading;
