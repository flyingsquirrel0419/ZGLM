import type { Command, CommandContext, CommandResult } from './types.js';

export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private aliasMap: Map<string, string> = new Map();

  register(cmd: Command): void {
    this.commands.set(cmd.name, cmd);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.aliasMap.set(alias, cmd.name);
      }
    }
  }

  unregister(name: string): boolean {
    const cmd = this.commands.get(name);
    if (!cmd) return false;
    this.commands.delete(name);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        this.aliasMap.delete(alias);
      }
    }
    return true;
  }

  get(name: string): Command | undefined {
    const resolved = this.aliasMap.get(name) ?? name;
    return this.commands.get(resolved);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  async execute(input: string, ctx: CommandContext): Promise<CommandResult> {
    const trimmed = input.trim();
    if (!trimmed) {
      return { success: false, message: 'Empty command' };
    }

    const parts = trimmed.split(/\s+/);
    const cmdName = parts[0].replace(/^\//, '');
    const args = parts.slice(1);

    const cmd = this.get(cmdName);
    if (!cmd) {
      return { success: false, message: `Unknown command: /${cmdName}. Type /help for available commands.` };
    }

    try {
      return await cmd.handler(args, ctx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Command /${cmdName} failed: ${msg}` };
    }
  }

  complete(partial: string, ctx: CommandContext): string[] {
    const trimmed = partial.trimStart();
    if (!trimmed.startsWith('/')) return [];

    const text = trimmed.slice(1);
    const parts = text.split(/\s+/);

    if (parts.length <= 1 && !text.includes(' ')) {
      const prefix = parts[0] ?? '';
      const matches: string[] = [];
      for (const [name] of this.commands) {
        if (name.startsWith(prefix)) {
          matches.push(`/${name}`);
        }
      }
      for (const [alias] of this.aliasMap) {
        if (alias.startsWith(prefix)) {
          matches.push(`/${alias}`);
        }
      }
      return matches;
    }

    const cmdName = parts[0];
    const cmd = this.get(cmdName);
    if (cmd?.complete) {
      const rest = text.slice(cmdName.length).trimStart();
      const completions = cmd.complete(rest, ctx);
      return completions.map((c) => `/${cmdName} ${c}`);
    }

    return [];
  }
}
