import chalk from 'chalk';
import type { Command } from '../types.js';
import { renderDiffs, applyAllDiffs, rejectAllDiffs, getPendingDiffs } from '../../agent/diff.js';

export const diffCommand: Command = {
  name: 'diff',
  aliases: ['d'],
  description: 'View and manage file diffs',
  usage: '/diff [show|apply|reject|count]',
  async handler(args, ctx) {
    const sub = args[0];

    if (!sub || sub === 'show') {
      const diffs = getPendingDiffs();
      if (diffs.length === 0) {
        ctx.output(chalk.dim('No pending diffs. Files written by the agent will appear here before being applied.'));
        return { success: true };
      }

      const header = `${chalk.bold('Pending Diffs')} (${diffs.length} file${diffs.length > 1 ? 's' : ''})`;
      const diffOutput = renderDiffs();
      ctx.output(`${header}\n${chalk.dim('─'.repeat(50))}\n${diffOutput}`);
      return { success: true, data: { action: 'show', count: diffs.length } };
    }

    if (sub === 'apply') {
      const diffs = getPendingDiffs();
      if (diffs.length === 0) {
        ctx.output(chalk.dim('No pending diffs to apply.'));
        return { success: true };
      }

      const result = await applyAllDiffs();
      if (result.errors.length > 0) {
        ctx.output(`${chalk.yellow('⚠')} Applied ${result.applied} diff(s) with ${result.errors.length} error(s):`);
        for (const err of result.errors) {
          ctx.output(`  ${chalk.red('✗')} ${err}`);
        }
        return { success: false, message: `${result.errors.length} error(s) during apply` };
      }

      ctx.output(`${chalk.green('✓')} Applied ${result.applied} pending diff(s).`);
      return { success: true, data: { action: 'apply', count: result.applied } };
    }

    if (sub === 'reject') {
      const count = rejectAllDiffs();
      if (count === 0) {
        ctx.output(chalk.dim('No pending diffs to reject.'));
        return { success: true };
      }

      ctx.output(`${chalk.yellow('⚠')} Rejected ${count} pending diff(s).`);
      return { success: true, data: { action: 'reject', count } };
    }

    if (sub === 'count') {
      const diffs = getPendingDiffs();
      ctx.output(`${diffs.length} pending diff(s)`);
      return { success: true, data: { action: 'count', count: diffs.length } };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Usage: /diff [show|apply|reject|count]` };
  },
  complete(partial) {
    return ['show', 'apply', 'reject', 'count'].filter((s) => s.startsWith(partial));
  },
};
