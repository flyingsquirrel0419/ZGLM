import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { captureBeforeWrite } from '../diff.js';

interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  oldLines: string[];
  newLines: string[];
}

function parseUnifiedDiff(patch: string): DiffHunk[] {
  const hunks: DiffHunk[] = [];
  const lines = patch.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const match = /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/.exec(line);

    if (match) {
      const hunk: DiffHunk = {
        oldStart: parseInt(match[1], 10),
        oldCount: match[2] ? parseInt(match[2], 10) : 1,
        newStart: parseInt(match[3], 10),
        newCount: match[4] ? parseInt(match[4], 10) : 1,
        oldLines: [],
        newLines: [],
      };

      i++;
      while (i < lines.length && !lines[i].startsWith('@@')) {
        const hunkLine = lines[i];
        if (hunkLine.startsWith('-')) {
          hunk.oldLines.push(hunkLine.slice(1));
        } else if (hunkLine.startsWith('+')) {
          hunk.newLines.push(hunkLine.slice(1));
        } else {
          const context = hunkLine.startsWith(' ')
            ? hunkLine.slice(1)
            : hunkLine;
          hunk.oldLines.push(context);
          hunk.newLines.push(context);
        }
        i++;
      }

      hunks.push(hunk);
    } else {
      i++;
    }
  }

  return hunks;
}

function applyHunks(original: string, hunks: DiffHunk[]): string {
  const lines = original.split('\n');

  for (const hunk of hunks) {
    const startIdx = hunk.oldStart - 1;
    const matchSlice = lines.slice(startIdx, startIdx + hunk.oldLines.length);

    const matches = hunk.oldLines.every(
      (oldLine, idx) => matchSlice[idx] === oldLine,
    );

    if (!matches) {
      throw new Error(
        `Patch context mismatch at line ${hunk.oldStart}`,
      );
    }

    lines.splice(startIdx, hunk.oldLines.length, ...hunk.newLines);
  }

  return lines.join('\n');
}

export async function executePatch(args: {
  path: string;
  patch: string;
}): Promise<string> {
  const filePath = resolve(args.path);

  try {
    const hunks = parseUnifiedDiff(args.patch);

    if (hunks.length === 0) {
      return 'Error: No valid hunks found in patch';
    }

    const original = await readFile(filePath, 'utf-8');
    const patched = applyHunks(original, hunks);
    await captureBeforeWrite(filePath, patched);
    await writeFile(filePath, patched, 'utf-8');

    return `Successfully applied ${hunks.length} hunk(s) to ${filePath}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Error applying patch: ${message}`;
  }
}
