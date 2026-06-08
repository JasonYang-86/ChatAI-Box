/**
 * 记忆系统类型定义
 */

export interface MemoryConversation {
  id: string;
  conversationId: string;
  title: string;
  timestamp: number;
  tags: string[];
  messages: MemoryMessage[];
  /** TF-IDF 向量（Float32Array 序列化为 number[]） */
  embedding: number[] | null;
}

export interface MemoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  timestamp: number;
  topic: string;
  tags: string[];
  messageCount: number;
}

export interface SearchResult {
  id: string;
  conversationId: string;
  timestamp: number;
  topic: string;
  tags: string[];
  score: number;
  /** 仅当 includeMessages=true 时返回 */
  messages?: MemoryMessage[];
}

export interface MemoryData {
  version: string;
  conversations: MemoryConversation[];
}

export interface MemoryStats {
  totalConversations: number;
  totalMessages: number;
  lastUpdated: number;
}
