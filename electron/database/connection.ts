import path from 'path';
import fs from 'fs';
import { app } from 'electron';

interface SqlJsDatabase {
  run(sql: string, params?: unknown[] | Record<string, unknown>): void;
  exec(sql: string, params?: unknown[]): SqlJsQueryResult[];
  prepare(sql: string): SqlJsStatement;
  export(): Uint8Array;
  close(): void;
}

interface SqlJsQueryResult {
  columns: string[];
  values: unknown[][];
}

interface SqlJsStatement {
  bind(params?: unknown[] | Record<string, unknown>): boolean;
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): boolean;
}

interface SqlJsStatic {
  Database: new (data?: ArrayLike<number> | Buffer | null) => SqlJsDatabase;
}

let sqlJs: SqlJsStatic | null = null;
let db: SqlJsDatabase | null = null;
let dbPath: string;

function resolveWasmPath(): string {
  const possiblePaths = [
    path.join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.join(app.getAppPath(), '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  const found = require.resolve('sql.js');
  const sqlDir = path.dirname(found);
  return path.join(sqlDir, '..', 'dist', 'sql-wasm.wasm');
}

export async function initDatabase(): Promise<SqlJsDatabase> {
  if (db) return db;

  const initSqlJs = (await import('sql.js')).default;
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'chatai.db');

  const wasmPath = resolveWasmPath();
  sqlJs = await initSqlJs({
    locateFile: () => wasmPath,
  });

  let fileBuffer: ArrayBuffer | undefined;
  if (fs.existsSync(dbPath)) {
    try {
      fileBuffer = fs.readFileSync(dbPath).buffer;
    } catch {
      fileBuffer = undefined;
    }
  }

  db = new sqlJs.Database(fileBuffer ? new Uint8Array(fileBuffer) : undefined);

  db.run('PRAGMA foreign_keys = ON');

  initializeSchema(db);
  seedBuiltinData(db);

  return db;
}

export function getDatabase(): SqlJsDatabase {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

export function saveDatabase(): void {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function closeDatabase(): void {
  saveDatabase();
  if (db) {
    db.close();
    db = null;
  }
}

// ============ Schema ============

function initializeSchema(database: SqlJsDatabase): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '新对话',
      model_id TEXT NOT NULL,
      system_prompt TEXT,
      character_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      is_pinned INTEGER DEFAULT 0,
      is_archived INTEGER DEFAULT 0
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      extracted_text TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      system_prompt TEXT NOT NULL,
      avatar TEXT,
      is_builtin INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS model_configs (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      model_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT,
      parameters TEXT,
      is_enabled INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      content TEXT NOT NULL,
      variables TEXT,
      is_builtin INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS knowledge_files (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      chunk_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at INTEGER NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS knowledge_chunks (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      token_count INTEGER,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (file_id) REFERENCES knowledge_files(id) ON DELETE CASCADE
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  database.run(`
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      command TEXT NOT NULL,
      args TEXT NOT NULL DEFAULT '[]',
      env TEXT,
      is_enabled INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    )
  `);

  createIndexes(database);
}

function createIndexes(database: SqlJsDatabase): void {
  database.run('CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)');
  database.run('CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)');
  database.run('CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at)');
  database.run('CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_file ON knowledge_chunks(file_id)');
}

// ============ Seed Data ============

interface CharacterRow {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  avatar: string;
}

const BUILTIN_CHARACTERS: CharacterRow[] = [
  {
    id: 'char-default',
    name: '默认助手',
    description: '通用AI助手',
    systemPrompt: '你是一个有帮助的AI助手。请用简洁清晰的语言回答用户的问题。',
    avatar: '🤖',
  },
  {
    id: 'char-coder',
    name: '编程助手',
    description: '擅长编程和技术问题',
    systemPrompt:
      '你是一个经验丰富的软件工程师。请提供准确、可运行的代码示例，并解释关键概念。优先使用最佳实践和设计模式。代码请使用对应语言的代码块格式。',
    avatar: '💻',
  },
  {
    id: 'char-translator',
    name: '翻译官',
    description: '多语言翻译专家',
    systemPrompt:
      '你是一个专业的翻译专家。请准确、地道地翻译用户提供的文本。如果是中译外，请确保符合目标语言的表达习惯；如果是外译中，请确保符合中文表达习惯。',
    avatar: '🌐',
  },
  {
    id: 'char-writer',
    name: '写作助手',
    description: '帮助写作和润色',
    systemPrompt:
      '你是一个专业的写作助手。请帮助用户改进他们的写作，包括但不限于：语法修正、风格优化、结构调整、内容扩展。请保持用户的原始语气和意图。',
    avatar: '✍️',
  },
];

function seedBuiltinData(database: SqlJsDatabase): void {
  const result = database.exec('SELECT COUNT(*) as cnt FROM characters WHERE is_builtin = 1');
  if (result.length > 0 && result[0].values.length > 0 && (result[0].values[0][0] as number) > 0) {
    return;
  }

  const now = Date.now();
  for (const char of BUILTIN_CHARACTERS) {
    database.run(
      'INSERT INTO characters (id, name, description, system_prompt, avatar, is_builtin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)',
      [char.id, char.name, char.description, char.systemPrompt, char.avatar, now, now],
    );
  }
}
