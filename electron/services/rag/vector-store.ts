import path from 'path';
import { app } from 'electron';
import fs from 'fs';

interface VectorRecord {
  id: string;
  file_id: string;
  content: string;
  vector: number[];
  chunk_index: number;
  created_at: number;
}

interface SearchResult {
  id: string;
  file_id: string;
  content: string;
  chunk_index: number;
  _distance: number;
}

let db: import('@lancedb/lancedb').Connection | null = null;
let table: import('@lancedb/lancedb').Table | null = null;
const TABLE_NAME = 'knowledge_chunks';

async function getDb(): Promise<import('@lancedb/lancedb').Connection> {
  if (!db) {
    const lancedb = await import('@lancedb/lancedb');
    const dbPath = path.join(app.getPath('userData'), 'lancedb');
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
    }
    db = await lancedb.connect(dbPath);
  }
  return db;
}

async function getTable(): Promise<import('@lancedb/lancedb').Table> {
  if (table) return table;

  const database = await getDb();
  const tableNames = await database.tableNames();

  if (tableNames.includes(TABLE_NAME)) {
    table = await database.openTable(TABLE_NAME);
  } else {
    table = await database.createTable(TABLE_NAME, [
      {
        id: '_init_',
        file_id: '_init_',
        content: '',
        vector: new Array(1536).fill(0),
        chunk_index: 0,
        created_at: Date.now(),
      },
    ]);
    await table.delete('id = "_init_"');
  }

  return table;
}

export async function addVectors(records: VectorRecord[]): Promise<void> {
  const tbl = await getTable();
  await tbl.add(records as unknown as Record<string, unknown>[]);
}

export async function searchSimilar(
  vector: number[],
  limit: number = 5,
): Promise<SearchResult[]> {
  const tbl = await getTable();
  const results = await tbl.vectorSearch(vector).limit(limit).toArray();
  return results as unknown as SearchResult[];
}

export async function deleteByFileId(fileId: string): Promise<void> {
  const tbl = await getTable();
  try {
    await tbl.delete(`file_id = "${fileId}"`);
  } catch {
    // 删除失败时静默处理
  }
}

export async function getChunkCount(): Promise<number> {
  const tbl = await getTable();
  return await tbl.countRows();
}

export function getVectorDimension(): number {
  return 1536;
}
