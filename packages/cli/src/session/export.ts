import type { Session, Message } from '@zglm/shared';

const INTERNAL_MESSAGE_IDS = new Set(['__file_context__', 'skill-inject']);

function isExportableMessage(msg: Message): boolean {
  if (INTERNAL_MESSAGE_IDS.has(msg.id)) return false;
  if (msg.role === 'system' && msg.content.startsWith('The following files are attached as context:')) return false;
  if (msg.role === 'system' && msg.content.startsWith('# Skill:')) return false;
  return true;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function modelDisplayName(model: string): string {
  const match = model.match(/glm[-]?(\d[\d.]*)/i);
  if (match) return `GLM-${match[1]}`;
  return model;
}

function computeStats(session: Session): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;
  let totalTokens = 0;
  let totalCost = 0;

  for (const msg of session.messages) {
    if (msg.usage) {
      inputTokens += msg.usage.promptTokens;
      outputTokens += msg.usage.completionTokens;
      totalTokens += msg.usage.totalTokens;
    }
    if (msg.cost) {
      totalCost += msg.cost;
    }
  }

  return { inputTokens, outputTokens, totalTokens, totalCost };
}

function renderMessage(msg: Message): string {
  const time = formatTime(msg.timestamp);
  const parts: string[] = [];

  if (msg.role === 'user') {
    parts.push(`**[You]** ${time}`);
    parts.push(msg.content);
  } else if (msg.role === 'assistant') {
    const label = modelDisplayName(msg.model ?? 'unknown');
    parts.push(`**[${label}]** ${time}`);
    if (msg.thinkingContent) {
      parts.push(`<details><summary>Thinking</summary>\n${msg.thinkingContent}\n</details>`);
    }
    parts.push(msg.content);
    if (msg.toolCalls && msg.toolCalls.length > 0) {
      for (const tc of msg.toolCalls) {
        parts.push(`\n\`\`\`tool:${tc.function.name}\n${tc.function.arguments}\n\`\`\``);
      }
    }
  } else if (msg.role === 'tool') {
    parts.push(`**[Tool: ${msg.name ?? 'unknown'}]** ${time}`);
    parts.push(msg.content);
  } else if (msg.role === 'system') {
    parts.push(`**[System]** ${time}`);
    parts.push(msg.content);
  }

  return parts.join('\n\n');
}

export function exportSessionMarkdown(session: Session): string {
  const stats = computeStats(session);
  const lines: string[] = [];

  lines.push(`# Session: ${session.name}`);
  lines.push(`- Model: ${session.model}`);
  lines.push(`- Created: ${formatDate(session.createdAt)}`);
  lines.push(`- Tokens: ${stats.totalTokens} (input: ${stats.inputTokens} / output: ${stats.outputTokens})`);
  lines.push(`- Cost: $${stats.totalCost.toFixed(4)}`);

  if (session.parentId) {
    lines.push(`- Branched from: ${session.parentId} (at message ${session.branchPoint ?? '?'})`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  for (const msg of session.messages.filter(isExportableMessage)) {
    lines.push(renderMessage(msg));
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function exportSessionJSON(session: Session): string {
  const output = {
    id: session.id,
    name: session.name,
    model: session.model,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    parentId: session.parentId ?? null,
    branchPoint: session.branchPoint ?? null,
    cwd: session.cwd,
    tags: session.tags,
    metadata: session.metadata,
    messages: session.messages.filter(isExportableMessage).map((msg) => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      thinkingContent: msg.thinkingContent ?? null,
      toolCalls: msg.toolCalls ?? null,
      toolCallId: msg.toolCallId ?? null,
      name: msg.name ?? null,
      timestamp: msg.timestamp,
      model: msg.model ?? null,
      usage: msg.usage ?? null,
      cost: msg.cost ?? null,
    })),
  };

  return JSON.stringify(output, null, 2);
}
