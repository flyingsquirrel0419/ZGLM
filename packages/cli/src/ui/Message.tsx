import React from 'react';
import { Box, Text } from 'ink';
import type { Message as ChatMessage, Theme, ThinkingDisplay } from '@zglm/shared';
import ThinkingBlock from './ThinkingBlock.js';
import ToolCall from './ToolCall.js';

interface MessageProps {
  message: ChatMessage;
  theme: Theme;
  showThinking: ThinkingDisplay;
}

export default function Message({ message, theme, showThinking }: MessageProps): React.ReactElement {
  const { colors, icons } = theme;

  const roleConfig = (() => {
    switch (message.role) {
      case 'user':
        return {
          icon: icons.user,
          borderColor: colors.primary,
          labelColor: colors.primary,
          bgAttr: undefined,
        };
      case 'assistant':
        return {
          icon: icons.ai,
          borderColor: colors.secondary,
          labelColor: colors.secondary,
          bgAttr: undefined,
        };
      case 'system':
        return {
          icon: '●',
          borderColor: colors.dim,
          labelColor: colors.muted,
          bgAttr: undefined,
        };
      case 'tool':
        return {
          icon: icons.tool,
          borderColor: colors.muted,
          labelColor: colors.muted,
          bgAttr: undefined,
        };
    }
  })();

  const hasThinking = message.thinkingContent && message.thinkingContent.length > 0;
  const showThinkingBlock =
    hasThinking &&
    showThinking !== 'never';

  const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;

  return (
    <Box flexDirection="column" marginY={0}>
      <Box
        borderStyle="single"
        borderColor={roleConfig.borderColor}
        paddingX={1}
        flexDirection="column"
      >
        <Box gap={1}>
          <Text color={roleConfig.labelColor}>{roleConfig.icon}</Text>
          <Text color={roleConfig.labelColor} bold>
            {message.role === 'user'
              ? 'You'
              : message.role === 'assistant'
                ? 'Assistant'
                : message.role === 'system'
                  ? 'System'
                  : `Tool${message.name ? `: ${message.name}` : ''}`}
          </Text>
          {message.model && (
            <Text color={colors.dim}>{message.model}</Text>
          )}
          {message.cost !== undefined && message.cost > 0 && (
            <Text color={colors.warning}>${message.cost.toFixed(4)}</Text>
          )}
        </Box>

        {showThinkingBlock && message.thinkingContent && (
          <ThinkingBlock
            content={message.thinkingContent}
            theme={theme}
            defaultCollapsed={showThinking === 'collapsed'}
          />
        )}

        {message.content && (
          <Box marginTop={0}>
            <Text color={colors.text} wrap="wrap">
              {message.content}
            </Text>
          </Box>
        )}

        {hasToolCalls &&
          message.toolCalls!.map((tc) => (
            <ToolCall
              key={tc.id}
              name={tc.function.name}
              arguments={tc.function.arguments}
              status="completed"
              theme={theme}
            />
          ))}
      </Box>
    </Box>
  );
}
