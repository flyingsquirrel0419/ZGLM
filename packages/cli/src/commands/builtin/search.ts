import chalk from 'chalk';
import type { Command } from '../types.js';

export const searchCommand: Command = {
  name: 'search',
  aliases: ['web'],
  description: 'Toggle and configure web search',
  usage: '/search [toggle|on|off|config|query <terms>]',
  async handler(args, ctx) {
    const sub = args[0];

    if (!sub || sub === 'toggle') {
      const enabled = !ctx.state.webSearchEnabled;
      const state = enabled
        ? chalk.green('enabled')
        : chalk.red('disabled');
      ctx.output(`Web search ${state}`);
      return { success: true, data: { webSearchEnabled: enabled } };
    }

    if (sub === 'on') {
      ctx.output(`Web search ${chalk.green('enabled')}`);
      return { success: true, data: { webSearchEnabled: true } };
    }

    if (sub === 'off') {
      ctx.output(`Web search ${chalk.red('disabled')}`);
      return { success: true, data: { webSearchEnabled: false } };
    }

    if (sub === 'config') {
      const cfg = ctx.config.webSearch;
      const lines = [
        chalk.bold('Web Search Configuration'),
        chalk.dim('─'.repeat(40)),
        `  Engine:       ${cfg.engine}`,
        `  Results:      ${cfg.count}`,
        `  Content Size: ${cfg.contentSize}`,
        `  Recency:      ${cfg.recencyFilter}`,
      ];
      ctx.output(lines.join('\n'));
      return { success: true };
    }

    if (sub === 'query') {
      const query = args.slice(1).join(' ');
      if (!query) {
        return { success: false, message: 'Usage: /search query <search terms>' };
      }
      ctx.output(`${chalk.cyan('🔍')} Searching: ${chalk.bold(query)}`);
      return { success: true, data: { action: 'query', query } };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Usage: /search [toggle|on|off|config|query <terms>]` };
  },
  complete(partial) {
    const subs = ['toggle', 'on', 'off', 'config', 'query'];
    return subs.filter((s) => s.startsWith(partial));
  },
};
