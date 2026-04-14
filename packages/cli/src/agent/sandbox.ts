import type { SandboxLevel } from '@zglm/shared';
import { resolve } from 'node:path';
import { realpathSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';

const DANGEROUS_PATTERNS: RegExp[] = [
  /\brm\s+-rf\s+[/]/,
  />\s*\/etc\//,
  /\bchmod\s+777\b/,
  /\bsudo\s+/,
  /curl\s+.*\|\s*sh/,
  /\beval\s*\(/,
  /\bdd\s+if=/,
  /\bmkfs\b/,
  />\s*\/dev\/sd/,
  /\biptables\b/,
  /\brm\s+-rf\s+~/,
];

const DEFAULT_DENIED_PATHS: string[] = [
  '/etc',
  '/usr/bin',
  '/usr/sbin',
  '/bin',
  '/sbin',
  resolve(homedir(), '.ssh'),
  '/root/.ssh',
  '/var/log',
];

export interface SandboxConfig {
  deniedPaths: string[];
  allowedCommands: string[];
}

function resolveRealPath(filePath: string): string {
  const resolved = resolve(filePath);
  if (existsSync(resolved)) {
    try {
      return realpathSync(resolved);
    } catch {
      return resolved;
    }
  }
  return resolved;
}

function isPathUnder(parent: string, child: string): boolean {
  const parentNorm = parent.endsWith('/') ? parent : `${parent}/`;
  return child === parent || child.startsWith(parentNorm);
}

export class Sandbox {
  private readonly level: SandboxLevel;
  private readonly deniedPaths: string[];
  private readonly allowedCommands: string[];

  constructor(level: SandboxLevel, config?: Partial<SandboxConfig>) {
    this.level = level;
    this.deniedPaths = [
      ...DEFAULT_DENIED_PATHS,
      ...(config?.deniedPaths ?? []),
    ];
    this.allowedCommands = config?.allowedCommands ?? [];
  }

  checkCommand(command: string): boolean {
    if (this.level === 'none') return true;

    const trimmedCommand = command.trim();

    if (this.level === 'strict' && this.allowedCommands.length > 0) {
      const commandName = trimmedCommand.split(/\s+/)[0];
      if (!this.allowedCommands.includes(commandName)) {
        return false;
      }
    }

    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(trimmedCommand)) {
        return false;
      }
    }

    return true;
  }

  checkPath(filePath: string, operation: 'read' | 'write'): boolean {
    if (this.level === 'none') return true;

    const resolved = resolveRealPath(filePath);

    for (const denied of this.deniedPaths) {
      const resolvedDenied = resolveRealPath(denied);
      if (isPathUnder(resolvedDenied, resolved)) {
        return false;
      }
    }

    if (this.level === 'strict' && operation === 'write') {
      const home = resolveRealPath(homedir());
      const cwd = resolveRealPath(process.cwd());
      if (!isPathUnder(home, resolved) && !isPathUnder(cwd, resolved)) {
        return false;
      }
    }

    return true;
  }
}
