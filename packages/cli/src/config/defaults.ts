import type { ZGLMConfig } from '@zglm/shared';

export const DEFAULT_CONFIG: ZGLMConfig = {
  core: {
    defaultModel: 'glm-4.6',
    theme: 'default',
    language: 'en',
    autoSave: true,
    confirmTools: 'cautious',
    maxFileSize: 10485760,
    editor: 'vim',
  },
  model: {
    default: 'glm-4.6',
    fallback: 'glm-4.5-flash',
    thinking: 'auto',
    temperature: 0.7,
    maxTokens: 4096,
    topP: 0.9,
  },
  webSearch: {
    enabled: true,
    engine: 'default',
    count: 5,
    contentSize: 'medium',
    recencyFilter: 'noLimit',
  },
  agent: {
    maxTurns: 50,
    timeout: 300000,
    sandbox: 'restricted',
    allowedCommands: [],
    deniedPaths: [],
  },
  session: {
    autoName: true,
    maxHistory: 100,
    compressThreshold: 80000,
    exportFormat: 'markdown',
  },
  usage: {
    trackCost: true,
    currency: 'USD',
    monthlyBudget: 100,
    budgetAlert: 0.8,
  },
  ui: {
    syntaxHighlight: true,
    streamRender: true,
    showThinking: 'collapsed',
    showTokenCount: true,
    showCost: true,
    wordWrap: true,
    compactMode: false,
    timestamps: false,
  },
  skills: {
    autoLoad: [],
    skillsDir: '.zglm/skills',
  },
};
