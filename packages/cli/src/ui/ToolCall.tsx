import React from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '@zglm/shared';
import Spinner from './Spinner.js';

interface ToolCallProps {
  name: string;
  arguments: string;
  result?: string;
  duration?: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  theme: Theme;
}

export default function ToolCall({
  name,
  arguments: args,
  result,
  duration,
  status,
  theme,
}: ToolCallProps): React.ReactElement {
  const { colors, icons } = theme;

  const statusIcon = (() => {
    switch (status) {
      case 'pending':
        return <Text color={colors.dim}>○</Text>;
      case 'running':
        return <Spinner color={colors.primary} />;
      case 'completed':
        return <Text color={colors.success}>{icons.success}</Text>;
      case 'error':
        return <Text color={colors.error}>{icons.error}</Text>;
    }
  })();

  const truncatedArgs = args.length > 120 ? args.slice(0, 120) + '...' : args;

  return (
    <Box flexDirection="column" marginY={0} paddingX={1}>
      <Box gap={1}>
        <Text color={colors.muted}>{icons.tool}</Text>
        {statusIcon}
        <Text color={colors.info} bold>{name}</Text>
        {duration !== undefined && (
          <Text color={colors.dim}>{duration}ms</Text>
        )}
      </Box>
      <Box marginLeft={3}>
        <Text color={colors.dim} wrap="truncate">
          {truncatedArgs}
        </Text>
      </Box>
      {result !== undefined && (
        <Box
          marginLeft={3}
          marginTop={0}
          borderStyle="single"
          borderColor={status === 'error' ? colors.error : colors.dim}
          paddingX={1}
        >
          <Text
            color={status === 'error' ? colors.error : colors.muted}
            wrap="wrap"
          >
            {result.length > 500 ? result.slice(0, 500) + '...' : result}
          </Text>
        </Box>
      )}
    </Box>
  );
}
