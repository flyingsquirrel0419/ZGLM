import chalk from 'chalk';
import type { Command, CommandContext, CommandRegistryLike } from '../types.js';

function renderHelpAll(commands: Command[]): string {
  const maxName = Math.max(...commands.map((c) => {
    const aliases = c.aliases ? ` (${c.aliases.join(', ')})` : '';
    return (c.name + aliases).length;
  }), 12);

  const lines: string[] = [
    chalk.bold('Available Commands'),
    chalk.dim('─'.repeat(60)),
  ];

  for (const cmd of commands) {
    const aliases = cmd.aliases ? chalk.dim(` (${cmd.aliases.join(', ')})`) : '';
    const name = padRight(chalk.bold(`/${cmd.name}`) + aliases, maxName + 2);
    lines.push(`  ${name}  ${chalk.dim(cmd.description)}`);
  }

  lines.push('');
  lines.push(chalk.dim('Type /help <command> for detailed usage.'));
  return lines.join('\n');
}

function renderHelpCommand(cmd: Command): string {
  const lines: string[] = [
    chalk.bold(`/${cmd.name}`) + (cmd.aliases ? chalk.dim(` (aliases: ${cmd.aliases.join(', ')})`) : ''),
    chalk.dim('─'.repeat(50)),
    `  ${cmd.description}`,
    '',
    `  Usage: ${chalk.cyan(cmd.usage)}`,
  ];

  if (cmd.subcommands && cmd.subcommands.length > 0) {
    lines.push('');
    lines.push(chalk.bold('  Subcommands:'));
    for (const sub of cmd.subcommands) {
      lines.push(`    ${chalk.green(sub.name.padEnd(12))} ${sub.description}`);
    }
  }

  return lines.join('\n');
}

function getRegistry(ctx: CommandContext): CommandRegistryLike | undefined {
  return ctx.registry;
}

export const helpCommand: Command = {
  name: 'help',
  aliases: ['h', '?'],
  description: 'Show help for commands',
  usage: '/help [command]',
  async handler(args, ctx) {
    const cmdName = args[0]?.replace(/^\//, '');
    const registry = getRegistry(ctx);

    if (!cmdName) {
      if (registry) {
        ctx.output(renderHelpAll(registry.getAll()));
      } else {
        ctx.output(chalk.dim('Command registry not available in context.'));
      }
      return { success: true };
    }

    if (registry) {
      const cmd = registry.get(cmdName);
      if (cmd) {
        ctx.output(renderHelpCommand(cmd));
        return { success: true };
      }
    }

    return { success: false, message: `Unknown command: /${cmdName}` };
  },
  complete(partial, ctx) {
    const registry = getRegistry(ctx);
    if (registry) {
      return registry
        .getAll()
        .map((c) => c.name)
        .filter((n) => n.startsWith(partial));
    }
    return [];
  },
};

function padRight(str: string, len: number): string {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
  const diff = len - stripped.length;
  return diff > 0 ? str + ' '.repeat(diff) : str;
}
