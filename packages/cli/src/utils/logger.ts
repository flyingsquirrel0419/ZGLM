type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function isDebugEnabled(): boolean {
  const val = process.env.ZGLM_DEBUG;
  return val === 'true' || val === '1';
}

function formatMessage(level: LogLevel, message: string): string {
  const timestamp = new Date().toISOString().slice(11, 23);
  return `[${timestamp}] [${level.toUpperCase().padEnd(5)}] ${message}`;
}

export const logger = {
  debug(message: string, ...args: unknown[]): void {
    if (isDebugEnabled()) {
      process.stderr.write(`${formatMessage('debug', message)}${args.length ? ' ' + args.map(String).join(' ') : ''}\n`);
    }
  },

  info(message: string, ...args: unknown[]): void {
    process.stderr.write(`${formatMessage('info', message)}${args.length ? ' ' + args.map(String).join(' ') : ''}\n`);
  },

  warn(message: string, ...args: unknown[]): void {
    process.stderr.write(`${formatMessage('warn', message)}${args.length ? ' ' + args.map(String).join(' ') : ''}\n`);
  },

  error(message: string, ...args: unknown[]): void {
    process.stderr.write(`${formatMessage('error', message)}${args.length ? ' ' + args.map(String).join(' ') : ''}\n`);
  },
};
