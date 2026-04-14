import chalk from 'chalk';
import type { Command } from '../types.js';

export const thinkCommand: Command = {
  name: 'think',
  aliases: ['t'],
  description: 'Toggle extended thinking mode',
  usage: '/think [toggle|on|off]',
  async handler(args, ctx) {
    const sub = args[0];

    if (!sub || sub === 'toggle') {
      const enabled = !ctx.state.thinkingEnabled;
      const state = enabled
        ? chalk.green('enabled')
        : chalk.red('disabled');
      ctx.output(`Thinking mode ${state}`);
      return { success: true, data: { thinkingEnabled: enabled } };
    }

    if (sub === 'on') {
      ctx.output(`Thinking mode ${chalk.green('enabled')}`);
      return { success: true, data: { thinkingEnabled: true } };
    }

    if (sub === 'off') {
      ctx.output(`Thinking mode ${chalk.red('disabled')}`);
      return { success: true, data: { thinkingEnabled: false } };
    }

    return { success: false, message: `Unknown argument: ${sub}. Usage: /think [toggle|on|off]` };
  },
  complete(partial) {
    return ['toggle', 'on', 'off'].filter((s) => s.startsWith(partial));
  },
};
