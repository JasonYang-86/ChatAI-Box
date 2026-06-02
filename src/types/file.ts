export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
  children?: FileNode[];
}

export interface FileChange {
  filePath: string;
  previousContent: string | null;
  newContent: string;
  timestamp: number;
  description: string;
}

export type FilePermission = 'always-confirm' | 'confirm-once' | 'trusted';
