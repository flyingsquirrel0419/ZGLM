import React from 'react';
import { Box, Text } from 'ink';
import type { Session, Theme } from '@zglm/shared';
import { useTheme } from './theme.js';

interface StatusBarProps {
  session: Session | null;
  model: string;
  thinkingEnabled: boolean;
  webSearchEnabled: boolean;
  tokenCount: number;
  cost: number;
  elapsedTime?: number;
  theme?: Theme;
}

export default function StatusBar({
  session,
  model,
  thinkingEnabled,
  webSearchEnabled,
  tokenCount,
  cost,
  elapsedTime = 0,
}: StatusBarProps): React.ReactElement {
  const theme = useTheme();
  const { colors, icons } = theme;
  const webStatus = webSearchEnabled ? 'on' : 'off';
  const _elapsed = session
    ? Math.floor((Date.now() - session.createdAt) / 1000)
    : 0;

  return (
    <Box
      borderStyle="single"
      borderColor={colors.dim}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={2}>
        <Text>
          <Text color={colors.muted}>{icons.token}</Text>{' '}
          <Text color={colors.text}>{tokenCount}tok</Text>
        </Text>
        <Text>
          <Text color={colors.accent}>{icons.cost}</Text>{' '}
          <Text color={colors.warning}>${cost.toFixed(4)}</Text>
        </Text>
        <Text>
          <Text color={colors.secondary}>{icons.model}</Text>{' '}
          <Text color={colors.info}>{model}</Text>
        </Text>
        <Text>
          <Text color={colors.muted}>{icons.web}</Text>{' '}
          <Text color={webSearchEnabled ? colors.success : colors.dim}>
            web:{webStatus}
          </Text>
        </Text>
      </Box>
      <Box gap={1}>
        {thinkingEnabled && (
          <Text color={colors.secondary}>thinking</Text>
        )}
        <Text color={colors.dim}>{elapsedTime}s</Text>
      </Box>
    </Box>
  );
}
