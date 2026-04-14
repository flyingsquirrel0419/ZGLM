import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import type { ModelMeta } from '@zglm/shared';
import { useTheme } from './theme.js';

interface ModelPickerProps {
  models: ModelMeta[];
  currentModel: string;
  onSelect: (modelId: string) => void;
  onClose: () => void;
}

export default function ModelPicker({
  models,
  currentModel,
  onSelect,
  onClose,
}: ModelPickerProps): React.ReactElement {
  const theme = useTheme();
  const { colors, icons } = theme;
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = models.findIndex((m) => m.id === currentModel);
    return idx >= 0 ? idx : 0;
  });

  useInput((input, key) => {
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : models.length - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < models.length - 1 ? prev + 1 : 0));
      return;
    }
    if (key.return) {
      onSelect(models[selectedIndex].id);
      return;
    }
  });

  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelMeta[]> = {};
    for (const model of models) {
      const family = model.family;
      if (!groups[family]) groups[family] = [];
      groups[family].push(model);
    }
    return groups;
  }, [models]);

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={colors.secondary} paddingX={1}>
      <Box marginBottom={1}>
        <Text color={colors.secondary} bold>
          {icons.model} Select Model
        </Text>
      </Box>

      {Object.entries(groupedModels).map(([family, familyModels]) => (
        <Box key={family} flexDirection="column" marginBottom={1}>
          <Text color={colors.info} bold>
            {family.toUpperCase()}
          </Text>
          {familyModels.map((model) => {
            const globalIndex = models.indexOf(model);
            const isSelected = globalIndex === selectedIndex;
            const isCurrent = model.id === currentModel;

            return (
              <Box key={model.id} gap={1}>
                <Text color={isSelected ? colors.primary : colors.dim}>
                  {isSelected ? '▸' : ' '}
                </Text>
                <Text
                  color={
                    isSelected
                      ? colors.primary
                      : isCurrent
                        ? colors.success
                        : colors.text
                  }
                  bold={isSelected}
                >
                  {model.displayName}
                </Text>
                <Text color={colors.dim}>{model.params}</Text>
                <Text color={colors.muted}>
                  {model.contextWindow.toLocaleString()} ctx
                </Text>
                <Text color={colors.warning}>
                  ${model.inputPrice}/{model.outputPrice}
                </Text>
                {isCurrent && <Text color={colors.success}>current</Text>}
              </Box>
            );
          })}
        </Box>
      ))}

      <Box marginTop={1}>
        <Text color={colors.dim}>
          ↑↓ navigate · Enter select · Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
