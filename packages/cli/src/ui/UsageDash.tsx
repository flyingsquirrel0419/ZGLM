import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from './theme.js';

interface UsageEntry {
  model: string;
  tokens: number;
  cost: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
}

interface UsageDashProps {
  usageByModel: UsageEntry[];
  totalTokens: number;
  totalCost: number;
  dailyUsage: DailyUsage[];
}

function formatUSD(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

function buildBar(value: number, max: number, width: number): string {
  if (max === 0) return '░'.repeat(width);
  const filled = Math.round((value / max) * width);
  return '█'.repeat(Math.min(filled, width)) + '░'.repeat(Math.max(width - filled, 0));
}

export default function UsageDash({
  usageByModel,
  totalTokens,
  totalCost,
  dailyUsage,
}: UsageDashProps): React.ReactElement {
  const theme = useTheme();
  const { colors, icons } = theme;

  const maxModelTokens = useMemo(
    () => Math.max(...usageByModel.map((u) => u.tokens), 1),
    [usageByModel],
  );

  const maxDailyTokens = useMemo(
    () => Math.max(...dailyUsage.map((d) => d.tokens), 1),
    [dailyUsage],
  );

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={colors.accent} paddingX={1}>
      <Box marginBottom={1}>
        <Text color={colors.accent} bold>
          Usage Dashboard
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={colors.info} bold>Summary</Text>
        <Box gap={2}>
          <Text>
            <Text color={colors.muted}>{icons.token} Total Tokens:</Text>{' '}
            <Text color={colors.text}>{totalTokens.toLocaleString()}</Text>
          </Text>
          <Text>
            <Text color={colors.muted}>{icons.cost} Total Cost:</Text>{' '}
            <Text color={colors.warning}>{formatUSD(totalCost)}</Text>
          </Text>
        </Box>
      </Box>

      {usageByModel.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.info} bold>By Model</Text>
          {usageByModel.map((entry) => (
            <Box key={entry.model} flexDirection="column">
              <Box gap={1}>
                <Text color={colors.text}>{entry.model}</Text>
                <Text color={colors.muted}>{entry.tokens.toLocaleString()} tok</Text>
                <Text color={colors.warning}>{formatUSD(entry.cost)}</Text>
              </Box>
              <Text color={colors.primary}>{buildBar(entry.tokens, maxModelTokens, 30)}</Text>
            </Box>
          ))}
        </Box>
      )}

      {dailyUsage.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={colors.info} bold>Daily Usage (7d)</Text>
          {dailyUsage.map((day) => (
            <Box key={day.date} flexDirection="column">
              <Box gap={1}>
                <Text color={colors.muted}>{day.date}</Text>
                <Text color={colors.dim}>{day.tokens.toLocaleString()} tok</Text>
              </Box>
              <Text color={colors.secondary}>{buildBar(day.tokens, maxDailyTokens, 30)}</Text>
            </Box>
          ))}
        </Box>
      )}

      {usageByModel.length === 0 && dailyUsage.length === 0 && (
        <Box paddingY={1}>
          <Text color={colors.dim}>No usage data available yet.</Text>
        </Box>
      )}
    </Box>
  );
}
