import chalk from 'chalk';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Command } from '../types.js';

const SKILL_TEMPLATE = `---
name: {name}
version: 1.0.0
description: A new skill
author: anonymous
models: []
tags: []
inject: system_prompt
priority: 5
---

# {name}

Describe what this skill does here.
`;

export const skillsCommand: Command = {
  name: 'skills',
  aliases: ['skill'],
  description: 'Manage skills',
  usage: '/skills [list|load|unload|create|show|path] [args]',
  async handler(args, ctx) {
    const sub = args[0];

    if (!sub || sub === 'list' || sub === 'ls') {
      const registry = ctx.skillRegistry;
      if (registry) {
        const all = registry.getAll();
        if (all.length === 0) {
          ctx.output(chalk.dim('No skills available. Use /skills create <name> to create one.'));
          return { success: true };
        }
        const lines: string[] = [chalk.bold('Available Skills:')];
        for (const skill of all) {
          const name = chalk.bold(skill.meta.name);
          const desc = chalk.dim(skill.meta.description || 'No description');
          lines.push(`  ${chalk.green('●')} ${name} — ${desc}`);
        }
        ctx.output(lines.join('\n'));
      } else {
        const autoLoad = ctx.config.skills.autoLoad;
        if (autoLoad.length === 0) {
          ctx.output(chalk.dim('No skills configured.'));
          return { success: true };
        }
        const lines: string[] = [chalk.bold('Configured Skills:')];
        for (const name of autoLoad) {
          lines.push(`  ${chalk.green('●')} ${name}`);
        }
        ctx.output(lines.join('\n'));
      }
      return { success: true, data: { action: 'list' } };
    }

    if (sub === 'load') {
      const skillName = args.slice(1).join(' ');
      if (!skillName) {
        return { success: false, message: 'Usage: /skills load <skill-name>' };
      }
      if (ctx.skillRegistry) {
        const activated = ctx.skillRegistry.activate(skillName);
        if (!activated) {
          return { success: false, message: `Skill "${skillName}" not found in registry. Use /skills list to see available skills.` };
        }
      }
      if (!ctx.config.skills.autoLoad.includes(skillName)) {
        ctx.config.skills.autoLoad.push(skillName);
      }
      ctx.output(`${chalk.green('✓')} Skill loaded: ${chalk.bold(skillName)}`);
      return { success: true, data: { action: 'load', skillName } };
    }

    if (sub === 'unload') {
      const skillName = args.slice(1).join(' ');
      if (!skillName) {
        return { success: false, message: 'Usage: /skills unload <skill-name>' };
      }
      if (ctx.skillRegistry) {
        ctx.skillRegistry.deactivate(skillName);
      }
      const idx = ctx.config.skills.autoLoad.indexOf(skillName);
      if (idx !== -1) {
        ctx.config.skills.autoLoad.splice(idx, 1);
      }
      ctx.output(`${chalk.yellow('✓')} Skill unloaded: ${chalk.bold(skillName)}`);
      return { success: true, data: { action: 'unload', skillName } };
    }

    if (sub === 'create') {
      const skillName = args[1];
      if (!skillName) {
        return { success: false, message: 'Usage: /skills create <skill-name>' };
      }
      try {
        const skillsDir = ctx.config.skills.skillsDir.replace(/^~/, process.env.HOME ?? '~');
        await mkdir(resolve(skillsDir), { recursive: true });
        const filePath = resolve(skillsDir, `${skillName}.md`);
        const content = SKILL_TEMPLATE.replace(/\{name\}/g, skillName);
        await writeFile(filePath, content, 'utf-8');
        ctx.output(`${chalk.green('✓')} Skill template created: ${chalk.bold(skillName)} → ${chalk.cyan(filePath)}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { success: false, message: `Failed to create skill: ${msg}` };
      }
      return { success: true, data: { action: 'create', skillName } };
    }

    if (sub === 'show') {
      const skillName = args.slice(1).join(' ');
      if (!skillName) {
        return { success: false, message: 'Usage: /skills show <skill-name>' };
      }
      if (ctx.skillRegistry) {
        const skill = ctx.skillRegistry.getAll().find(s => s.meta.name === skillName);
        if (skill) {
          ctx.output(`${chalk.bold(skill.meta.name)} v${skill.meta.version}\n${chalk.dim(skill.meta.description)}\n\n${skill.content}`);
          return { success: true };
        }
      }
      ctx.output(chalk.dim(`Skill "${skillName}" not found.`));
      return { success: true, data: { action: 'show', skillName } };
    }

    if (sub === 'path') {
      const dir = ctx.config.skills.skillsDir;
      ctx.output(dir || chalk.dim('No skills directory configured'));
      return { success: true, data: { action: 'path', path: dir } };
    }

    return { success: false, message: `Unknown subcommand: ${sub}. Usage: /skills [list|load|unload|create|show|path]` };
  },
  complete(partial) {
    const subs = ['list', 'ls', 'load', 'unload', 'create', 'show', 'path'];
    return subs.filter((s) => s.startsWith(partial));
  },
};
