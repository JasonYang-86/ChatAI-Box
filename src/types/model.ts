export interface ProviderInfo {
  id: string;
  name: string;
  defaultBaseUrl: string;
  defaultModels: string[];
  requiresApiKey: boolean;
  description: string;
}

export interface ModelConfig {
  id: string;
  provider: string;
  modelName: string;
  displayName: string;
  apiKey: string;
  baseUrl: string;
  isEnabled: boolean;
  createdAt: number;
}
