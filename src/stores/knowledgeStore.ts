import { create } from 'zustand';

interface KnowledgeFile {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  chunkCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  createdAt: number;
}

interface IndexProgress {
  fileId: string;
  status: string;
  progress: number;
  error?: string;
}

interface KnowledgeState {
  files: KnowledgeFile[];
  isIndexing: boolean;
  indexingProgress: string;
  knowledgeEnabled: boolean;

  setFiles: (files: KnowledgeFile[]) => void;
  addFile: (file: KnowledgeFile) => void;
  removeFile: (id: string) => void;
  updateFileStatus: (id: string, updates: Partial<KnowledgeFile>) => void;
  setIndexing: (indexing: boolean, progress?: string) => void;
  setKnowledgeEnabled: (enabled: boolean) => void;
}

export const useKnowledgeStore = create<KnowledgeState>((set) => ({
  files: [],
  isIndexing: false,
  indexingProgress: '',
  knowledgeEnabled: false,

  setFiles: (files) => set({ files }),

  addFile: (file) =>
    set((state) => ({ files: [file, ...state.files] })),

  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((f) => f.id !== id),
    })),

  updateFileStatus: (id, updates) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),

  setIndexing: (indexing, progress = '') =>
    set({ isIndexing: indexing, indexingProgress: progress }),

  setKnowledgeEnabled: (enabled) => set({ knowledgeEnabled: enabled }),
}));

export type { KnowledgeFile, IndexProgress };
