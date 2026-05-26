export interface TextChunk {
  content: string;
  index: number;
  startPos: number;
  endPos: number;
}

export function chunkText(
  text: string,
  chunkSize = 512,
  overlap = 50,
): TextChunk[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: TextChunk[] = [];
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let index = 0;
  let startPos = 0;

  while (startPos < cleanText.length) {
    let endPos = Math.min(startPos + chunkSize, cleanText.length);

    if (endPos < cleanText.length) {
      const lastNewline = cleanText.lastIndexOf('\n', endPos);
      if (lastNewline > startPos + chunkSize / 2) {
        endPos = lastNewline;
      } else {
        const lastPeriod = cleanText.lastIndexOf('。', endPos);
        if (lastPeriod > startPos + chunkSize / 2) {
          endPos = lastPeriod + 1;
        }
      }
    }

    const content = cleanText.slice(startPos, endPos).trim();
    if (content.length > 0) {
      chunks.push({ content, index, startPos, endPos });
      index++;
    }

    startPos = endPos - overlap;
    if (startPos <= (chunks.length > 0 ? chunks[chunks.length - 1].startPos : 0)) {
      startPos = endPos;
    }
  }

  return chunks;
}

export function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.replace(/[\u4e00-\u9fff]/g, '').length;
  return Math.ceil(chineseChars * 1.5 + otherChars / 3.5);
}
