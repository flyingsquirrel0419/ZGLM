import React, { useState } from 'react';
import { Box, Text } from 'ink';
import type { Theme } from '@zglm/shared';

interface ThinkingBlockProps {
  content: string;
  theme: Theme;
  defaultCollapsed?: boolean;
}

export default function ThinkingBlock({
  content,
  theme,
  defaultCollapsed = true,
}: ThinkingBlockProps): React.ReactElement {
  const [collapsed, _setCollapsed] = useState(defaultCollapsed);
  const { colors, icons } = theme;

  const toggleLabel = collapsed ? '▶ show thinking' : '▼ hide thinking';
  const lines = content.split('\n');
  const displayContent = collapsed ? lines.slice(0, 3).join('\n') : content;
  const hasMore = collapsed && lines.length > 3;

  return (
    <Box flexDirection="column" marginY={0}>
      <Box paddingX={1}>
        <Text color={colors.secondary} dimColor={collapsed}>
          {icons.thinking} {toggleLabel}
        </Text>
      </Box>
      {collapsed ? (
        <Box paddingX={1}>
          <Text color={colors.dim}>{displayContent}</Text>
          {hasMore && <Text color={colors.dim}> ... (+{lines.length - 3} lines)</Text>}
        </Box>
      ) : (
        <Box
          paddingX={1}
          borderStyle="single"
          borderColor={colors.secondary}
        >
          <Text color={colors.muted} wrap="wrap">
            {displayContent}
          </Text>
        </Box>
      )}
    </Box>
  );
}
