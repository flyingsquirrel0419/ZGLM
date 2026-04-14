export type {
  Message,
  ToolCall,
  ToolCallDelta,
  TokenUsage,
  Tool,
  ChatCompletionRequest,
  ApiMessage,
  ContentPart,
  StreamChunk,
  StreamChoice,
  StreamDelta,
  ModelCapability,
  ModelMeta,
} from '@zglm/shared';

export interface ZGLMClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      reasoning_content?: string | null;
      tool_calls?: import('@zglm/shared').ToolCall[];
    };
    finish_reason: string | null;
  }[];
  usage?: import('@zglm/shared').TokenUsage;
}

export interface ModelListResponse {
  object: string;
  data: {
    id: string;
    object: string;
    created: number;
    owned_by: string;
  }[];
}
