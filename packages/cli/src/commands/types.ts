import type { ZGLMConfig, Session, Message } from '@zglm/shared';

export interface Command {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  subcommands?: Command[];
  handler: (args: string[], ctx: CommandContext) => Promise<CommandResult>;
  complete?: (partial: string, ctx: CommandContext) => string[];
}

export interface CommandContext {
  config: ZGLMConfig;
  state: AppState;
  output: (text: string) => void;
  registry?: CommandRegistryLike;
  sessionManager?: SessionManagerLike;
  skillRegistry?: SkillRegistryLike;
}

export interface SessionManagerLike {
  list(): Promise<Session[]>;
  create(name?: string, model?: string): Promise<Session>;
  load(id: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  delete(id: string): Promise<boolean>;
  branch(session: Session): Promise<Session>;
  addMessage(sessionId: string, message: Message): Promise<void>;
}

export interface SkillRegistryLike {
  getAll(): Array<{ meta: { name: string; version: string; description: string }; content: string }>;
  activate(name: string): boolean;
  deactivate(name: string): boolean;
  loadFromDirectory(dir: string): Promise<number>;
}

export interface CommandRegistryLike {
  getAll(): Command[];
  get(name: string): Command | undefined;
}

export interface AppState {
  currentModel: string;
  thinkingEnabled: boolean;
  webSearchEnabled: boolean;
  session: Session | null;
  attachedFiles: string[];
  debug: boolean;
  verbose: boolean;
}

export type CommandResult =
  | { success: true; message?: string; data?: unknown }
  | { success: false; message: string; data?: unknown };
