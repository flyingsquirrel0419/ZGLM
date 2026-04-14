import chalk from 'chalk';
import type { Command, CommandContext, CommandResult } from '../types.js';
import { MODEL_CATALOG, MODEL_IDS, getModelMeta } from '../../api/models.js';
import type { ModelMeta } from '@zglm/shared';

function formatContextWindow(ctx: number): string {
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(0)}M`;
  if (ctx >= 1_000) return `${(ctx / 1_000).toFixed(0)}K`;
  return String(ctx);
}

function padRight(str: string, len: number): string {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
  const diff = len - stripped.length;
  return diff > 0 ? str + ' '.repeat(diff) : str;
}

function renderModelTable(models: ModelMeta[], currentModel: string): string {
  const lines: string[] = [];
  const header = [
    padRight(chalk.bold('Model'), 22),
    padRight(chalk.bold('Ctx'), 8),
    padRight(chalk.bold('Out'), 8),
    padRight(chalk.bold('In $/M'), 12),
    padRight(chalk.bold('Out $/M'), 12),
    padRight(chalk.bold('Tier'), 10),
    chalk.bold('Capabilities'),
  ];
  lines.push(header.join('  '));
  lines.push(chalk.dim('─'.repeat(90)));

  for (const m of models) {
    const marker = m.id === currentModel ? chalk.green(' ●') : '  ';
    const id = m.id === currentModel
      ? chalk.green.bold(m.id)
      : m.id;
    const ctx = formatContextWindow(m.contextWindow);
    const out = formatContextWindow(m.maxOutput);
    const inPrice = m.inputPrice === 0 ? chalk.cyan('FREE') : `$${m.inputPrice.toFixed(2)}`;
    const outPrice = m.outputPrice === 0 ? chalk.cyan('FREE') : `$${m.outputPrice.toFixed(2)}`;
    const tierColor = m.tier === 'free' ? chalk.cyan : m.tier === 'premium' ? chalk.yellow : chalk.white;
    const caps = m.capabilities
      .filter((c) => c !== 'text' && c !== 'streaming')
      .map((c) => c === 'vision' ? chalk.magenta(c) : c === 'thinking' ? chalk.blue(c) : c)
      .join(', ');

    const row = [
      marker + padRight(id, 20),
      padRight(ctx, 8),
      padRight(out, 8),
      padRight(inPrice, 12),
      padRight(outPrice, 12),
      padRight(tierColor(m.tier), 10),
      caps,
    ];
    lines.push(row.join('  '));
  }

  return lines.join('\n');
}

async function handleModelCurrent(ctx: CommandContext): Promise<CommandResult> {
  const meta = getModelMeta(ctx.state.currentModel);
  if (!meta) {
    return { success: true, message: `Current model: ${ctx.state.currentModel}` };
  }
  const lines = [
    `${chalk.bold('Current model:')} ${chalk.green(ctx.state.currentModel)}`,
    `  Display:    ${meta.displayName}`,
    `  Family:     ${meta.family}`,
    `  Context:    ${meta.contextWindow.toLocaleString()} tokens`,
    `  Max Output: ${meta.maxOutput.toLocaleString()} tokens`,
    `  Tier:       ${meta.tier}`,
    `  Capabilities: ${meta.capabilities.join(', ')}`,
  ];
  ctx.output(lines.join('\n'));
  return { success: true };
}

async function handleModelList(ctx: CommandContext): Promise<CommandResult> {
  const models = Object.values(MODEL_CATALOG);
  ctx.output(renderModelTable(models, ctx.state.currentModel));
  return { success: true };
}

async function handleModelInfo(args: string[], ctx: CommandContext): Promise<CommandResult> {
  const modelId = args[0] ?? ctx.state.currentModel;
  const meta = getModelMeta(modelId);
  if (!meta) {
    return { success: false, message: `Unknown model: ${modelId}` };
  }

  const recBadge = meta.recommended ? chalk.yellow(` [${meta.recommended}]`) : '';
  const lines = [
    `${chalk.bold(meta.displayName)}${recBadge}`,
    chalk.dim('─'.repeat(50)),
    `  ID:              ${meta.id}`,
    `  Family:          ${meta.family}`,
    `  Parameters:      ${meta.params}`,
    `  Context Window:  ${meta.contextWindow.toLocaleString()} tokens`,
    `  Max Output:      ${meta.maxOutput.toLocaleString()} tokens`,
    `  Input Price:     ${meta.inputPrice === 0 ? 'FREE' : `$${meta.inputPrice.toFixed(2)}/M tokens`}`,
    `  Output Price:    ${meta.outputPrice === 0 ? 'FREE' : `$${meta.outputPrice.toFixed(2)}/M tokens`}`,
    `  Tier:            ${meta.tier}`,
    `  Thinking:        ${meta.supportsThinking ? chalk.green('yes') : chalk.dim('no')}`,
    `  Vision:          ${meta.supportsVision ? chalk.green('yes') : chalk.dim('no')}`,
    `  Tools:           ${meta.supportsTools ? chalk.green('yes') : chalk.dim('no')}`,
    `  Web Search:      ${meta.supportsWebSearch ? chalk.green('yes') : chalk.dim('no')}`,
    `  Capabilities:    ${meta.capabilities.join(', ')}`,
  ];
  ctx.output(lines.join('\n'));
  return { success: true };
}

async function handleModelSwitch(args: string[], ctx: CommandContext): Promise<CommandResult> {
  const modelId = args[0];
  if (!modelId) {
    return { success: false, message: 'Usage: /model <model-id>' };
  }

  if (!MODEL_CATALOG[modelId]) {
    const suggestions = MODEL_IDS.filter((id) =>
      id.includes(modelId) || modelId.includes(id.split('-').slice(0, 2).join('-'))
    );
    let msg = `Unknown model: ${modelId}`;
    if (suggestions.length > 0) {
      msg += `. Did you mean: ${suggestions.join(', ')}?`;
    }
    return { success: false, message: msg };
  }

  const prev = ctx.state.currentModel;
  ctx.output(`${chalk.green('✓')} Model switched: ${chalk.dim(prev)} → ${chalk.bold(modelId)}`);
  return { success: true, data: { currentModel: modelId } };
}

async function handleModelCompare(args: string[], ctx: CommandContext): Promise<CommandResult> {
  if (args.length < 2) {
    return { success: false, message: 'Usage: /model compare <model-a> <model-b>' };
  }

  const [aId, bId] = args;
  const a = getModelMeta(aId);
  const b = getModelMeta(bId);

  if (!a) return { success: false, message: `Unknown model: ${aId}` };
  if (!b) return { success: false, message: `Unknown model: ${bId}` };

  const rows = [
    ['', chalk.bold(a.displayName), chalk.bold(b.displayName)],
    [chalk.dim('─'.repeat(16)), chalk.dim('─'.repeat(20)), chalk.dim('─'.repeat(20))],
    ['Family', a.family, b.family],
    ['Tier', a.tier, b.tier],
    ['Context', `${a.contextWindow.toLocaleString()} tok`, `${b.contextWindow.toLocaleString()} tok`],
    ['Max Output', `${a.maxOutput.toLocaleString()} tok`, `${b.maxOutput.toLocaleString()} tok`],
    ['Input Price', a.inputPrice === 0 ? 'FREE' : `$${a.inputPrice.toFixed(2)}`, b.inputPrice === 0 ? 'FREE' : `$${b.inputPrice.toFixed(2)}`],
    ['Output Price', a.outputPrice === 0 ? 'FREE' : `$${a.outputPrice.toFixed(2)}`, b.outputPrice === 0 ? 'FREE' : `$${b.outputPrice.toFixed(2)}`],
    ['Thinking', a.supportsThinking ? chalk.green('✓') : chalk.dim('✗'), b.supportsThinking ? chalk.green('✓') : chalk.dim('✗')],
    ['Vision', a.supportsVision ? chalk.green('✓') : chalk.dim('✗'), b.supportsVision ? chalk.green('✓') : chalk.dim('✗')],
    ['Tools', a.supportsTools ? chalk.green('✓') : chalk.dim('✗'), b.supportsTools ? chalk.green('✓') : chalk.dim('✗')],
    ['Web Search', a.supportsWebSearch ? chalk.green('✓') : chalk.dim('✗'), b.supportsWebSearch ? chalk.green('✓') : chalk.dim('✗')],
  ];

  const lines = rows.map((row) => padRight(row[0], 18) + padRight(row[1], 22) + row[2]);
  ctx.output(lines.join('\n'));
  return { success: true };
}

export const modelCommand: Command = {
  name: 'model',
  aliases: ['m'],
  description: 'View and switch AI models',
  usage: '/model [list|info|compare|<model-id>]',
  subcommands: [],
  async handler(args, ctx) {
    const sub = args[0];

    if (!sub) return handleModelCurrent(ctx);
    if (sub === 'list' || sub === 'ls') return handleModelList(ctx);
    if (sub === 'info') return handleModelInfo(args.slice(1), ctx);
    if (sub === 'compare') return handleModelCompare(args.slice(1), ctx);
    return handleModelSwitch(args, ctx);
  },
  complete(partial) {
    const subs = ['list', 'ls', 'info', 'compare', ...MODEL_IDS];
    return subs.filter((s) => s.startsWith(partial));
  },
};
