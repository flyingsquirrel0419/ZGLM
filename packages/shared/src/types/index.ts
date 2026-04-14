export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinkingContent?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  name?: string;
  timestamp: number;
  model?: string;
  usage?: TokenUsage;
  cost?: number;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallDelta {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  reasoningTokens?: number;
  totalTokens: number;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ApiMessage[];
  thinking?: { type: 'enabled' | 'disabled' };
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string[];
}

export interface ApiMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string | ContentPart[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
  usage?: TokenUsage;
}

export interface StreamChoice {
  index: number;
  delta: StreamDelta;
  finish_reason: 'stop' | 'tool_calls' | 'length' | null;
}

export interface StreamDelta {
  role?: string;
  content?: string;
  reasoning_content?: string;
  tool_calls?: ToolCallDelta[];
}

export type ModelCapability =
  | 'text'
  | 'code'
  | 'vision'
  | 'function-calling'
  | 'web-search'
  | 'thinking'
  | 'streaming';

export interface ModelMeta {
  id: string;
  displayName: string;
  family: 'glm-5' | 'glm-4';
  params: string;
  contextWindow: number;
  maxOutput: number;
  inputPrice: number;
  outputPrice: number;
  capabilities: ModelCapability[];
  tier: 'free' | 'standard' | 'premium';
  supportsThinking: boolean;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsWebSearch: boolean;
  recommended?: 'coding' | 'agent' | 'vision' | 'fast' | 'economy';
}

export interface Session {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  parentId?: string;
  branchPoint?: number;
  tags: string[];
  cwd: string;
  messages: Message[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  totalTokens: number;
  totalCost: number;
  messageCount: number;
  thinkingEnabled: boolean;
  webSearchEnabled: boolean;
  skills: string[];
  files: string[];
}

export type ConfirmMode = 'always' | 'cautious' | 'never';
export type SandboxLevel = 'none' | 'restricted' | 'strict';
export type ThinkingDisplay = 'always' | 'collapsed' | 'never';
export type ThemeName = 'default' | 'catppuccin-mocha' | 'dracula' | 'nord' | 'gruvbox' | 'tokyo-night';
export type ThinkingMode = 'auto' | 'on' | 'off';
export type ExportFormat = 'markdown' | 'json' | 'both';

export interface ZGLMConfig {
  core: {
    defaultModel: string;
    theme: ThemeName;
    language: string;
    autoSave: boolean;
    confirmTools: ConfirmMode;
    maxFileSize: number;
    editor: string;
  };
  model: {
    default: string;
    fallback: string;
    thinking: ThinkingMode;
    temperature: number;
    maxTokens: number;
    topP: number;
  };
  webSearch: {
    enabled: boolean;
    engine: string;
    count: number;
    contentSize: 'low' | 'medium' | 'high';
    recencyFilter: 'noLimit' | 'day' | 'week' | 'month';
  };
  agent: {
    maxTurns: number;
    timeout: number;
    sandbox: SandboxLevel;
    allowedCommands: string[];
    deniedPaths: string[];
  };
  session: {
    autoName: boolean;
    maxHistory: number;
    compressThreshold: number;
    exportFormat: ExportFormat;
  };
  usage: {
    trackCost: boolean;
    currency: 'USD' | 'EUR' | 'JPY' | 'CNY';
    monthlyBudget: number;
    budgetAlert: number;
  };
  ui: {
    syntaxHighlight: boolean;
    streamRender: boolean;
    showThinking: ThinkingDisplay;
    showTokenCount: boolean;
    showCost: boolean;
    wordWrap: boolean;
    compactMode: boolean;
    timestamps: boolean;
  };
  skills: {
    autoLoad: string[];
    skillsDir: string;
  };
}

export interface SkillMeta {
  name: string;
  version: string;
  description: string;
  author: string;
  models: string[];
  tags: string[];
  inject: 'system_prompt' | 'user_message' | 'prepend';
  priority: number;
}

export interface Skill {
  filePath: string;
  meta: SkillMeta;
  content: string;
  source: 'global' | 'project' | 'official';
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  userBubble: string;
  aiBubble: string;
  toolBlock: string;
  thinkBlock: string;
  text: string;
  muted: string;
  dim: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  keyword: string;
  string_: string;
  number: string;
  comment: string;
  function_: string;
}

export interface ThemeIcons {
  user: string;
  ai: string;
  thinking: string;
  tool: string;
  success: string;
  error: string;
  warning: string;
  web: string;
  model: string;
  session: string;
  token: string;
  cost: string;
}

export interface Theme {
  name: ThemeName;
  colors: ThemeColors;
  icons: ThemeIcons;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  content: string;
  error?: boolean;
}

export interface AgentState {
  turnCount: number;
  maxTurns: number;
  isRunning: boolean;
  lastToolCall: string | null;
  startTime: number;
}
