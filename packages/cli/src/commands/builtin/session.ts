import chalk from 'chalk';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Command } from '../types.js';
import { exportSessionMarkdown, exportSessionJSON } from '../../session/export.js';

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString();
}

function renderSessionList(sessions: Array<{ id: string; name: string; model: string; createdAt: number; updatedAt: number; messageCount: number }>): string {
  if (sessions.length === 0) {
    return chalk.dim('No sessions found.');
  }
  const lines: string[] = [];
  for (const s of sessions) {
    const date = formatDate(s.updatedAt);
    const msgCount = chalk.dim(`${s.messageCount} msgs`);
    const model = chalk.cyan(s.model);
    lines.push(`  ${chalk.green(s.id.slice(0, 8))}  ${chalk.bold(s.name)}  ${model}  ${msgCount}  ${chalk.dim(date)}`);
  }
  return lines.join('\n');
}

export const sessionCommand: Command = {
  name: 'session',
  aliases: ['s'],
  description: 'Manage chat sessions',
  usage: '/session [new|list|load|save|delete|branch|export|rename] [args]',
  async handler(args, ctx) {
    const sub = args[0];

    if (!sub || sub === 'status') {
      if (!ctx.state.session) {
        ctx.output(chalk.dim('No active session.'));
        return { success: true };
      }
      const s = ctx.state.session;
      const lines = [
        `${chalk.bold('Active Session')}`,
        `  ID:        ${s.id}`,
        `  Name:      ${s.name}`,
        `  Model:     ${s.model}`,
        `  Created:   ${formatTimestamp(s.createdAt)}`,
        `  Updated:   ${formatTimestamp(s.updatedAt)}`,
        `  Messages:  ${s.messages.length}`,
        `  Tokens:    ${s.metadata.totalTokens.toLocaleString()}`,
        `  Cost:      $${s.metadata.totalCost.toFixed(4)}`,
        `  Tags:      ${s.tags.length > 0 ? s.tags.join(', ') : chalk.dim('none')}`,
        `  CWD:       ${s.cwd}`,
      ];
      ctx.output(lines.join('\n'));
      return { success: true };
    }

    if (sub === 'new') {
      const name = args.slice(1).join(' ') || `Session ${new Date().toLocaleString()}`;
      if (ctx.sessionManager) {
        const session = await ctx.sessionManager.create(name, ctx.state.currentModel);
        ctx.output(`${chalk.green('✓')} New session created: ${chalk.bold(name)}`);
        return { success: true, data: { session } };
      }
      ctx.output(`${chalk.green('✓')} New session created: ${chalk.bold(name)}`);
      return { success: true, data: { action: 'new', name } };
    }

    if (sub === 'list' || sub === 'ls') {
      if (ctx.sessionManager) {
        try {
          const sessions = await ctx.sessionManager.list();
          const mapped = sessions.map(s => ({
            id: s.id,
            name: s.name,
            model: s.model,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messageCount: s.messages.length,
          }));
          ctx.output(renderSessionList(mapped));
        } catch {
          ctx.output(renderSessionList([]));
        }
      } else {
        ctx.output(renderSessionList([]));
      }
      return { success: true, data: { action: 'list' } };
    }

    if (sub === 'load') {
      const sessionId = args[1];
      if (!sessionId) {
        return { success: false, message: 'Usage: /session load <session-id>' };
      }
      if (ctx.sessionManager) {
        const loaded = await ctx.sessionManager.load(sessionId);
        if (loaded) {
          ctx.output(`${chalk.green('✓')} Session loaded: ${chalk.bold(loaded.name)} (${loaded.messages.length} messages)`);
          return { success: true, data: { session: loaded } };
        }
        return { success: false, message: `Session not found: ${sessionId}` };
      }
      ctx.output(`${chalk.green('✓')} Loading session: ${sessionId}`);
      return { success: true, data: { action: 'load', sessionId } };
    }

    if (sub === 'save') {
      if (!ctx.state.session) {
        return { success: false, message: 'No active session to save' };
      }
      if (ctx.sessionManager) {
        await ctx.sessionManager.save(ctx.state.session);
      }
      ctx.output(`${chalk.green('✓')} Session saved: ${ctx.state.session.name}`);
      return { success: true, data: { action: 'save' } };
    }

    if (sub === 'delete' || sub === 'rm') {
      const sessionId = args[1];
      if (!sessionId) {
        return { success: false, message: 'Usage: /session delete <session-id>' };
      }
      if (ctx.sessionManager) {
        const deleted = await ctx.sessionManager.delete(sessionId);
        if (!deleted) {
          return { success: false, message: `Session not found: ${sessionId}` };
        }
      }
      ctx.output(`${chalk.yellow('⚠')} Session deleted: ${sessionId}`);
      const isCurrentSession = ctx.state.session?.id === sessionId;
      return { success: true, data: { action: 'delete', sessionId, clearSession: isCurrentSession } };
    }

    if (sub === 'branch') {
      if (!ctx.state.session) {
        return { success: false, message: 'No active session to branch from' };
      }
      if (ctx.sessionManager) {
        const branched = await ctx.sessionManager.branch(ctx.state.session);
        const name = args.slice(1).join(' ') || branched.name;
        ctx.output(`${chalk.green('✓')} Branched session: ${chalk.bold(name)} (${branched.id.slice(0, 8)})`);
        return { success: true, data: { session: branched } };
      }
      const name = args.slice(1).join(' ') || `Branch of ${ctx.state.session.name}`;
      ctx.output(`${chalk.green('✓')} Branched session: ${chalk.bold(name)}`);
      return { success: true, data: { action: 'branch', name } };
    }

    if (sub === 'export') {
      if (!ctx.state.session) {
        return { success: false, message: 'No active session to export' };
      }
      const format = args[1] ?? ctx.config.session.exportFormat;
      const dest = args[2] ?? `session-${ctx.state.session.id.slice(0, 8)}`;

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

      try {
        const session = ctx.state.session;
        if (resolved === 'json' || resolved === 'both') {
          const jsonPath = resolved === 'both' ? `${dest}.json` : (dest.endsWith('.json') ? dest : `${dest}.json`);
          await writeFile(resolve(jsonPath), exportSessionJSON(session), 'utf-8');
        }
        if (resolved === 'markdown' || resolved === 'both') {
          const mdPath = resolved === 'both' ? `${dest}.md` : (dest.endsWith('.md') ? dest : `${dest}.md`);
          await writeFile(resolve(mdPath), exportSessionMarkdown(session), 'utf-8');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Export failed: ${msg}` };
      }

      ctx.output(`${chalk.green('✓')} Session exported as ${chalk.bold(resolved)} → ${chalk.cyan(dest)}`);
      return { success: true, data: { action: 'export', format: resolved, path: dest } };
    }

    if (sub === 'rename') {
      if (!ctx.state.session) {
        return { success: false, message: 'No active session to rename' };
      }
      const newName = args.slice(1).join(' ');
      if (!newName) {
        return { success: false, message: 'Usage: /session rename <new-name>' };
      }
      const oldName = ctx.state.session.name;
      ctx.state.session.name = newName;
      if (ctx.sessionManager) {
        await ctx.sessionManager.save(ctx.state.session);
      }
      ctx.output(`${chalk.green('✓')} Session renamed: ${chalk.dim(oldName)} → ${chalk.bold(newName)}`);
      return { success: true, data: { session: ctx.state.session } };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Usage: /session [new|list|load|save|delete|branch|export|rename]` };
  },
  complete(partial) {
    const subs = ['new', 'list', 'ls', 'load', 'save', 'delete', 'rm', 'branch', 'export', 'rename', 'status'];
    return subs.filter((s) => s.startsWith(partial));
  },
};
