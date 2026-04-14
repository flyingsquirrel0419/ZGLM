import chalk from 'chalk';
import type { Command } from '../types.js';

const BLOCK_CHARS = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];

function renderBar(value: number, max: number, width: number): string {
  const ratio = Math.min(value / max, 1);
  const filled = ratio * width;
  const fullBlocks = Math.floor(filled);
  const partialIndex = Math.floor((filled - fullBlocks) * BLOCK_CHARS.length);
  const partial = BLOCK_CHARS[partialIndex] ?? '';
  const empty = Math.max(0, width - fullBlocks - (partial ? 1 : 0));

  return chalk.green('█'.repeat(fullBlocks)) + chalk.green(partial) + chalk.dim('░'.repeat(empty));
}

function renderUsageDashboard(data: {
  todayTokens: number;
  todayCost: number;
  monthTokens: number;
  monthCost: number;
  monthlyBudget: number;
  sessionCount: number;
}): string {
  const budgetPercent = data.monthlyBudget > 0 ? (data.monthCost / data.monthlyBudget) * 100 : 0;
  const budgetUsed = data.monthlyBudget > 0 ? data.monthCost : 0;
  const budgetBar = renderBar(budgetUsed, data.monthlyBudget || 1, 30);

  const lines = [
    chalk.bold('Usage Dashboard'),
    chalk.dim('─'.repeat(50)),
    '',
    chalk.bold('Today'),
    `  Tokens:  ${data.todayTokens.toLocaleString()}`,
    `  Cost:    $${data.todayCost.toFixed(4)}`,
    '',
    chalk.bold('This Month'),
    `  Tokens:  ${data.monthTokens.toLocaleString()}`,
    `  Cost:    $${data.monthCost.toFixed(4)}`,
    `  Budget:  $${data.monthlyBudget.toFixed(2)}`,
    `  ${budgetBar} ${budgetPercent.toFixed(1)}%`,
    '',
    `  Sessions: ${data.sessionCount}`,
  ];
  return lines.join('\n');
}

export const usageCommand: Command = {
  name: 'usage',
  aliases: ['u'],
  description: 'View token usage and cost tracking',
  usage: '/usage [today|month|cost|reset]',
  async handler(args, ctx) {
    const sub = args[0];

    const session = ctx.state.session;
    const sessionTokens = session?.metadata.totalTokens ?? 0;
    const sessionCost = session?.metadata.totalCost ?? 0;

    if (!sub || sub === 'today') {
      const data = {
        todayTokens: sessionTokens,
        todayCost: sessionCost,
        monthTokens: sessionTokens,
        monthCost: sessionCost,
        monthlyBudget: ctx.config.usage.monthlyBudget,
        sessionCount: 1,
      };
      ctx.output(renderUsageDashboard(data));
      return { success: true };
    }

    if (sub === 'month') {
      const data = {
        todayTokens: sessionTokens,
        todayCost: sessionCost,
        monthTokens: sessionTokens,
        monthCost: sessionCost,
        monthlyBudget: ctx.config.usage.monthlyBudget,
        sessionCount: 1,
      };
      const lines = [
        chalk.bold('Monthly Usage'),
        chalk.dim('─'.repeat(40)),
        `  Tokens:    ${data.monthTokens.toLocaleString()}`,
        `  Cost:      $${data.monthCost.toFixed(4)}`,
        `  Budget:    $${data.monthlyBudget.toFixed(2)}`,
        `  Remaining: $${Math.max(0, data.monthlyBudget - data.monthCost).toFixed(2)}`,
      ];
      ctx.output(lines.join('\n'));
      return { success: true };
    }

    if (sub === 'cost') {
      if (!session) {
        ctx.output(chalk.dim('No active session.'));
        return { success: true };
      }
      const lines = [
        chalk.bold('Session Cost'),
        chalk.dim('─'.repeat(40)),
        `  Total:     $${sessionCost.toFixed(4)}`,
        `  Tokens:    ${sessionTokens.toLocaleString()}`,
        `  Messages:  ${session.messages.length}`,
      ];
      ctx.output(lines.join('\n'));
      return { success: true };
    }

    if (sub === 'reset') {
      ctx.output(`${chalk.yellow('⚠')} Usage counters reset.`);
      return { success: true, data: { action: 'reset' } };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Usage: /usage [today|month|cost|reset]` };
  },
  complete(partial) {
    const subs = ['today', 'month', 'cost', 'reset'];
    return subs.filter((s) => s.startsWith(partial));
  },
};
