import React, { useState, useCallback } from 'react';
import { render, Box, useInput, useApp } from 'ink';
import { nanoid } from 'nanoid';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { ZGLMConfig, Message, Session } from '@zglm/shared';
import { getTheme } from './ui/theme.js';
import { Chat } from './ui/Chat.js';
import { CommandRegistry } from './commands/registry.js';
import { registerBuiltinCommands } from './commands/builtin/index.js';
import { ZGLMClient } from './api/client.js';
import { SessionManager } from './session/manager.js';
import { SkillInjector } from './skills/injector.js';
import { SkillRegistry } from './skills/registry.js';
import { AgentExecutor } from './agent/executor.js';
import { BUILTIN_TOOLS } from './agent/tools/index.js';
import { Sandbox } from './agent/sandbox.js';
import { setSearchClient, setSearchConfig } from './agent/tools/search.js';
import { TokenCounter } from './utils/token.js';
import { CostCalculator } from './utils/cost.js';
import type { AppState } from './commands/types.js';

export interface AppOptions {
  config: ZGLMConfig;
  apiKey: string;
  initialModel: string;
  attachFiles: string[];
  continueSession: boolean;
  sessionId?: string;
}

export async function startInteractive(options: AppOptions) {
  const { config, apiKey, initialModel } = options;

  const client = new ZGLMClient({ apiKey });
  const sessionManager = new SessionManager();
  await sessionManager.init();

  setSearchClient(client);
  setSearchConfig({
    count: config.webSearch.count,
    contentSize: config.webSearch.contentSize,
    recencyFilter: config.webSearch.recencyFilter,
  });

  const tokenCounter = new TokenCounter();
  const costCalculator = new CostCalculator();
  const skillRegistry = new SkillRegistry();
  const skillInjector = new SkillInjector(skillRegistry);

  if (config.skills.autoLoad.length > 0) {
    const skillsDir = config.skills.skillsDir.replace(/^~/, process.env.HOME ?? '~');
    await skillRegistry.loadFromDirectory(skillsDir);
    for (const name of config.skills.autoLoad) {
      skillRegistry.activate(name);
    }
  }

  const registry = new CommandRegistry();
  registerBuiltinCommands(registry);

  const sandbox = new Sandbox(config.agent.sandbox, {
    deniedPaths: config.agent.deniedPaths,
    allowedCommands: config.agent.allowedCommands,
  });

  const initialState: AppState = {
    currentModel: initialModel,
    thinkingEnabled: config.model.thinking === 'on',
    webSearchEnabled: config.webSearch.enabled,
    session: options.continueSession
      ? await loadLastSession(sessionManager)
      : await sessionManager.create(undefined, initialModel),
    attachedFiles: options.attachFiles,
    debug: !!process.env.ZGLM_DEBUG,
    verbose: false,
  };

  if (options.sessionId) {
    const loaded = await sessionManager.load(options.sessionId);
    if (loaded) {
      initialState.session = loaded;
    }
  }

  render(
    <ZGLMApp
      initialState={initialState}
      config={config}
      client={client}
      sessionManager={sessionManager}
      registry={registry}
      tokenCounter={tokenCounter}
      costCalculator={costCalculator}
      skillInjector={skillInjector}
      skillRegistry={skillRegistry}
      sandbox={sandbox}
    />
  );
}

async function loadLastSession(sessionManager: SessionManager): Promise<Session> {
  const sessions = await sessionManager.list();
  if (sessions.length > 0) {
    return sessions[0];
  }
  return await sessionManager.create(undefined, 'glm-4.6');
}

async function buildFileContext(files: string[]): Promise<string> {
  const parts: string[] = [];
  for (const filePath of files) {
    try {
      const resolved = resolve(filePath);
      const content = await readFile(resolved, 'utf-8');
      parts.push(`--- File: ${filePath} ---\n${content}\n--- End of ${filePath} ---`);
    } catch {
      parts.push(`--- File: ${filePath} (unreadable) ---`);
    }
  }
  return parts.join('\n\n');
}

const INTERNAL_MESSAGE_IDS = new Set(['__file_context__', 'skill-inject']);

function isInternalMessage(msg: Message): boolean {
  return INTERNAL_MESSAGE_IDS.has(msg.id);
}

function buildApiMessages(
  visibleMessages: Message[],
  attachedFiles: string[],
  fileContext: string | null,
  skillInjector: SkillInjector,
): Message[] {
  const base: Message[] = [];

  if (fileContext) {
    base.push({
      id: '__file_context__',
      role: 'system',
      content: `The following files are attached as context:\n\n${fileContext}`,
      timestamp: Date.now(),
    });
  }

  const combined = [...base, ...visibleMessages];
  return skillInjector.inject(combined);
}

interface ZGLMAppProps {
  initialState: AppState;
  config: ZGLMConfig;
  client: ZGLMClient;
  sessionManager: SessionManager;
  registry: CommandRegistry;
  tokenCounter: TokenCounter;
  costCalculator: CostCalculator;
  skillInjector: SkillInjector;
  skillRegistry: SkillRegistry;
  sandbox: Sandbox;
}

