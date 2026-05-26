import { BaseModelAdapter, ModelProvider } from './types';
import { OpenAICompatibleAdapter } from './openai-compatible-adapter';
import { AnthropicAdapter } from './anthropic-adapter';
import { OllamaAdapter } from './ollama-adapter';
import { getProviderMeta } from './provider-registry';

const adapters: Map<ModelProvider, BaseModelAdapter> = new Map();

function getOrCreateAdapter(provider: ModelProvider): BaseModelAdapter {
  if (!adapters.has(provider)) {
    const meta = getProviderMeta(provider);

    switch (provider) {
      case 'anthropic':
        adapters.set(provider, new AnthropicAdapter());
        break;

      case 'ollama':
        adapters.set(provider, new OllamaAdapter());
        break;

      case 'openai':
      case 'deepseek':
      case 'tongyi':
      case 'moonshot':
      case 'openai-compatible':
        adapters.set(
          provider,
          new OpenAICompatibleAdapter(
            provider,
            meta.defaultBaseUrl,
            meta.defaultModels,
          ),
        );
        break;

      default:
        throw new Error(`Provider '${provider}' is not yet implemented`);
    }
  }
  return adapters.get(provider)!;
}

export function createAdapter(provider: ModelProvider): BaseModelAdapter {
  return getOrCreateAdapter(provider);
}
