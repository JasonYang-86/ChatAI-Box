import fs from 'fs';
import path from 'path';

let workDir: string | null = null;

export function setWorkDir(dir: string) {
  if (!fs.existsSync(dir)) throw new Error(`目录不存在: ${dir}`);
  workDir = path.resolve(dir);
}

export function getWorkDir(): string | null {
  return workDir;
}

function safePath(targetPath: string): string {
  if (!workDir) throw new Error('未设置工作目录');
  const resolved = path.resolve(workDir, targetPath);
  if (!resolved.startsWith(workDir)) throw new Error('路径越界：不允许访问工作目录以外的文件');
  return resolved;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: number;
  children?: FileNode[];
}

export function listDir(dirPath: string): FileNode[] {
  const resolved = safePath(dirPath || '.');
  const entries = fs.readdirSync(resolved, { withFileTypes: true });
  return entries
    .filter((e) => !e.name.startsWith('.'))
    .map((e) => {
      const fullPath = path.join(resolved, e.name);
      const stat = fs.statSync(fullPath);
      const node: FileNode = { name: e.name, path: path.relative(workDir!, fullPath), type: e.isDirectory() ? 'directory' : 'file', size: stat.size, modifiedAt: stat.mtimeMs };
      if (node.type === 'directory') {
        try { node.children = listDir(node.path); } catch { node.children = []; }
      }
      return node;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function readFileContent(filePath: string): string {
  const resolved = safePath(filePath);
  const stat = fs.statSync(resolved);
  const maxSize = 5 * 1024 * 1024;
  if (stat.size > maxSize) {
    const ext = path.extname(filePath).toLowerCase();
    const textExts = ['.txt', '.md', '.json', '.xml', '.yml', '.yaml', '.csv', '.log', '.env',
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.c', '.cpp', '.h', '.hpp',
      '.html', '.css', '.scss', '.less', '.sql', '.sh', '.bat', '.ps1', '.ini', '.cfg', '.toml',
      '.vue', '.svelte', '.rb', '.php', '.swift', '.kt', '.scala', '.lua', '.r', '.m', '.mm'];
    if (!textExts.includes(ext)) {
      return `[二进制文件: ${path.basename(filePath)} (${(stat.size / 1024).toFixed(1)} KB)]`;
    }
  }
  return fs.readFileSync(resolved, 'utf-8');
}

export function writeFileContent(filePath: string, content: string): void {
  const resolved = safePath(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resolved, content, 'utf-8');
}

export function deleteFileOrDir(filePath: string): void {
  const resolved = safePath(filePath);
  if (!fs.existsSync(resolved)) return;
  const stat = fs.statSync(resolved);
  if (stat.isDirectory()) fs.rmSync(resolved, { recursive: true, force: true });
  else fs.unlinkSync(resolved);
}

export function renameFileOrDir(oldPath: string, newName: string): string {
  const resolved = safePath(oldPath);
  const newPath = path.join(path.dirname(resolved), newName);
  if (newPath.startsWith(workDir!)) {
    fs.renameSync(resolved, newPath);
    return path.relative(workDir!, newPath);
  }
  throw new Error('路径越界');
}

export function createDir(dirPath: string): void {
  const resolved = safePath(dirPath);
  if (!fs.existsSync(resolved)) fs.mkdirSync(resolved, { recursive: true });
}

export function createFile(filePath: string, content: string = ''): void {
  const resolved = safePath(filePath);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resolved, content, 'utf-8');
}

export function copyFileOrDir(srcPath: string, destPath: string): void {
  const resolvedSrc = safePath(srcPath);
  const resolvedDest = safePath(destPath);
  const stat = fs.statSync(resolvedSrc);
  if (stat.isDirectory()) fs.cpSync(resolvedSrc, resolvedDest, { recursive: true });
  else {
    const destDir = path.dirname(resolvedDest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(resolvedSrc, resolvedDest);
  }
}

export function readFileBinary(filePath: string): { data: number[]; mimeType: string } {
  const resolved = safePath(filePath);
  const buf = fs.readFileSync(resolved);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
    '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
    '.mp4': 'video/mp4', '.webm': 'video/webm',
  };
  return { data: Array.from(buf), mimeType: mimeMap[ext] || 'application/octet-stream' };
}
