import type { ModelProvider } from './types';

export interface ProviderMeta {
  id: ModelProvider;
  name: string;
  defaultBaseUrl: string;
  defaultModels: string[];
  requiresApiKey: boolean;
  description: string;
  website: string;
}

export const PROVIDER_REGISTRY: Record<ModelProvider, ProviderMeta> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    requiresApiKey: true,
    description: 'OpenAI 官方 API，GPT-4o 系列模型',
    website: 'https://platform.openai.com',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModels: [
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    requiresApiKey: true,
    description: 'Anthropic Claude 系列，长上下文优势',
    website: 'https://console.anthropic.com',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModels: ['deepseek-chat', 'deepseek-reasoner'],
    requiresApiKey: true,
    description: '深度求索，高性价比国产大模型',
    website: 'https://platform.deepseek.com',
  },
  tongyi: {
    id: 'tongyi',
    name: '通义千问',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModels: [
      'qwen-turbo',
      'qwen-plus',
      'qwen-max',
      'qwen-max-longcontext',
    ],
    requiresApiKey: true,
    description: '阿里通义千问系列模型',
    website: 'https://dashscope.console.aliyun.com',
  },
  moonshot: {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    defaultModels: [
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ],
    requiresApiKey: true,
    description: '月之暗面 Kimi 系列，超长上下文',
    website: 'https://platform.moonshot.cn',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama (本地)',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModels: [],
    requiresApiKey: false,
    description: '本地运行的开源模型，数据不出电脑',
    website: 'https://ollama.com',
  },
  'openai-compatible': {
    id: 'openai-compatible',
    name: 'OpenAI 兼容接口',
    defaultBaseUrl: 'http://localhost:8080/v1',
    defaultModels: [],
    requiresApiKey: false,
    description: '任何兼容 OpenAI API 协议的服务',
    website: '',
  },
};

export function getProviderMeta(provider: ModelProvider): ProviderMeta {
  return PROVIDER_REGISTRY[provider];
}

export function getAllProviders(): ProviderMeta[] {
  return Object.values(PROVIDER_REGISTRY);
}