function ZGLMApp({
  initialState,
  config,
  client,
  sessionManager,
  registry,
  tokenCounter,
  costCalculator,
  skillInjector,
  skillRegistry,
  sandbox,
}: ZGLMAppProps) {
  const { exit } = useApp();
  const [state, setState] = useState<AppState>(initialState);
  const [messages, setMessages] = useState<Message[]>(initialState.session?.messages ?? []);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingThinking, setStreamingThinking] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [totalCost, setTotalCost] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const theme = getTheme(config.core.theme);

  useInput((_char, key) => {
    if (key.ctrl && _char === 'c' && !isStreaming) {
      exit();
    }
  });

  const handleSubmit = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;

    setInput('');
    setError(null);

    if (trimmed.startsWith('/')) {
      const result = await registry.execute(trimmed, {
        config,
        state,
        registry,
        sessionManager,
        skillRegistry,
        output: (text: string) => {
          const sysMsg: Message = {
            id: nanoid(),
            role: 'system',
            content: text,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, sysMsg]);
        },
      });

      if (result.success && result.data) {
        const data = result.data as Record<string, unknown>;

        if (data.session) {
          const newSession = data.session as Session;
          setState(prev => ({ ...prev, session: newSession }));
          setMessages(newSession.messages);
          setTotalCost(newSession.metadata.totalCost);
          setTotalTokens(newSession.metadata.totalTokens);
        } else if (data.clearSession) {
          setState(prev => ({ ...prev, session: null }));
          setMessages([]);
          setTotalCost(0);
          setTotalTokens(0);
        } else {
          setState(prev => ({ ...prev, ...data }));
        }
      }
      if (!result.success && result.message) {
        setError(result.message);
      }
      return;
    }

    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const visibleMessages = [...messages, userMessage];
    setMessages(visibleMessages);
    setIsStreaming(true);
    setStreamingContent('');
    setStreamingThinking('');
    setElapsedTime(0);

    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      if (state.session) {
        await sessionManager.addMessage(state.session.id, userMessage);
      }

      let fileContext: string | null = null;
      if (state.attachedFiles.length > 0) {
        fileContext = await buildFileContext(state.attachedFiles);
      }

      const apiMessages = buildApiMessages(
        visibleMessages,
        state.attachedFiles,
        fileContext,
        skillInjector,
      );

      const executor = new AgentExecutor({
        client,
        config: {
          maxTurns: config.agent.maxTurns,
          model: state.currentModel,
          thinkingEnabled: state.thinkingEnabled,
        },
        sandbox,
        onToken: (token: string) => {
          setStreamingContent(prev => prev + token);
        },
        onThinking: (content: string) => {
          setStreamingThinking(prev => prev + content);
        },
      });

      const tools = state.webSearchEnabled
        ? BUILTIN_TOOLS
        : BUILTIN_TOOLS.filter(t => t.function.name !== 'web_search');

      const agentMessages = await executor.execute(apiMessages, tools);

      const responseMessages = agentMessages.slice(apiMessages.length);

      const messagesToDisplay: Message[] = [];
      const messagesToSave: Message[] = [];
      let sessionCost = 0;
      let sessionTokens = 0;

      for (const msg of responseMessages) {
        if (isInternalMessage(msg)) continue;

        if (msg.role === 'assistant') {
          const tokenCount = msg.usage?.totalTokens ?? tokenCounter.count(msg.content);
          const cost = costCalculator.calculate(
            msg.usage ?? { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount },
            state.currentModel,
          );

          msg.usage = msg.usage ?? { promptTokens: 0, completionTokens: tokenCount, totalTokens: tokenCount };
          msg.cost = cost;
          msg.model = state.currentModel;

          sessionCost += cost;
          sessionTokens += msg.usage.totalTokens;
        }

        messagesToDisplay.push(msg);
        if (msg.role !== 'system') {
          messagesToSave.push(msg);
        }
      }

      const finalVisible = [...visibleMessages, ...messagesToDisplay];
      setMessages(finalVisible);
      setTotalCost(prev => prev + sessionCost);
      setTotalTokens(prev => prev + sessionTokens);

      if (state.session) {
        for (const msg of messagesToSave) {
          await sessionManager.addMessage(state.session.id, msg);
        }
        const freshSession = await sessionManager.load(state.session.id);
        if (freshSession) {
          setState(prev => ({ ...prev, session: freshSession }));
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingThinking('');
      clearInterval(timer);
    }
  }, [messages, state, config, client, registry, sessionManager, skillInjector, costCalculator, sandbox, tokenCounter, isStreaming]);

  return (
    <Box flexDirection="column" height="100%">
      <Chat
        messages={messages}
        theme={theme}
        session={state.session}
        model={state.currentModel}
        thinkingEnabled={state.thinkingEnabled}
        webSearchEnabled={state.webSearchEnabled}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        streamingThinking={streamingThinking}
        error={error}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        totalCost={totalCost}
        totalTokens={totalTokens}
        elapsedTime={elapsedTime}
        config={config}
      />
    </Box>
  );
}

export { ZGLMApp };
