export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'tongyi'
  | 'moonshot'
  | 'ollama'
  | 'openai-compatible';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
  apiKey?: string;
  baseUrl?: string;
}

export interface ChatResponse {
  id: string;
  content: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatChunk {
  content: string;
  finishReason?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
}

export abstract class BaseModelAdapter {
  abstract readonly provider: ModelProvider;

  abstract chat(request: ChatRequest): Promise<ChatResponse>;
  abstract chatStream(request: ChatRequest): AsyncGenerator<ChatChunk>;
  abstract listModels(apiKey: string, baseUrl?: string): Promise<ModelInfo[]>;
  abstract validateKey(apiKey: string, baseUrl?: string): Promise<boolean>;
  abstract countTokens(messages: Message[]): number;
}
