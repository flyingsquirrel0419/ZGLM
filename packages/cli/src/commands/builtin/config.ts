import chalk from 'chalk';
import type { Command } from '../types.js';

type ConfigPath = string;

function getConfigValue(config: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = config;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setConfigValue(config: Record<string, unknown>, path: string, value: string): boolean {
  const parts = path.split('.');
  let current: Record<string, unknown> = config;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = current[parts[i]];
    if (next === null || next === undefined || typeof next !== 'object') {
      return false;
    }
    current = next as Record<string, unknown>;
  }

  const lastKey = parts[parts.length - 1];
  if (!(lastKey in current)) return false;

  const existing = current[lastKey];
  let parsed: unknown;
  if (typeof existing === 'number') {
    parsed = Number(value);
    if (isNaN(parsed as number)) return false;
  } else if (typeof existing === 'boolean') {
    parsed = value === 'true' || value === '1';
  } else {
    parsed = value;
  }

  current[lastKey] = parsed;
  return true;
}

export const configCommand: Command = {
  name: 'config',
  aliases: ['cfg'],
  description: 'View and modify configuration',
  usage: '/config [get|set|reset] [key] [value]',
  async handler(args, ctx) {
    const sub = args[0];

    if (!sub || sub === 'get') {
      const key = args[1] as ConfigPath | undefined;
      if (key) {
        const value = getConfigValue(ctx.config as unknown as Record<string, unknown>, key);
        if (value === undefined) {
          return { success: false, message: `Unknown config key: ${key}` };
        }
        ctx.output(`${chalk.cyan(key)} = ${chalk.bold(JSON.stringify(value))}`);
        return { success: true };
      }

      const lines: string[] = [chalk.bold('Configuration'), chalk.dim('─'.repeat(50))];
      const sections = Object.entries(ctx.config as unknown as Record<string, unknown>);
      for (const [section, values] of sections) {
        lines.push(chalk.bold(`  [${section}]`));
        if (typeof values === 'object' && values !== null) {
          for (const [k, v] of Object.entries(values as Record<string, unknown>)) {
            lines.push(`    ${chalk.cyan(k.padEnd(20))} ${JSON.stringify(v)}`);
          }
        }
        lines.push('');
      }
      ctx.output(lines.join('\n'));
      return { success: true };
    }

    if (sub === 'set') {
      const key = args[1];
      const value = args[2];
      if (!key || !value) {
        return { success: false, message: 'Usage: /config set <key> <value>' };
      }
      const ok = setConfigValue(ctx.config as unknown as Record<string, unknown>, key, value);
      if (!ok) {
        return { success: false, message: `Failed to set ${key}. Check the key path and value type.` };
      }
      const displayVal = getConfigValue(ctx.config as unknown as Record<string, unknown>, key);
      ctx.output(`${chalk.green('✓')} ${chalk.cyan(key)} = ${chalk.bold(JSON.stringify(displayVal))}`);
      return { success: true };
    }

    if (sub === 'reset') {
      const key = args[1];
      if (!key) {
        ctx.output(`${chalk.yellow('⚠')} All configuration reset to defaults.`);
        return { success: true, data: { action: 'reset' } };
      }
      ctx.output(`${chalk.yellow('⚠')} Config key ${chalk.cyan(key)} reset to default.`);
      return { success: true, data: { action: 'reset', key } };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Usage: /config [get|set|reset] [key] [value]` };
  },
  complete(partial) {
    return ['get', 'set', 'reset'].filter((s) => s.startsWith(partial));
  },
};
