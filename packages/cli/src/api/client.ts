import type { ChatCompletionRequest, StreamChunk } from '@zglm/shared';
import type { ZGLMClientOptions, ChatResponse, ModelListResponse } from './types.js';
import { MODEL_CATALOG } from './models.js';
import { parseSSEStream } from './stream.js';

const DEFAULT_BASE_URL = 'https://api.z.ai/api/paas/v4';
const DEFAULT_TIMEOUT = 120_000;

export class ZGLMAPIError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = 'ZGLMAPIError';
    this.status = status;
    this.body = body;
  }
}

export class ZGLMClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(options: ZGLMClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private async parseErrorResponse(response: Response): Promise<never> {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text().catch(() => '');
    }

    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? (body as { error: { message: string } }).error.message
        : `API request failed with status ${response.status}`;

    throw new ZGLMAPIError(message, response.status, body);
  }

  async *streamChat(request: ChatCompletionRequest): AsyncGenerator<StreamChunk> {
    const url = `${this.baseUrl}/chat/completions`;
    const body = JSON.stringify({ ...request, stream: true });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ZGLMAPIError('Request timed out', 408);
      }
      throw err;
    }

    clearTimeout(timer);

    if (!response.ok) {
      await this.parseErrorResponse(response);
    }

    const responseBody = response.body;
    if (!responseBody) {
      throw new ZGLMAPIError('Response body is null', 500);
    }

    yield* parseSSEStream(responseBody);
  }

  async chatCompletion(request: ChatCompletionRequest): Promise<ChatResponse> {
    const url = `${this.baseUrl}/chat/completions`;
    const body = JSON.stringify({ ...request, stream: false });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ZGLMAPIError('Request timed out', 408);
      }
      throw err;
    }

    clearTimeout(timer);

    if (!response.ok) {
      await this.parseErrorResponse(response);
    }

    return response.json() as Promise<ChatResponse>;
  }

  async listModels(): Promise<ModelListResponse> {
    const url = `${this.baseUrl}/models`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ZGLMAPIError('Request timed out', 408);
      }
      throw err;
    }

    clearTimeout(timer);

    if (!response.ok) {
      await this.parseErrorResponse(response);
    }

    return response.json() as Promise<ModelListResponse>;
  }

  getCatalogModels() {
    return Object.values(MODEL_CATALOG);
  }
}
