import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function executeRead(args: {
  path: string;
  start_line?: number;
  end_line?: number;
}): Promise<string> {
  const filePath = resolve(args.path);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.size > MAX_FILE_SIZE) {
      return `Error: File too large (${Math.round(fileStat.size / 1024 / 1024)}MB). Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`;
    }

    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    const start = args.start_line ? Math.max(1, args.start_line) : 1;
    const end = args.end_line ? Math.min(args.end_line, lines.length) : lines.length;

    const selected = lines.slice(start - 1, end);
    const numbered = selected.map((line, i) => `${start + i}: ${line}`);

    return numbered.join('\n') || '(empty file)';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error reading file: ${message}`;
  }
}
