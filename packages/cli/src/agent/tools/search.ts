import type { ChatCompletionRequest, StreamChunk } from '@zglm/shared';

interface SearchClient {
  streamChat: (request: ChatCompletionRequest) => AsyncGenerator<StreamChunk>;
  chatCompletion: (request: ChatCompletionRequest) => Promise<{
    choices: Array<{
      message: {
        content: string | null;
      };
    }>;
  }>;
}

interface SearchConfig {
  count: number;
  contentSize: 'low' | 'medium' | 'high';
  recencyFilter: 'noLimit' | 'day' | 'week' | 'month';
}

let searchClient: SearchClient | null = null;
let searchConfig: SearchConfig = {
  count: 5,
  contentSize: 'medium',
  recencyFilter: 'noLimit',
};

export function setSearchClient(client: SearchClient): void {
  searchClient = client;
}

export function setSearchConfig(config: SearchConfig): void {
  searchConfig = config;
}

const CONTENT_SIZE_INSTRUCTIONS: Record<string, string> = {
  low: 'Provide a very brief summary (1-2 sentences per result).',
  medium: 'Provide a concise summary of the most relevant results with key facts.',
  high: 'Provide a detailed summary of all relevant results with comprehensive information, URLs, and dates.',
};

const RECENCY_INSTRUCTIONS: Record<string, string> = {
  noLimit: '',
  day: 'Focus only on results from the last 24 hours.',
  week: 'Focus only on results from the last week.',
  month: 'Focus only on results from the last month.',
};

export async function executeSearch(args: {
  query: string;
  count?: number;
}): Promise<string> {
  if (!searchClient) {
    return '[Web search unavailable] No API client configured. Set the Z.ai API key to enable web search.';
  }

  const resultCount = args.count ?? searchConfig.count;
  const contentInstruction = CONTENT_SIZE_INSTRUCTIONS[searchConfig.contentSize] ?? CONTENT_SIZE_INSTRUCTIONS.medium;
  const recencyInstruction = RECENCY_INSTRUCTIONS[searchConfig.recencyFilter] ?? '';

  const promptParts = [
    `Search the web for: ${args.query}`,
    '',
    contentInstruction,
    `Return up to ${resultCount} results.`,
  ];

  if (recencyInstruction) {
    promptParts.push(recencyInstruction);
  }

  try {
    const request: ChatCompletionRequest = {
      model: 'glm-4.6',
      messages: [
        {
          role: 'user',
          content: promptParts.join('\n'),
        },
      ],
      stream: false,
    };

    const response = await searchClient.chatCompletion(request);
    const content = response.choices[0]?.message?.content;

    if (!content) {
      return `[Web search] No results found for: "${args.query}"`;
    }

    return `[Web search results for: "${args.query}"]\n\n${content}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[Web search error] Failed to search for "${args.query}": ${message}`;
  }
}
