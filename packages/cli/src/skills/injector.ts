import type { Message } from '@zglm/shared';
import type { SkillRegistry } from './registry.js';

export class SkillInjector {
  private registry: SkillRegistry | null = null;

  constructor(registry?: SkillRegistry) {
    if (registry) {
      this.registry = registry;
    }
  }

  setRegistry(registry: SkillRegistry): void {
    this.registry = registry;
  }

  inject(messages: Message[]): Message[] {
    if (!this.registry) return messages;

    const activeSkills = this.registry.getActive();
    if (activeSkills.length === 0) return messages;

    const sorted = [...activeSkills].sort((a, b) => a.meta.priority - b.meta.priority);

    const parts = sorted.map((skill) => {
      const header = `# Skill: ${skill.meta.name}`;
      const version = `Version: ${skill.meta.version}`;
      const desc = skill.meta.description ? `Description: ${skill.meta.description}` : '';
      const separator = '---';
      const lines = [header, version];
      if (desc) lines.push(desc);
      lines.push(separator);
      lines.push(skill.content);
      return lines.join('\n');
    });

    const skillContent = parts.join('\n\n');

    const hasSystemMsg = messages.length > 0 && messages[0].role === 'system';

    if (hasSystemMsg) {
      const systemMsg = messages[0];
      const injected: Message = {
        ...systemMsg,
        content: systemMsg.content + '\n\n' + skillContent,
      };
      return [injected, ...messages.slice(1)];
    }

    const systemMessage: Message = {
      id: 'skill-inject',
      role: 'system',
      content: skillContent,
      timestamp: Date.now(),
    };

    return [systemMessage, ...messages];
  }
}
