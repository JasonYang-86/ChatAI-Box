export interface Conversation {
  id: string;
  title: string;
  modelId: string;
  systemPrompt: string | null;
  characterId: string | null;
  createdAt: number;
  updatedAt: number;
  isPinned: number;
  isArchived: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokenCount: number | null;
  createdAt: number;
}

export interface Character {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  avatar: string | null;
  isBuiltin: number;
  createdAt: number;
  updatedAt: number;
}

export interface ModelConfig {
  id: string;
  provider: string;
  modelName: string;
  displayName: string;
  apiKey: string;
  baseUrl: string | null;
  parameters: string | null;
  isEnabled: number;
  sortOrder: number;
  createdAt: number;
}

export type Theme = 'light' | 'dark';
