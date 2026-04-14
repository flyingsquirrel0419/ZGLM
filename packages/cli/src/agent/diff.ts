import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

interface PendingDiff {
  filePath: string;
  originalContent: string | null;
  proposedContent: string;
  timestamp: number;
}

const pendingDiffs: PendingDiff[] = [];

export function getPendingDiffs(): readonly PendingDiff[] {
  return pendingDiffs;
}

export function clearPendingDiffs(): void {
  pendingDiffs.length = 0;
}

export async function captureBeforeWrite(filePath: string, newContent: string): Promise<void> {
  const resolved = resolve(filePath);
  let originalContent: string | null = null;

  if (existsSync(resolved)) {
    try {
      originalContent = await readFile(resolved, 'utf-8');
    } catch {
      originalContent = null;
    }
  }

  const existing = pendingDiffs.findIndex((d) => d.filePath === resolved);
  if (existing >= 0) {
    pendingDiffs[existing].proposedContent = newContent;
    pendingDiffs[existing].timestamp = Date.now();
  } else {
    pendingDiffs.push({
      filePath: resolved,
      originalContent,
      proposedContent: newContent,
      timestamp: Date.now(),
    });
  }
}

function generateUnifiedDiff(
  original: string,
  modified: string,
  filePath: string,
): string {
  const origLines = (original ?? '').split('\n');
  const modLines = modified.split('\n');
  const lines: string[] = [`diff --git a/${filePath} b/${filePath}`];

  if (original === null) {
    lines.push('--- /dev/null');
    lines.push(`+++ b/${filePath}`);
    for (const line of modLines) {
      lines.push(`+${line}`);
    }
    return lines.join('\n');
  }

  lines.push(`--- a/${filePath}`);
  lines.push(`+++ b/${filePath}`);

  const maxLen = Math.max(origLines.length, modLines.length);
  const hunks: Array<{ start: number; oldLines: string[]; newLines: string[] }> = [];
  let currentHunk: { start: number; oldLines: string[]; newLines: string[] } | null = null;

  for (let i = 0; i < maxLen; i++) {
    const oldLine = origLines[i];
    const newLine = modLines[i];

    if (oldLine !== newLine) {
      if (!currentHunk) {
        currentHunk = { start: Math.max(0, i - 2), oldLines: [], newLines: [] };
        for (let c = Math.max(0, i - 2); c < i; c++) {
          currentHunk.oldLines.push(` ${origLines[c]}`);
          currentHunk.newLines.push(` ${origLines[c]}`);
        }
      }
      if (oldLine !== undefined) currentHunk.oldLines.push(`-${oldLine}`);
      if (newLine !== undefined) currentHunk.newLines.push(`+${newLine}`);
    } else if (currentHunk) {
      for (let c = i; c < Math.min(i + 2, maxLen); c++) {
        if (origLines[c] === modLines[c]) {
          currentHunk.oldLines.push(` ${origLines[c]}`);
          currentHunk.newLines.push(` ${modLines[c]}`);
        }
      }
      hunks.push(currentHunk);
      currentHunk = null;
    }
  }

  if (currentHunk) {
    hunks.push(currentHunk);
  }

  for (const hunk of hunks) {
    const oldCount = hunk.oldLines.filter((l) => !l.startsWith('+')).length;
    const newCount = hunk.newLines.filter((l) => !l.startsWith('-')).length;
    lines.push(`@@ -${hunk.start + 1},${oldCount} +${hunk.start + 1},${newCount} @@`);
    for (const line of hunk.oldLines) {
      if (!line.startsWith('+')) lines.push(line);
    }
    for (const line of hunk.newLines) {
      if (!line.startsWith('-')) lines.push(line);
    }
  }

  return lines.join('\n');
}

export function renderDiffs(): string {
  if (pendingDiffs.length === 0) {
    return '(no pending diffs)';
  }

  const parts: string[] = [];
  for (const diff of pendingDiffs) {
    const status = diff.originalContent === null ? '(new file)' : '(modified)';
    parts.push(`--- ${diff.filePath} ${status}`);
    parts.push(generateUnifiedDiff(diff.originalContent ?? '', diff.proposedContent, diff.filePath));
    parts.push('');
  }

  return parts.join('\n');
}

export async function applyAllDiffs(): Promise<{ applied: number; errors: string[] }> {
  let applied = 0;
  const errors: string[] = [];

  for (const diff of pendingDiffs) {
    try {
      await writeFile(diff.filePath, diff.proposedContent, 'utf-8');
      applied++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${diff.filePath}: ${msg}`);
    }
  }

  pendingDiffs.length = 0;
  return { applied, errors };
}

export function rejectAllDiffs(): number {
  const count = pendingDiffs.length;
  pendingDiffs.length = 0;
  return count;
}
