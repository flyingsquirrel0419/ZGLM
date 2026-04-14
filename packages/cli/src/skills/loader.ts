import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Skill, SkillMeta } from '@zglm/shared';

interface ParsedFrontmatter {
  meta: Record<string, unknown>;
  content: string;
}

function parseFrontmatter(raw: string): ParsedFrontmatter {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('---')) {
    return { meta: {}, content: raw };
  }

  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) {
    return { meta: {}, content: raw };
  }

  const frontmatterStr = trimmed.slice(3, endIdx).trim();
  const content = trimmed.slice(endIdx + 3).trimStart();

  const meta: Record<string, unknown> = {};
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    if (typeof value === 'string') {
      if (value.startsWith('[') && value.endsWith(']')) {
        value = value
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      } else if (/^\d+(\.\d+)?$/.test(value)) {
        value = parseFloat(value);
      }
    }

    meta[key] = value;
  }

  return { meta, content };
}

function inferSource(filePath: string): Skill['source'] {
  if (filePath.includes('.zglm/skills') || filePath.includes('.zglm\\skills')) {
    return 'project';
  }
  if (filePath.includes('node_modules') || filePath.includes('@zglm')) {
    return 'official';
  }
  return 'global';
}

export async function loadSkill(filePath: string): Promise<Skill | null> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    const { meta, content } = parseFrontmatter(raw);

    const skillMeta: SkillMeta = {
      name: (meta.name as string) ?? basename(filePath, '.md'),
      version: (meta.version as string) ?? '1.0.0',
      description: (meta.description as string) ?? '',
      author: (meta.author as string) ?? '',
      models: Array.isArray(meta.models) ? meta.models as string[] : [],
      tags: Array.isArray(meta.tags) ? meta.tags as string[] : [],
      inject: (meta.inject as SkillMeta['inject']) ?? 'system_prompt',
      priority: typeof meta.priority === 'number' ? meta.priority : 100,
    };

    return {
      filePath,
      meta: skillMeta,
      content,
      source: inferSource(filePath),
    };
  } catch {
    return null;
  }
}

export { parseFrontmatter };
