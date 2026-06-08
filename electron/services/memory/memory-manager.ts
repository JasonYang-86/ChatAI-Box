/**
 * 记忆管理器 — 对话存储、语义检索、上下文构建
 *
 * 对标 Python 版 MemoryManager，纯 TypeScript 实现。
 * 数据存储在本地 JSON 文件中。
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TfidfVectorizer } from './tfidf-vectorizer';
import type {
  MemoryConversation,
  MemoryMessage,
  ConversationSummary,
  SearchResult,
  MemoryData,
  MemoryStats,
} from './types';

export class MemoryManager {
  private storagePath: string;
  private indexPath: string;
  private vectorizer: TfidfVectorizer;
  private data: MemoryData;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.indexPath = storagePath.replace(/\.json$/, '-index.json');
    this.vectorizer = new TfidfVectorizer(this.indexPath);
    this.data = this.load();
  }

  // ==================== 文件 I/O ====================

  private load(): MemoryData {
    try {
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const data = JSON.parse(raw) as MemoryData;
        if (!data.conversations) data.conversations = [];
        return data;
      }
    } catch {
      // 文件损坏，重新开始
      console.warn('[MemoryManager] 记忆文件损坏，将重新创建');
    }
    return { version: '1.0', conversations: [] };
  }

  private save(): void {
    const dir = path.dirname(this.storagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storagePath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  // ==================== CRUD ====================

  /**
   * 添加一条对话到记忆库
   * @returns 记忆条目 ID
   */
  addConversation(
    conversationId: string,
    title: string,
    messages: MemoryMessage[],
    tags: string[] = [],
  ): string {
    const id = crypto.randomUUID();

    const conv: MemoryConversation = {
      id,
      conversationId,
      title: title || this.extractTopic(messages),
      timestamp: Date.now(),
      tags,
      messages,
      embedding: null,
    };

    // 生成嵌入向量
    conv.embedding = this.computeEmbedding(conv);

    this.data.conversations.push(conv);
    this.save();
    return id;
  }

  /**
   * 更新已有对话（或追加新消息）
   */
  updateConversation(id: string, messages: MemoryMessage[], title?: string): boolean {
    const idx = this.data.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return false;

    this.data.conversations[idx].messages = messages;
    if (title) this.data.conversations[idx].title = title;
    this.data.conversations[idx].timestamp = Date.now();
    this.data.conversations[idx].embedding = this.computeEmbedding(this.data.conversations[idx]);

    this.save();
    return true;
  }

  /** 删除对话 */
  deleteConversation(id: string): boolean {
    const before = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    if (this.data.conversations.length < before) {
      this.save();
      return true;
    }
    return false;
  }

  /** 根据记忆 ID 获取对话 */
  getConversation(id: string): MemoryConversation | null {
    return this.data.conversations.find((c) => c.id === id) || null;
  }

  /** 根据 ChatAI 对话 ID 查找记忆 */
  findByConversationId(conversationId: string): MemoryConversation | null {
    return this.data.conversations.find((c) => c.conversationId === conversationId) || null;
  }

  /**
   * 插入或更新记忆（按 conversationId 匹配）
   * @returns 记忆条目 ID
   */
  upsertByConversationId(
    conversationId: string,
    title: string,
    messages: MemoryMessage[],
    tags: string[] = [],
  ): string {
    const existing = this.findByConversationId(conversationId);
    if (existing) {
      this.updateConversation(existing.id, messages, title);
      return existing.id;
    }
    return this.addConversation(conversationId, title, messages, tags);
  }

  /**
   * 列出所有对话摘要（不含完整消息）
   */
  listConversations(limit: number = 50): ConversationSummary[] {
    const sorted = [...this.data.conversations].sort((a, b) => b.timestamp - a.timestamp);
    return sorted.slice(0, limit).map((c) => ({
      id: c.id,
      conversationId: c.conversationId,
      timestamp: c.timestamp,
      topic: c.title,
      tags: c.tags,
      messageCount: c.messages.length,
    }));
  }

  // ==================== 搜索 ====================

  /**
   * 语义搜索历史对话
   */
  search(
    query: string,
    topK: number = 5,
    minScore: number = 0,
    includeMessages: boolean = false,
  ): SearchResult[] {
    if (this.data.conversations.length === 0) return [];

    // 确保所有对话都有嵌入向量
    this.ensureEmbeddings();

    // 重建向量化器索引
    this.rebuildVectorizer();

    const queryVec = this.vectorizer.transform(query);
    if (queryVec.length === 0) return [];

    // 计算余弦相似度
    const scored = this.data.conversations
      .map((conv) => {
        if (!conv.embedding || conv.embedding.length === 0) return { conv, score: 0 };
        const score = this.cosineSimilarity(queryVec, conv.embedding);
        return { conv, score };
      })
      .filter((r) => r.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored.map((r) => ({
      id: r.conv.id,
      conversationId: r.conv.conversationId,
      timestamp: r.conv.timestamp,
      topic: r.conv.title,
      tags: r.conv.tags,
      score: Math.round(r.score * 10000) / 10000,
      messages: includeMessages ? r.conv.messages : undefined,
    }));
  }

  // ==================== 上下文构建 ====================

  /**
   * 为当前对话构建历史记忆上下文
   * 返回可直接注入 LLM system prompt 的文本
   */
  buildContext(
    query: string,
    topK: number = 5,
    minScore: number = 0.2,
    maxContextChars: number = 8000,
  ): string {
    const results = this.search(query, topK, minScore, true);
    if (results.length === 0) return '';

    const lines = ['## 历史相关对话记录'];
    let totalChars = lines[0].length;

    for (const r of results) {
      const block = this.formatContextBlock(r);
      if (totalChars + block.length > maxContextChars) {
        // 尝试截断版本
        const truncated = this.formatContextBlock(r, 2);
        if (totalChars + truncated.length <= maxContextChars) {
          lines.push(truncated);
        }
        break;
      }
      lines.push(block);
      totalChars += block.length;
    }

    return lines.join('\n');
  }

  /**
   * 格式化单条对话为上下文字符串
   */
  private formatContextBlock(result: SearchResult, maxMessages?: number): string {
    const date = new Date(result.timestamp).toISOString().slice(0, 19).replace('T', ' ');
    const scorePercent = Math.round(result.score * 100);
    const lines: string[] = [
      `### [相关度 ${scorePercent}%] ${result.topic}`,
      `时间: ${date}`,
      '---',
    ];

    let messages = result.messages || [];
    if (maxMessages) messages = messages.slice(0, maxMessages);

    for (const msg of messages) {
      const roleLabel = msg.role === 'user' ? '用户' : '助手';
      let content = msg.content;
      if (content.length > 500) content = content.slice(0, 500) + '...';
      lines.push(`**${roleLabel}**: ${content}`);
    }

    lines.push('');
    return lines.join('\n');
  }

  // ==================== 辅助方法 ====================

  /** 统计信息 */
  getStats(): MemoryStats {
    const totalMessages = this.data.conversations.reduce(
      (sum, c) => sum + c.messages.length,
      0,
    );
    return {
      totalConversations: this.data.conversations.length,
      totalMessages,
      lastUpdated: this.data.conversations.length > 0
        ? Math.max(...this.data.conversations.map((c) => c.timestamp))
        : 0,
    };
  }

  /** 重建所有嵌入向量（切换模型或修复数据时使用） */
  rebuildEmbeddings(): void {
    for (const conv of this.data.conversations) {
      conv.embedding = this.computeEmbedding(conv);
    }
    this.save();
    this.rebuildVectorizer();
  }

  /** 清空全部记忆 */
  clearAll(): void {
    this.data.conversations = [];
    this.save();
  }

  // ==================== 内部方法 ====================

  /** 为对话计算嵌入向量 */
  private computeEmbedding(conv: MemoryConversation): number[] {
    // 使用标题 + 首条用户消息的前500字符作为源文本
    let text = conv.title;
    const firstUserMsg = conv.messages.find((m) => m.role === 'user');
    if (firstUserMsg) {
      text += ' ' + firstUserMsg.content.slice(0, 500);
    }
    return this.vectorizer.transform(text);
  }

  /** 确保所有对话都有嵌入向量 */
  private ensureEmbeddings(): void {
    let needsSave = false;
    for (const conv of this.data.conversations) {
      if (!conv.embedding || conv.embedding.length === 0) {
        conv.embedding = this.computeEmbedding(conv);
        needsSave = true;
      }
    }
    if (needsSave) this.save();
  }

  /** 用所有对话重新拟合 TF-IDF 向量化器 */
  private rebuildVectorizer(): void {
    const documents = this.data.conversations.map((c) => {
      let text = c.title;
      const firstUserMsg = c.messages.find((m) => m.role === 'user');
      if (firstUserMsg) text += ' ' + firstUserMsg.content.slice(0, 500);
      return text;
    });
    if (documents.length > 0) {
      this.vectorizer.fitTransform(documents);
      // 用新拟合的向量化器重新计算嵌入
      for (let i = 0; i < this.data.conversations.length; i++) {
        this.data.conversations[i].embedding = this.vectorizer.transform(documents[i]);
      }
    }
  }

  /** 从消息中提取主题 */
  private extractTopic(messages: MemoryMessage[]): string {
    const firstUserMsg = messages.find((m) => m.role === 'user');
    if (!firstUserMsg) return '未命名对话';
    const content = firstUserMsg.content.trim();
    return content.length > 80 ? content.slice(0, 80) + '...' : content;
  }

  /** 余弦相似度 */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0;
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
