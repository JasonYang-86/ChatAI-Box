import { v4 as uuidv4 } from 'uuid';
import { parseFile } from './file-parser';
import { chunkText, estimateTokens } from './text-chunker';
import { createEmbeddings, setEmbeddingConfig } from './embedding';
import { addVectors, searchSimilar, deleteByFileId, getChunkCount } from './vector-store';
import { getDatabase, saveDatabase } from '../../database/connection';

export interface IndexFileOptions {
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

export interface IndexProgress {
  fileId: string;
  status: 'parsing' | 'chunking' | 'embedding' | 'storing' | 'done' | 'error';
  progress: number;
  error?: string;
}

export async function indexFile(
  options: IndexFileOptions,
  onProgress?: (progress: IndexProgress) => void,
): Promise<string> {
  const db = getDatabase();
  const fileId = uuidv4();
  const now = Date.now();

  db.run(
    'INSERT INTO knowledge_files (id, file_name, file_path, file_type, file_size, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [fileId, options.fileName, options.filePath, options.fileType, options.fileSize, 'processing', now],
  );
  saveDatabase();

  const report = (status: IndexProgress['status'], progress: number, error?: string) => {
    db.run('UPDATE knowledge_files SET status = ?, chunk_count = ? WHERE id = ?', [
      error ? 'error' : status,
      progress,
      fileId,
    ]);
    saveDatabase();
    onProgress?.({ fileId, status, progress, error });
  };

  try {
    report('parsing', 0);
    const text = await parseFile(options.filePath);
    if (!text || text.trim().length === 0) {
      throw new Error('文件内容为空或无法解析');
    }

    report('chunking', 0);
    const chunks = chunkText(text, 512, 50);
    if (chunks.length === 0) {
      throw new Error('文本分块结果为空');
    }

    report('embedding', 0);
    setEmbeddingConfig({
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      model: options.model,
    });

    const chunkTexts = chunks.map((c) => c.content);
    const embeddings = await createEmbeddings(chunkTexts);

    report('storing', 0);
    const records = chunks.map((chunk, i) => ({
      id: uuidv4(),
      file_id: fileId,
      content: chunk.content,
      vector: embeddings[i].vector,
      chunk_index: chunk.index,
      created_at: now,
    }));

    await addVectors(records);

    for (let i = 0; i < chunks.length; i++) {
      db.run(
        'INSERT INTO knowledge_chunks (id, file_id, chunk_index, content, token_count, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [uuidv4(), fileId, chunks[i].index, chunks[i].content, estimateTokens(chunks[i].content), now],
      );
    }

    report('done', chunks.length);
    return fileId;
  } catch (e) {
    const error = (e as Error).message || '索引失败';
    report('error', 0, error);
    throw e;
  }
}

export interface SearchOptions {
  query: string;
  apiKey: string;
  baseUrl?: string;
  model?: string;
  limit?: number;
}

export interface SearchResultItem {
  content: string;
  fileName: string;
  score: number;
}

export async function searchKnowledge(options: SearchOptions): Promise<SearchResultItem[]> {
  setEmbeddingConfig({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    model: options.model,
  });

  const { createEmbedding } = await import('./embedding');
  const embedding = await createEmbedding(options.query);

  const results = await searchSimilar(embedding.vector, options.limit || 5);

  const db = getDatabase();
  const items: SearchResultItem[] = [];

  for (const r of results) {
    const stmt = db.prepare('SELECT file_name FROM knowledge_files WHERE id = ?');
    stmt.bind([r.file_id]);
    let fileName = '未知文件';
    if (stmt.step()) {
      fileName = (stmt.getAsObject() as { file_name: string }).file_name;
    }
    stmt.free();
    items.push({
      content: r.content,
      fileName,
      score: 1 - (r._distance || 0),
    });
  }

  return items.sort((a, b) => b.score - a.score);
}

export async function removeFile(fileId: string): Promise<void> {
  await deleteByFileId(fileId);

  const db = getDatabase();
  db.run('DELETE FROM knowledge_chunks WHERE file_id = ?', [fileId]);
  db.run('DELETE FROM knowledge_files WHERE id = ?', [fileId]);
  saveDatabase();
}

export async function getKnowledgeStats(): Promise<{
  fileCount: number;
  totalChunks: number;
}> {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as cnt FROM knowledge_files WHERE status = ?');
  stmt.bind(['done']);
  let fileCount = 0;
  if (stmt.step()) {
    fileCount = (stmt.getAsObject() as { cnt: number }).cnt;
  }
  stmt.free();
  const totalChunks = await getChunkCount();
  return { fileCount, totalChunks };
}
