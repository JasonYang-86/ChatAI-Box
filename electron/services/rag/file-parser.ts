import fs from 'fs';
import path from 'path';

const SUPPORTED_TYPES: Record<string, string[]> = {
  'text/plain': ['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml', 'log', 'py', 'ts', 'js', 'tsx', 'jsx', 'css', 'html'],
  'application/pdf': ['pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
};

function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().slice(1);
  for (const [mime, exts] of Object.entries(SUPPORTED_TYPES)) {
    if (exts.includes(ext)) return mime;
  }
  return 'text/plain';
}

export async function parseFile(filePath: string): Promise<string> {
  const fileType = getFileType(filePath);

  switch (fileType) {
    case 'application/pdf':
      return parsePdf(filePath);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(filePath);
    default:
      return parseText(filePath);
  }
}

async function parseText(filePath: string): Promise<string> {
  return fs.readFileSync(filePath, 'utf-8');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfParseFn: ((buf: Buffer) => Promise<{ text: string }>) | null = null;

async function ensurePdfParse(): Promise<(buf: Buffer) => Promise<{ text: string }>> {
  if (!pdfParseFn) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfModule = require('pdf-parse');
    pdfParseFn = (buf: Buffer) => {
      return new Promise((resolve, reject) => {
        const fn = typeof pdfModule === 'function' ? pdfModule : pdfModule.default;
        if (typeof fn === 'function') {
          fn(buf).then(resolve).catch(reject);
        } else {
          reject(new Error('pdf-parse 模块加载失败'));
        }
      });
    };
  }
  return pdfParseFn;
}

async function parsePdf(filePath: string): Promise<string> {
  try {
    const parser = await ensurePdfParse();
    const buffer = fs.readFileSync(filePath);
    const data = await parser(buffer);
    return data.text || '';
  } catch {
    return fs.readFileSync(filePath, 'utf-8').replace(/[^\x20-\x7E\u4e00-\u9fff\u3000-\u303f\uff00-\uffef\n\r]/g, '');
  }
}

async function parseDocx(filePath: string): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch {
    return '';
  }
}

export function getSupportedExtensions(): string[] {
  const allExts = new Set<string>();
  for (const exts of Object.values(SUPPORTED_TYPES)) {
    for (const ext of exts) allExts.add(ext);
  }
  return Array.from(allExts);
}
