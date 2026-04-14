import chalk from 'chalk';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { exportSessionMarkdown, exportSessionJSON } from '../../session/export.js';
import type { Command } from '../types.js';

export const exportCommand: Command = {
  name: 'export',
  aliases: ['ex'],
  description: 'Export session to markdown or JSON',
  usage: '/export [md|json|both] [path]',
  async handler(args, ctx) {
    if (!ctx.state.session) {
      return { success: false, message: 'No active session to export' };
    }

    const format = args[0] ?? 'markdown';
    const path = args[1];
    const session = ctx.state.session;

    const formatMap: Record<string, string> = {
      md: 'markdown',
      markdown: 'markdown',
      json: 'json',
      both: 'both',
    };

    const resolved = formatMap[format] ?? format;
    if (resolved !== 'markdown' && resolved !== 'json' && resolved !== 'both') {
      return { success: false, message: `Unknown format: ${format}. Use: md, json, or both` };
    }

    const dest = path ?? `session-${session.id.slice(0, 8)}`;

    try {
      if (resolved === 'json' || resolved === 'both') {
        const jsonPath = resolved === 'both' ? `${dest}.json` : (dest.endsWith('.json') ? dest : `${dest}.json`);
        const content = exportSessionJSON(session);
        await writeFile(resolve(jsonPath), content, 'utf-8');
      }

      if (resolved === 'markdown' || resolved === 'both') {
        const mdPath = resolved === 'both' ? `${dest}.md` : (dest.endsWith('.md') ? dest : `${dest}.md`);
        const content = exportSessionMarkdown(session);
        await writeFile(resolve(mdPath), content, 'utf-8');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Export failed: ${msg}` };
    }

    ctx.output(`${chalk.green('✓')} Session exported as ${chalk.bold(resolved)} → ${chalk.cyan(dest)}`);
    return { success: true, data: { action: 'export', format: resolved, path: dest } };
  },
  complete(partial) {
    return ['md', 'json', 'both'].filter((s) => s.startsWith(partial));
  },
};
