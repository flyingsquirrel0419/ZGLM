import type { StreamChunk } from '@zglm/shared';

const SSE_DONE_SIGNAL = '[DONE]';

export async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamChunk> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data: ')) {
          const payload = trimmed.slice(6).trim();
          if (payload === SSE_DONE_SIGNAL) return;
          if (payload === '') continue;

          try {
            const chunk: StreamChunk = JSON.parse(payload);
            yield chunk;
          } catch {
            continue;
          }
        }
      }
    }

    if (buffer.trim() !== '') {
      const remaining = buffer.trim();
      if (remaining.startsWith('data: ')) {
        const payload = remaining.slice(6).trim();
        if (payload !== SSE_DONE_SIGNAL && payload !== '') {
          try {
            const chunk: StreamChunk = JSON.parse(payload);
            yield chunk;
          } catch {
            void 0;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
