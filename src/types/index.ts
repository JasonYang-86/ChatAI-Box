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

export interface Attachment {
  id: string;
  messageId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  extractedText: string | null;
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

export interface ModelParameters {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  content: string;
  variables: string | null;
  isBuiltin: number;
  createdAt: number;
  updatedAt: number;
}

export interface TemplateVariable {
  name: string;
  defaultValue: string;
  type: 'text' | 'select' | 'multiline';
  options?: string[];
  required: boolean;
}

export type Theme = 'light' | 'dark';
