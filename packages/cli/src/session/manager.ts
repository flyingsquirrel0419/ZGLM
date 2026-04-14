import { nanoid } from 'nanoid';
import type { Session, Message, SessionMetadata } from '@zglm/shared';
import { SessionStore } from './store.js';

const DEFAULT_METADATA: SessionMetadata = {
  totalTokens: 0,
  totalCost: 0,
  messageCount: 0,
  thinkingEnabled: false,
  webSearchEnabled: false,
  skills: [],
  files: [],
};

export class SessionManager {
  private store: SessionStore;
  current: Session | null = null;

  constructor(dbPath?: string) {
    this.store = new SessionStore(dbPath);
  }

  async init(): Promise<void> {
    void this.store;
  }

  async create(name?: string, model?: string): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: nanoid(),
      name: name ?? `Session ${now}`,
      createdAt: now,
      updatedAt: now,
      model: model ?? 'glm-5.1',
      cwd: process.cwd(),
      tags: [],
      messages: [],
      metadata: { ...DEFAULT_METADATA },
    };

    this.store.saveSession(session);
    this.current = session;
    return session;
  }

  async save(session: Session): Promise<void> {
    session.updatedAt = Date.now();
    this.recomputeMetadata(session);
    this.store.saveSession(session);
    if (this.current?.id === session.id) {
      this.current = session;
    }
  }

  async load(id: string): Promise<Session | null> {
    const session = this.store.loadSession(id);
    if (session) {
      this.current = session;
    }
    return session;
  }

  async list(): Promise<Session[]> {
    return this.store.listSessions();
  }

  async delete(id: string): Promise<boolean> {
    const result = this.store.deleteSession(id);
    if (this.current?.id === id) {
      this.current = null;
    }
    return result;
  }

  async branch(session: Session): Promise<Session> {
    const now = Date.now();
    const branched: Session = {
      id: nanoid(),
      name: `${session.name} (branch)`,
      createdAt: now,
      updatedAt: now,
      model: session.model,
      parentId: session.id,
      branchPoint: session.messages.length,
      cwd: session.cwd,
      tags: [...session.tags],
      messages: [...session.messages],
      metadata: { ...session.metadata },
    };

    this.store.saveSession(branched);
    this.current = branched;
    return branched;
  }

  async autoName(session: Session): Promise<string> {
    const firstUserMsg = session.messages.find((m) => m.role === 'user');
    if (!firstUserMsg) return session.name;

    const name = firstUserMsg.content
      .replace(/\n/g, ' ')
      .trim()
      .slice(0, 60);

    session.name = name;
    await this.save(session);
    return name;
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const session = this.store.loadSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if (!message.id) {
      message.id = nanoid();
    }
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }

    session.messages.push(message);
    session.updatedAt = Date.now();
    this.recomputeMetadata(session);

    this.store.appendMessage(sessionId, message);
    this.store.updateSessionMetadata(session);

    if (this.current?.id === sessionId) {
      this.current = session;
    }
  }

  private recomputeMetadata(session: Session): void {
    let totalTokens = 0;
    let totalCost = 0;

    for (const msg of session.messages) {
      if (msg.usage) {
        totalTokens += msg.usage.totalTokens;
      }
      if (msg.cost) {
        totalCost += msg.cost;
      }
    }

    session.metadata.totalTokens = totalTokens;
    session.metadata.totalCost = totalCost;
    session.metadata.messageCount = session.messages.length;
  }

  close(): void {
    this.store.close();
  }
}
