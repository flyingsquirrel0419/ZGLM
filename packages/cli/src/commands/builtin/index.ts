import type { CommandRegistry } from '../registry.js';
import { modelCommand } from './model.js';
import { sessionCommand } from './session.js';
import { skillsCommand } from './skills.js';
import { usageCommand } from './usage.js';
import { thinkCommand } from './think.js';
import { searchCommand } from './search.js';
import { diffCommand } from './diff.js';
import { exportCommand } from './export.js';
import { contextCommand } from './context.js';
import { clearCommand } from './clear.js';
import { helpCommand } from './help.js';
import { configCommand } from './config.js';

export {
  modelCommand,
  sessionCommand,
  skillsCommand,
  usageCommand,
  thinkCommand,
  searchCommand,
  diffCommand,
  exportCommand,
  contextCommand,
  clearCommand,
  helpCommand,
  configCommand,
};

export function registerBuiltinCommands(registry: CommandRegistry): void {
  registry.register(modelCommand);
  registry.register(sessionCommand);
  registry.register(skillsCommand);
  registry.register(usageCommand);
  registry.register(thinkCommand);
  registry.register(searchCommand);
  registry.register(diffCommand);
  registry.register(exportCommand);
  registry.register(contextCommand);
  registry.register(clearCommand);
  registry.register(helpCommand);
  registry.register(configCommand);
}
