import type {
  Message,
  Tool,
  ToolResult,
  ToolCall,
  StreamChunk,
  ApiMessage,
} from '@zglm/shared';
import { TOOL_HANDLERS, BUILTIN_TOOLS } from './tools/index.js';
import { Sandbox } from './sandbox.js';
import { nanoid } from 'nanoid';

export interface ExecutorConfig {
  maxTurns: number;
  model: string;
  thinkingEnabled: boolean;
}

export type OnToolCall = (toolCall: ToolCall) => void;
export type OnThinking = (content: string) => void;
export type OnToken = (token: string) => void;

interface StreamingAccumulator {
  content: string;
  thinking: string;
  toolCalls: Map<number, { id: string; name: string; arguments: string }>;
  finishReason: string | null;
}

function messageToApi(message: Message): ApiMessage {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      content: message.content,
      tool_call_id: message.toolCallId,
      name: message.name,
    };
  }

  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content,
      tool_calls: message.toolCalls,
    };
  }

  return {
    role: message.role,
    content: message.content,
  };
}

export class AgentExecutor {
  private readonly client: {
    streamChat: (request: import('@zglm/shared').ChatCompletionRequest) => AsyncGenerator<StreamChunk>;
  };
  private readonly config: ExecutorConfig;
  private readonly sandbox: Sandbox;
  private readonly onToolCall: OnToolCall | undefined;
  private readonly onThinking: OnThinking | undefined;
  private readonly onToken: OnToken | undefined;

  constructor(options: {
    client: {
      streamChat: (request: import('@zglm/shared').ChatCompletionRequest) => AsyncGenerator<StreamChunk>;
    };
    config: ExecutorConfig;
    sandbox: Sandbox;
    onToolCall?: OnToolCall;
    onThinking?: OnThinking;
    onToken?: OnToken;
  }) {
    this.client = options.client;
    this.config = options.config;
    this.sandbox = options.sandbox;
    this.onToolCall = options.onToolCall;
    this.onThinking = options.onThinking;
    this.onToken = options.onToken;
  }

  async execute(messages: Message[], tools?: Tool[]): Promise<Message[]> {
    const allTools = tools ?? BUILTIN_TOOLS;
    const allMessages = [...messages];
    const maxTurns = this.config.maxTurns;

    for (let turn = 0; turn < maxTurns; turn++) {
      const apiMessages = allMessages.map(messageToApi);

      const accumulator = await this.streamResponse(apiMessages, allTools);

      const assistantMessage = this.buildAssistantMessage(accumulator);
      allMessages.push(assistantMessage);

      if (
        accumulator.finishReason === 'stop' ||
        accumulator.finishReason === 'length'
      ) {
        break;
      }

      if (accumulator.finishReason === 'tool_calls') {
        const toolCalls = this.resolveToolCalls(accumulator);
        assistantMessage.toolCalls = toolCalls;

        const results = await this.executeToolCalls(toolCalls);

        for (const result of results) {
          const toolMessage: Message = {
            id: nanoid(),
            role: 'tool',
            content: result.content,
            toolCallId: result.toolCallId,
            name: result.name,
            timestamp: Date.now(),
            ...(result.error ? { content: `Error: ${result.content}` } : {}),
          };
          allMessages.push(toolMessage);
        }
      }
    }

    return allMessages;
  }

