/**
 * TF-IDF 向量化器（TypeScript 实现）
 *
 * 对标 Python 版 LightweightEmbeddingService，使用纯 TypeScript 实现：
 * - 字符级 n-gram（1-gram + 2-gram）处理中英文混合文本
 * - 平滑 IDF：log((N+1)/(df+1)) + 1
 * - 余弦相似度搜索
 * - 无需任何外部 NLP 依赖
 */

import * as fs from 'fs';
import * as path from 'path';

interface TfidfIndex {
  /** 词汇表：term -> index */
  vocabulary: Record<string, number>;
  /** IDF 值数组，按 vocabulary 索引排列 */
  idf: number[];
  /** 文档数 */
  docCount: number;
  /** 向量维度 */
  dimension: number;
}

export class TfidfVectorizer {
  private index: TfidfIndex;
  private indexPath: string;

  constructor(indexPath: string, maxFeatures: number = 5000) {
    this.indexPath = indexPath;
    this.index = this.loadIndex() || {
      vocabulary: {},
      idf: [],
      docCount: 0,
      dimension: maxFeatures,
    };
  }

  /** 加载已保存的索引 */
  private loadIndex(): TfidfIndex | null {
    try {
      if (fs.existsSync(this.indexPath)) {
        const raw = fs.readFileSync(this.indexPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // 索引文件损坏，重新构建
    }
    return null;
  }

  /** 保存索引到文件 */
  private saveIndex(): void {
    const dir = path.dirname(this.indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index), 'utf-8');
  }

  /**
   * 分词：将文本转为 n-gram token 列表
   * 对中文使用字符级 bigram，对英文使用单词级 unigram+bigram
   */
  private tokenize(text: string): string[] {
    const tokens: string[] = [];
    const normalized = text.toLowerCase().trim();
    if (!normalized) return tokens;

    // 按空白和标点分割
    const segments = normalized.split(/[\s，。！？、；：""''（）\(\)\[\]【】\{\}]+/).filter(Boolean);

    for (const seg of segments) {
      // 判断是否是中文为主的段
      const hasChinese = /[\u4e00-\u9fff]/.test(seg);

      if (hasChinese) {
        // 字符级 n-gram（中文）
        const chars = [...seg];
        for (const ch of chars) {
          tokens.push(ch); // 1-gram
        }
        for (let i = 0; i < chars.length - 1; i++) {
          tokens.push(chars[i] + chars[i + 1]); // 2-gram
        }
      } else {
        // 单词级 n-gram（英文）
        tokens.push(seg); // 单词本身
        if (seg.length >= 2) {
          // 字符级 bigram 作为补充
          for (let i = 0; i < seg.length - 1; i++) {
            tokens.push(seg.slice(i, i + 2));
          }
        }
      }
    }

    return tokens;
  }

  /**
   * 在一组文档上拟合 TF-IDF 模型
   * 返回文档-词项矩阵
   */
  fitTransform(documents: string[]): number[][] {
    if (documents.length === 0) return [];

    // 1. 收集词项-文档频率
    const termDf: Record<string, number> = {};
    const docTokensList: string[][] = [];

    for (const doc of documents) {
      const tokens = this.tokenize(doc);
      docTokensList.push(tokens);
      const uniqueTokens = new Set(tokens);
      for (const t of uniqueTokens) {
        termDf[t] = (termDf[t] || 0) + 1;
      }
    }

    // 2. 构建词汇表（按频率排序，限制 maxFeatures）
    const N = documents.length;
    const sortedTerms = Object.entries(termDf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, this.index.dimension);

    this.index.vocabulary = {};
    for (let i = 0; i < sortedTerms.length; i++) {
      this.index.vocabulary[sortedTerms[i][0]] = i;
    }
    this.index.docCount = N;

    // 3. 计算 IDF（平滑版本）
    this.index.idf = new Array(sortedTerms.length).fill(0);
    for (const [term, df] of sortedTerms) {
      const idx = this.index.vocabulary[term];
      this.index.idf[idx] = Math.log((N + 1) / (df + 1)) + 1;
    }

    this.saveIndex();

    // 4. 转换文档为 TF-IDF 向量
    return docTokensList.map((tokens) => this.tokensToVector(tokens));
  }

  /** 将单个文本转为 TF-IDF 向量 */
  transform(text: string): number[] {
    const tokens = this.tokenize(text);
    return this.tokensToVector(tokens);
  }

  /** 批量转换 */
  transformBatch(texts: string[]): number[][] {
    return texts.map((t) => this.transform(t));
  }

  /**
   * 将 token 列表转为 TF-IDF 向量
   */
  private tokensToVector(tokens: string[]): number[] {
    const dim = Object.keys(this.index.vocabulary).length;
    if (dim === 0) return [];

    const vec = new Array(dim).fill(0);

    // 计算 TF
    const tf: Record<number, number> = {};
    for (const token of tokens) {
      const idx = this.index.vocabulary[token];
      if (idx !== undefined) {
        tf[idx] = (tf[idx] || 0) + 1;
      }
    }

    // TF * IDF
    for (const [idx, count] of Object.entries(tf)) {
      const i = Number(idx);
      vec[i] = count * this.index.idf[i];
    }

    // L2 归一化
    const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) {
        vec[i] /= norm;
      }
    }

    return vec;
  }

  /**
   * 余弦相似度搜索
   */
  search(
    query: string,
    candidates: string[],
    topK: number = 5,
    minScore: number = 0,
  ): Array<{ index: number; text: string; score: number }> {
    if (candidates.length === 0) return [];

    const queryVec = this.transform(query);
    const candidateVecs = this.transformBatch(candidates);

    if (queryVec.length === 0) return [];

    // 计算余弦相似度
    const similarities = candidateVecs.map((cv) => {
      if (cv.length === 0) return 0;
      let dot = 0;
      for (let i = 0; i < cv.length; i++) {
        dot += queryVec[i] * cv[i];
      }
      return dot; // 已做 L2 归一化，点积即余弦相似度
    });

    // 排序取 top-K
    const ranked = similarities
      .map((score, idx) => ({ index: idx, score }))
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return ranked.map((r) => ({
      index: r.index,
      text: candidates[r.index],
      score: r.score,
    }));
  }

  /** 获取向量维度 */
  get dimension(): number {
    return Object.keys(this.index.vocabulary).length;
  }

  /** 获取文档数 */
  get docCount(): number {
    return this.index.docCount;
  }
}
