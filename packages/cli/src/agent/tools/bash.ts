import { execa } from 'execa';

const DEFAULT_TIMEOUT = 30_000;
const MAX_TIMEOUT = 120_000;

export async function executeBash(args: {
  command: string;
  timeout?: number;
  cwd?: string;
}): Promise<string> {
  const requested = args.timeout ?? DEFAULT_TIMEOUT;
  const timeout = Math.min(requested, MAX_TIMEOUT);

  try {
    const result = await execa(args.command, [], {
      shell: true,
      cwd: args.cwd,
      timeout,
      reject: false,
      maxBuffer: 1024 * 1024,
    });

    const parts: string[] = [];
    if (result.stdout) parts.push(result.stdout);
    if (result.stderr) parts.push(result.stderr);

    if (result.exitCode !== 0) {
      parts.push(`Exit code: ${result.exitCode}`);
    }

    if (result.timedOut) {
      parts.push(`Command timed out after ${timeout}ms`);
    }

    return parts.join('\n') || '(no output)';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error executing command: ${message}`;
  }
}
