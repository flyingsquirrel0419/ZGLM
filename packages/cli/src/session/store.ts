import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { Session, Message, TokenUsage } from '@zglm/shared';
import path from 'node:path';
import fs from 'node:fs';

export interface UsageLog {
  id: string;
  sessionId: string;
  date: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  reasoningTokens: number;
  cost: number;
  createdAt: number;
}

interface SessionRow {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  model: string;
  parent_id: string | null;
  branch_point: number | null;
  cwd: string;
  tags: string;
  metadata: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  thinking_content: string | null;
  tool_calls: string | null;
  tool_call_id: string | null;
  name: string | null;
  timestamp: number;
  model: string | null;
  usage: string | null;
  cost: number | null;
  seq: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  model TEXT NOT NULL,
  parent_id TEXT,
  branch_point INTEGER,
  cwd TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  metadata TEXT DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
  content TEXT NOT NULL,
  thinking_content TEXT,
  tool_calls TEXT,
  tool_call_id TEXT,
  name TEXT,
  timestamp INTEGER NOT NULL,
  model TEXT,
  usage TEXT,
  cost REAL,
  seq INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  reasoning_tokens INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, seq);
CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_date ON usage_logs(date, model);
`;

export class SessionStore {
  private db: Database.Database;
  private stmts: {
    insertSession: Database.Statement;
    updateSession: Database.Statement;
    loadSession: Database.Statement;
    listSessions: Database.Statement;
    deleteSession: Database.Statement;
    insertMessage: Database.Statement;
    deleteMessages: Database.Statement;
    loadMessages: Database.Statement;
    maxSeq: Database.Statement;
    insertUsageLog: Database.Statement;
  };

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? path.join(process.env.HOME ?? '/root', '.config', 'zglm', 'sessions.db');
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');

    this.db.exec(SCHEMA);

    this.stmts = {
      insertSession: this.db.prepare(
        `INSERT INTO sessions (id, name, created_at, updated_at, model, parent_id, branch_point, cwd, tags, metadata)
         VALUES (@id, @name, @createdAt, @updatedAt, @model, @parentId, @branchPoint, @cwd, @tags, @metadata)`
      ),
      updateSession: this.db.prepare(
        `UPDATE sessions SET name = @name, updated_at = @updatedAt, model = @model, cwd = @cwd, tags = @tags, metadata = @metadata
         WHERE id = @id`
      ),
      loadSession: this.db.prepare('SELECT * FROM sessions WHERE id = ?'),
      listSessions: this.db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC'),
      deleteSession: this.db.prepare('DELETE FROM sessions WHERE id = ?'),
      insertMessage: this.db.prepare(
        `INSERT INTO messages (id, session_id, role, content, thinking_content, tool_calls, tool_call_id, name, timestamp, model, usage, cost, seq)
         VALUES (@id, @sessionId, @role, @content, @thinkingContent, @toolCalls, @toolCallId, @name, @timestamp, @model, @usage, @cost, @seq)`
      ),
      deleteMessages: this.db.prepare('DELETE FROM messages WHERE session_id = ?'),
      loadMessages: this.db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY seq ASC'),
      maxSeq: this.db.prepare('SELECT MAX(seq) as maxSeq FROM messages WHERE session_id = ?'),
      insertUsageLog: this.db.prepare(
        `INSERT INTO usage_logs (id, session_id, date, model, prompt_tokens, completion_tokens, reasoning_tokens, cost, created_at)
         VALUES (@id, @sessionId, @date, @model, @promptTokens, @completionTokens, @reasoningTokens, @cost, @createdAt)`
      ),
    };
  }

  private serializeSession(session: Session) {
    return {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      model: session.model,
      parentId: session.parentId ?? null,
      branchPoint: session.branchPoint ?? null,
      cwd: session.cwd,
      tags: JSON.stringify(session.tags),
      metadata: JSON.stringify(session.metadata),
    };
  }

  private deserializeSession(row: SessionRow): Omit<Session, 'messages'> {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      model: row.model,
      parentId: row.parent_id ?? undefined,
      branchPoint: row.branch_point ?? undefined,
      cwd: row.cwd,
      tags: JSON.parse(row.tags),
      metadata: JSON.parse(row.metadata),
    };
  }

  private serializeMessage(sessionId: string, message: Message, seq: number) {
    return {
      id: message.id,
      sessionId,
      role: message.role,
      content: message.content,
      thinkingContent: message.thinkingContent ?? null,
      toolCalls: message.toolCalls ? JSON.stringify(message.toolCalls) : null,
      toolCallId: message.toolCallId ?? null,
      name: message.name ?? null,
      timestamp: message.timestamp,
      model: message.model ?? null,
      usage: message.usage ? JSON.stringify(message.usage) : null,
      cost: message.cost ?? null,
      seq,
    };
  }

  private deserializeMessage(row: MessageRow): Message {
    return {
      id: row.id,
      role: row.role as Message['role'],
      content: row.content,
      thinkingContent: row.thinking_content ?? undefined,
      toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
      toolCallId: row.tool_call_id ?? undefined,
      name: row.name ?? undefined,
      timestamp: row.timestamp,
      model: row.model ?? undefined,
      usage: row.usage ? JSON.parse(row.usage) as TokenUsage : undefined,
      cost: row.cost ?? undefined,
    };
  }

  saveSession(session: Session): void {
    const existing = this.stmts.loadSession.get(session.id) as SessionRow | undefined;

    const saveAll = this.db.transaction(() => {
      if (existing) {
        this.stmts.updateSession.run(this.serializeSession(session));
        this.stmts.deleteMessages.run(session.id);
      } else {
        this.stmts.insertSession.run(this.serializeSession(session));
      }

      for (let i = 0; i < session.messages.length; i++) {
        this.stmts.insertMessage.run(this.serializeMessage(session.id, session.messages[i], i));
      }
    });

    saveAll();
  }

  appendMessage(sessionId: string, message: Message): void {
    const seqResult = this.stmts.maxSeq.get(sessionId) as { maxSeq: number | null } | undefined;
    const nextSeq = (seqResult?.maxSeq ?? -1) + 1;
    this.stmts.insertMessage.run(this.serializeMessage(sessionId, message, nextSeq));
  }

  updateSessionMetadata(session: Omit<Session, 'messages'>): void {
    const data = {
      id: session.id,
      name: session.name,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      model: session.model,
      parentId: session.parentId ?? null,
      branchPoint: session.branchPoint ?? null,
      cwd: session.cwd,
      tags: JSON.stringify(session.tags),
      metadata: JSON.stringify(session.metadata),
    };
    this.stmts.updateSession.run(data);
  }

  loadSession(id: string): Session | null {
    const row = this.stmts.loadSession.get(id) as SessionRow | undefined;
    if (!row) return null;

    const sessionData = this.deserializeSession(row);
    const messageRows = this.stmts.loadMessages.all(id) as MessageRow[];
    const messages = messageRows.map((r) => this.deserializeMessage(r));

    return { ...sessionData, messages };
  }

  listSessions(): Session[] {
    const rows = this.stmts.listSessions.all() as SessionRow[];
    return rows.map((row) => {
      const sessionData = this.deserializeSession(row);
      const messageRows = this.stmts.loadMessages.all(row.id) as MessageRow[];
      const messages = messageRows.map((r) => this.deserializeMessage(r));
      return { ...sessionData, messages };
    });
  }

  deleteSession(id: string): boolean {
    const result = this.stmts.deleteSession.run(id);
    return result.changes > 0;
  }

  saveUsageLog(log: Omit<UsageLog, 'id' | 'createdAt'>): void {
    this.stmts.insertUsageLog.run({
      id: nanoid(),
      sessionId: log.sessionId,
      date: log.date,
      model: log.model,
      promptTokens: log.promptTokens,
      completionTokens: log.completionTokens,
      reasoningTokens: log.reasoningTokens,
      cost: log.cost,
      createdAt: Date.now(),
    });
  }

  close(): void {
    this.db.close();
  }
}
