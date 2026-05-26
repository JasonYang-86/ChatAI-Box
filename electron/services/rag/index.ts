export { parseFile, getSupportedExtensions } from './file-parser';
export { chunkText, estimateTokens } from './text-chunker';
export type { TextChunk } from './text-chunker';
export { setEmbeddingConfig, createEmbedding, createEmbeddings } from './embedding';
export type { EmbeddingResult } from './embedding';
export { addVectors, searchSimilar, deleteByFileId, getChunkCount, getVectorDimension } from './vector-store';
export {
  indexFile,
  searchKnowledge,
  removeFile,
  getKnowledgeStats,
} from './knowledge';
export type { IndexFileOptions, IndexProgress, SearchOptions, SearchResultItem } from './knowledge';
