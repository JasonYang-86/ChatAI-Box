import { create } from 'zustand';
import type { FileNode, FileChange, FilePermission } from '@/types/file';

interface FileState {
  workDir: string | null;
  fileTree: FileNode[];
  openFiles: string[];
  activeFile: string | null;
  fileContents: Record<string, string>;
  filePermission: FilePermission;
  changes: FileChange[];
  isPanelOpen: boolean;

  setWorkDir: (dir: string | null) => void;
  setFileTree: (tree: FileNode[]) => void;
  openFile: (path: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  setFilePermission: (perm: FilePermission) => void;
  addChange: (change: FileChange) => void;
  undoLastChange: () => FileChange | undefined;
  clearChanges: () => void;
  togglePanel: () => void;
  setPanelOpen: (open: boolean) => void;
}

export const useFileStore = create<FileState>((set, get) => ({
  workDir: null,
  fileTree: [],
  openFiles: [],
  activeFile: null,
  fileContents: {},
  filePermission: 'always-confirm',
  changes: [],
  isPanelOpen: false,

  setWorkDir: (dir) => set({ workDir: dir, fileTree: [], openFiles: [], activeFile: null, fileContents: {} }),
  setFileTree: (tree) => set({ fileTree: tree }),

  openFile: (path) => {
    const { openFiles } = get();
    if (!openFiles.includes(path)) set({ openFiles: [...openFiles, path] });
    set({ activeFile: path });
  },

  closeFile: (path) => {
    const { openFiles, activeFile } = get();
    const next = openFiles.filter((f) => f !== path);
    const newActive = activeFile === path ? next[next.length - 1] || null : activeFile;
    set({ openFiles: next, activeFile: newActive });
  },

  setActiveFile: (path) => set({ activeFile: path }),
  updateFileContent: (path, content) =>
    set((s) => ({ fileContents: { ...s.fileContents, [path]: content } })),

  setFilePermission: (perm) => set({ filePermission: perm }),
  addChange: (change) => set((s) => ({ changes: [...s.changes, change] })),
  undoLastChange: () => {
    const { changes } = get();
    if (changes.length === 0) return undefined;
    const last = changes[changes.length - 1];
    set({ changes: changes.slice(0, -1) });
    return last;
  },
  clearChanges: () => set({ changes: [] }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),
  setPanelOpen: (open) => set({ isPanelOpen: open }),
}));