  private async streamResponse(
    apiMessages: ApiMessage[],
    tools: Tool[],
  ): Promise<StreamingAccumulator> {
    const accumulator: StreamingAccumulator = {
      content: '',
      thinking: '',
      toolCalls: new Map(),
      finishReason: null,
    };

    const request: import('@zglm/shared').ChatCompletionRequest = {
      model: this.config.model,
      messages: apiMessages,
      tools,
      tool_choice: 'auto',
      stream: true,
    };

    if (this.config.thinkingEnabled) {
      request.thinking = { type: 'enabled' };
    }

    const stream = this.client.streamChat(request);

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;

      if (delta.content) {
        accumulator.content += delta.content;
        this.onToken?.(delta.content);
      }

      if (delta.reasoning_content) {
        accumulator.thinking += delta.reasoning_content;
        this.onThinking?.(delta.reasoning_content);
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = accumulator.toolCalls.get(tc.index);
          if (!existing) {
            accumulator.toolCalls.set(tc.index, {
              id: tc.id ?? '',
              name: tc.function?.name ?? '',
              arguments: tc.function?.arguments ?? '',
            });
          } else {
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments)
              existing.arguments += tc.function.arguments;
          }
        }
      }

      if (choice.finish_reason) {
        accumulator.finishReason = choice.finish_reason;
      }
    }

    return accumulator;
  }

  private buildAssistantMessage(
    accumulator: StreamingAccumulator,
  ): Message {
    return {
      id: nanoid(),
      role: 'assistant',
      content: accumulator.content,
      thinkingContent:
        accumulator.thinking || undefined,
      timestamp: Date.now(),
      model: this.config.model,
    };
  }

  private resolveToolCalls(
    accumulator: StreamingAccumulator,
  ): ToolCall[] {
    const sorted = [...accumulator.toolCalls.entries()].sort(
      ([a], [b]) => a - b,
    );

    return sorted.map(([, tc]) => ({
      id: tc.id || nanoid(),
      type: 'function' as const,
      function: {
        name: tc.name,
        arguments: tc.arguments,
      },
    }));
  }

  private async executeToolCalls(
    toolCalls: ToolCall[],
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];

    for (const toolCall of toolCalls) {
      this.onToolCall?.(toolCall);

      const handler = TOOL_HANDLERS[toolCall.function.name];

      if (!handler) {
        results.push({
          toolCallId: toolCall.id,
          name: toolCall.function.name,
          content: `Unknown tool: ${toolCall.function.name}`,
          error: true,
        });
        continue;
      }

      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        results.push({
          toolCallId: toolCall.id,
          name: toolCall.function.name,
          content: `Invalid JSON in tool arguments: ${toolCall.function.arguments}`,
          error: true,
        });
        continue;
      }

      if (toolCall.function.name === 'bash') {
        if (!this.sandbox.checkCommand((args.command as string) ?? '')) {
          results.push({
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            content: 'Command blocked by sandbox policy',
            error: true,
          });
          continue;
        }

        const cwd = args.cwd as string | undefined;
        if (cwd && !this.sandbox.checkPath(cwd, 'read')) {
          results.push({
            toolCallId: toolCall.id,
            name: toolCall.function.name,
            content: `Working directory blocked by sandbox policy: ${cwd}`,
            error: true,
          });
          continue;
        }
      }

      const writeTools = new Set(['write_file', 'patch_file']);
      const pathArgTools = new Set([
        'read_file',
        'write_file',
        'patch_file',
        'list_directory',
        'search_files',
      ]);

      if (pathArgTools.has(toolCall.function.name)) {
        const operation = writeTools.has(toolCall.function.name) ? 'write' : 'read';
        let pathBlocked = false;

        const pathValue = args.path as string | undefined;
        if (pathValue && typeof pathValue === 'string') {
          if (!this.sandbox.checkPath(pathValue, operation)) {
            results.push({
              toolCallId: toolCall.id,
              name: toolCall.function.name,
              content: `Path blocked by sandbox policy: ${pathValue}`,
              error: true,
            });
            pathBlocked = true;
          }
        }

        if (pathBlocked) continue;
      }

      try {
        const content = await handler(args);
        results.push({
          toolCallId: toolCall.id,
          name: toolCall.function.name,
          content,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        results.push({
          toolCallId: toolCall.id,
          name: toolCall.function.name,
          content: `Tool execution error: ${message}`,
          error: true,
        });
      }
    }

    return results;
  }
}
