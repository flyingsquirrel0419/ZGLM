import type { TokenUsage, ModelMeta } from '@zglm/shared';
import { MODEL_CATALOG } from '../api/models.js';

export class CostCalculator {
  calculate(usage: TokenUsage, modelId: string): number {
    const model: ModelMeta | undefined = MODEL_CATALOG[modelId];
    if (!model) return 0;

    const inputCost = (usage.promptTokens / 1_000_000) * model.inputPrice;
    const outputCost = (usage.completionTokens / 1_000_000) * model.outputPrice;
    return inputCost + outputCost;
  }

  formatUSD(amount: number): string {
    if (amount === 0) return '$0.0000';
    if (amount < 0.0001) return `$${amount.toExponential(2)}`;
    return `$${amount.toFixed(4)}`;
  }
}

export const costCalculator = new CostCalculator();
