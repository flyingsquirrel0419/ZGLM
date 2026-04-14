import { z } from 'zod';

const ConfirmModeSchema = z.enum(['always', 'cautious', 'never']);
const SandboxLevelSchema = z.enum(['none', 'restricted', 'strict']);
const ThinkingDisplaySchema = z.enum(['always', 'collapsed', 'never']);
const ThemeNameSchema = z.enum(['default', 'catppuccin-mocha', 'dracula', 'nord', 'gruvbox', 'tokyo-night']);
const ThinkingModeSchema = z.enum(['auto', 'on', 'off']);
const ExportFormatSchema = z.enum(['markdown', 'json', 'both']);
const ContentSizeSchema = z.enum(['low', 'medium', 'high']);
const RecencyFilterSchema = z.enum(['noLimit', 'day', 'week', 'month']);
const CurrencySchema = z.enum(['USD', 'EUR', 'JPY', 'CNY']);

export const ZGLMConfigSchema = z.object({
  core: z.object({
    defaultModel: z.string().min(1),
    theme: ThemeNameSchema,
    language: z.string().min(2),
    autoSave: z.boolean(),
    confirmTools: ConfirmModeSchema,
    maxFileSize: z.number().int().positive(),
    editor: z.string().min(1),
  }),
  model: z.object({
    default: z.string().min(1),
    fallback: z.string().min(1),
    thinking: ThinkingModeSchema,
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().int().positive(),
    topP: z.number().min(0).max(1),
  }),
  webSearch: z.object({
    enabled: z.boolean(),
    engine: z.string().min(1),
    count: z.number().int().min(1).max(20),
    contentSize: ContentSizeSchema,
    recencyFilter: RecencyFilterSchema,
  }),
  agent: z.object({
    maxTurns: z.number().int().min(1),
    timeout: z.number().int().positive(),
    sandbox: SandboxLevelSchema,
    allowedCommands: z.array(z.string()),
    deniedPaths: z.array(z.string()),
  }),
  session: z.object({
    autoName: z.boolean(),
    maxHistory: z.number().int().positive(),
    compressThreshold: z.number().int().positive(),
    exportFormat: ExportFormatSchema,
  }),
  usage: z.object({
    trackCost: z.boolean(),
    currency: CurrencySchema,
    monthlyBudget: z.number().min(0),
    budgetAlert: z.number().min(0).max(1),
  }),
  ui: z.object({
    syntaxHighlight: z.boolean(),
    streamRender: z.boolean(),
    showThinking: ThinkingDisplaySchema,
    showTokenCount: z.boolean(),
    showCost: z.boolean(),
    wordWrap: z.boolean(),
    compactMode: z.boolean(),
    timestamps: z.boolean(),
  }),
  skills: z.object({
    autoLoad: z.array(z.string()),
    skillsDir: z.string().min(1),
  }),
});

export type ZGLMConfigInput = z.input<typeof ZGLMConfigSchema>;
