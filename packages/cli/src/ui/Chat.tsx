import React from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import type {
  Message as ChatMessage,
  Session,
  Theme,
  ThinkingDisplay,
  ZGLMConfig,
} from '@zglm/shared';
import MessageList from './MessageList.js';
import StatusBar from './StatusBar.js';
import Spinner from './Spinner.js';

interface ChatProps {
  messages: ChatMessage[];
  theme: Theme;
  session: Session | null;
  model: string;
  thinkingEnabled: boolean;
  webSearchEnabled: boolean;
  isStreaming: boolean;
  streamingContent?: string;
  streamingThinking?: string;
  error?: string | null;
  input?: string;
  onInputChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  totalCost?: number;
  totalTokens?: number;
  elapsedTime?: number;
  config: ZGLMConfig;
  showThinking?: ThinkingDisplay;
}

export function Chat({
  messages,
  theme,
  session,
  model,
  thinkingEnabled,
  webSearchEnabled,
  isStreaming,
  streamingContent,
  streamingThinking: _streamingThinking,
  error,
  input = '',
  onInputChange: _onInputChange,
  onSubmit,
  totalCost = 0,
  totalTokens = 0,
  elapsedTime = 0,
  showThinking = 'collapsed',
}: ChatProps): React.ReactElement {
  const { colors, icons } = theme;
  const { exit } = useApp();

  useInput((_, key) => {
    if (key.escape) {
      exit();
      return;
    }
    if (key.return && onSubmit) {
      onSubmit(input);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box
        borderStyle="bold"
        borderColor={colors.primary}
        paddingX={1}
        justifyContent="space-between"
      >
        <Box gap={1}>
          <Text color={colors.primary} bold>
            {icons.ai} ZGLM
          </Text>
          <Text color={colors.muted}>
            {session ? session.name : 'New Session'}
          </Text>
        </Box>
        <Box gap={1}>
          <Text color={colors.secondary}>{icons.model} {model}</Text>
          {thinkingEnabled && <Text color={colors.accent}>{icons.thinking} thinking</Text>}
          {webSearchEnabled && <Text color={colors.info}>{icons.web} web</Text>}
        </Box>
      </Box>

      <Box flexGrow={1} flexDirection="column" overflowY="hidden">
        <MessageList messages={messages} theme={theme} showThinking={showThinking} />
      </Box>

      {isStreaming && streamingContent && (
        <Box paddingX={1} flexDirection="column">
          <Text color={colors.aiBubble}>{streamingContent}</Text>
        </Box>
      )}

      {isStreaming && (
        <Box paddingX={1}>
          <Spinner label="Generating..." color={colors.primary} />
        </Box>
      )}

      {error && (
        <Box paddingX={1}>
          <Text color={colors.error}>{icons.error} {error}</Text>
        </Box>
      )}

      <Box borderStyle="single" borderColor={colors.dim} paddingX={1}>
        <Text color={colors.dim}>{icons.user} </Text>
        <Text color={colors.text}>{input || 'Type your message... (Enter to send)'}</Text>
      </Box>

      <StatusBar
        session={session}
        model={model}
        thinkingEnabled={thinkingEnabled}
        webSearchEnabled={webSearchEnabled}
        tokenCount={totalTokens}
        cost={totalCost}
        elapsedTime={elapsedTime}
      />
    </Box>
  );
}

export default Chat;
