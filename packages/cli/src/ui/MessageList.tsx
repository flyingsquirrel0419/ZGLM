import React from 'react';
import { Box, Text } from 'ink';
import type { Message as ChatMessage, Theme, ThinkingDisplay } from '@zglm/shared';
import Message from './Message.js';

interface MessageListProps {
  messages: ChatMessage[];
  theme: Theme;
  showThinking: ThinkingDisplay;
}

export default function MessageList({
  messages,
  theme,
  showThinking,
}: MessageListProps): React.ReactElement {
  return (
    <Box flexDirection="column" flexGrow={1} overflowY="hidden">
      {messages.map((msg) => (
        <Message key={msg.id} message={msg} theme={theme} showThinking={showThinking} />
      ))}
      {messages.length === 0 && (
        <Box paddingX={1} paddingY={1}>
          <Text color={theme.colors.dim}>No messages yet. Start typing to begin a conversation.</Text>
        </Box>
      )}
    </Box>
  );
}
