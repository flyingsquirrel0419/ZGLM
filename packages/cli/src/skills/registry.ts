import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Skill } from '@zglm/shared';
import { loadSkill } from './loader.js';

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();
  private activeSkills: Set<string> = new Set();

  register(skill: Skill): void {
    this.skills.set(skill.meta.name, skill);
  }

  unregister(name: string): boolean {
    this.activeSkills.delete(name);
    return this.skills.delete(name);
  }

  get(name: string): Skill | undefined {
    return this.skills.get(name);
  }

  getAll(): Skill[] {
    return Array.from(this.skills.values());
  }

  getActive(): Skill[] {
    const result: Skill[] = [];
    for (const name of this.activeSkills) {
      const skill = this.skills.get(name);
      if (skill) {
        result.push(skill);
      }
    }
    return result;
  }

  isActive(name: string): boolean {
    return this.activeSkills.has(name);
  }

  activate(name: string): boolean {
    if (!this.skills.has(name)) return false;
    this.activeSkills.add(name);
    return true;
  }

  deactivate(name: string): boolean {
    return this.activeSkills.delete(name);
  }

  async loadFromDirectory(dir: string): Promise<number> {
    let loaded = 0;
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      return 0;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      let entryStat;
      try {
        entryStat = await stat(fullPath);
      } catch {
        continue;
      }

      if (entryStat.isFile() && entry.endsWith('.md')) {
        const skill = await loadSkill(fullPath);
        if (skill) {
          this.register(skill);
          loaded++;
        }
      } else if (entryStat.isDirectory()) {
        const skillFile = join(fullPath, 'SKILL.md');
        const skill = await loadSkill(skillFile);
        if (skill) {
          this.register(skill);
          loaded++;
        }
      }
    }

    return loaded;
  }
}
