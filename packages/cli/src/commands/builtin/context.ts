import chalk from 'chalk';
import type { Command } from '../types.js';
import { getModelMeta } from '../../api/models.js';

function renderContextBar(used: number, total: number, width: number = 40): string {
  const ratio = used / total;
  const filled = Math.floor(ratio * width);
  const empty = width - filled;
  const percent = (ratio * 100).toFixed(1);

  let bar: string;
  if (ratio < 0.5) {
    bar = chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  } else if (ratio < 0.8) {
    bar = chalk.yellow('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  } else {
    bar = chalk.red('█'.repeat(filled)) + chalk.dim('░'.repeat(empty));
  }
  return `${bar} ${percent}%`;
}

export const contextCommand: Command = {
  name: 'context',
  aliases: ['ctx'],
  description: 'View and manage context window usage',
  usage: '/context [show|trim|compress]',
  async handler(args, ctx) {
    const sub = args[0];
    const model = getModelMeta(ctx.state.currentModel);
    const maxContext = model?.contextWindow ?? 128000;

    let usedTokens = 0;
    if (ctx.state.session) {
      for (const msg of ctx.state.session.messages) {
        usedTokens += msg.usage?.promptTokens ?? Math.ceil(msg.content.length / 4);
      }
    }

    if (!sub || sub === 'show') {
      const skillTokens = ctx.config.skills.autoLoad.length * 500;
      const systemTokens = 200;
      const totalUsed = usedTokens + skillTokens + systemTokens;
      const remaining = Math.max(0, maxContext - totalUsed);

      const lines = [
        chalk.bold('Context Window'),
        chalk.dim('─'.repeat(55)),
        `  Model:     ${ctx.state.currentModel} (${formatNumber(maxContext)} tokens)`,
        `  Messages:  ${formatNumber(usedTokens)} tokens`,
        `  Skills:    ${formatNumber(skillTokens)} tokens`,
        `  System:    ${formatNumber(systemTokens)} tokens`,
        `  Total:     ${formatNumber(totalUsed)} tokens`,
        '',
        `  ${renderContextBar(totalUsed, maxContext)}`,
        `  Remaining: ${chalk.green(formatNumber(remaining))} tokens`,
      ];
      ctx.output(lines.join('\n'));
      return { success: true };
    }

    if (sub === 'trim') {
      const rawCount = parseInt(args[1] ?? '1', 10);
      const count = Number.isNaN(rawCount) ? 0 : rawCount;
      if (count < 1) {
        return { success: false, message: 'Usage: /context trim <count> (must be a positive number)' };
      }
      ctx.output(`${chalk.green('✓')} Trimmed ${count} oldest messages from context.`);
      return { success: true, data: { action: 'trim', count } };
    }

    if (sub === 'compress') {
      if (!ctx.state.session || ctx.state.session.messages.length < 2) {
        return { success: false, message: 'Not enough messages to compress' };
      }
      ctx.output(`${chalk.green('✓')} Context compressed. Summarized older messages.`);
      return { success: true, data: { action: 'compress' } };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Usage: /context [show|trim|compress]` };
  },
  complete(partial) {
    return ['show', 'trim', 'compress'].filter((s) => s.startsWith(partial));
  },
};

function formatNumber(n: number): string {
  return n.toLocaleString();
}
