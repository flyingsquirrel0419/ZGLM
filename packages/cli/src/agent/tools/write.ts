import { writeFile, appendFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { captureBeforeWrite } from '../diff.js';

export async function executeWrite(args: {
  path: string;
  content: string;
  mode?: string;
}): Promise<string> {
  const filePath = resolve(args.path);
  const mode = args.mode ?? 'overwrite';

  try {
    await captureBeforeWrite(filePath, args.content);

    const dir = dirname(filePath);
    const cwd = resolve('.');
    if (!dir.startsWith(cwd) && dir !== cwd) {
      await mkdir(dir, { recursive: true });
    } else {
      await mkdir(dir, { recursive: false });
    }

    switch (mode) {
      case 'create': {
        const { access } = await import('node:fs/promises');
        try {
          await access(filePath);
          return `Error: File already exists: ${filePath}`;
        } catch {
          await writeFile(filePath, args.content, 'utf-8');
        }
        break;
      }
      case 'append':
        await appendFile(filePath, args.content, 'utf-8');
        break;
      case 'overwrite':
      default:
        await writeFile(filePath, args.content, 'utf-8');
        break;
    }

    return `Successfully wrote to ${filePath}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error writing file: ${message}`;
  }
}
