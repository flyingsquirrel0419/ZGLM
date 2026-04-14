import type { Message } from '@zglm/shared';

const CHARS_PER_TOKEN = 4;

export class TokenCounter {
  count(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  countMessages(messages: Message[]): number {
    let total = 0;
    for (const msg of messages) {
      total += this.count(msg.content);
      if (msg.thinkingContent) {
        total += this.count(msg.thinkingContent);
      }
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          total += this.count(tc.function.name);
          total += this.count(tc.function.arguments);
        }
      }
    }
    total += messages.length * 4;
    return total;
  }
}

export const tokenCounter = new TokenCounter();
