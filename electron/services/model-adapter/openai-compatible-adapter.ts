import { BaseModelAdapter, ChatRequest, ChatResponse, ChatChunk, Message, ModelInfo, ModelProvider } from './types';

export class OpenAICompatibleAdapter extends BaseModelAdapter {
  readonly provider: ModelProvider;
  private defaultBaseUrl: string;
  private defaultModels: string[];

  constructor(
    provider: ModelProvider,
    defaultBaseUrl: string,
    defaultModels: string[] = [],
  ) {
    super();
    this.provider = provider;
    this.defaultBaseUrl = defaultBaseUrl.replace(/\/+$/, '');
    this.defaultModels = defaultModels;
  }

  private getBaseUrl(baseUrl?: string): string {
    return (baseUrl || this.defaultBaseUrl).replace(/\/+$/, '');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = request.apiKey;
    if (!apiKey) throw new Error('API Key is required');
    const response = await fetch(
      `${this.getBaseUrl(request.baseUrl)}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
          top_p: request.topP ?? 1,
          stream: false,
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${this.provider} API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error(`${this.provider}: No choices in response`);
    }

    return {
      id: data.id || '',
      content: choice.message?.content || choice.delta?.content || '',
      finishReason: choice.finish_reason || 'stop',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const apiKey = request.apiKey;
    if (!apiKey) throw new Error('API Key is required');
    const response = await fetch(
      `${this.getBaseUrl(request.baseUrl)}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          temperature: request.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? 4096,
          top_p: request.topP ?? 1,
          stream: true,
          ...(request.tools?.length ? { tools: request.tools } : {}),
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`${this.provider} API error ${response.status}: ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    const toolCallAccumulator: Record<number, { id: string; name: string; arguments: string }> = {};

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data: ')) {
            const jsonStr = trimmed.slice(6);
            if (jsonStr === '[DONE]') {
              const toolCalls = Object.values(toolCallAccumulator);
              if (toolCalls.length > 0) {
                yield { content: '', finishReason: 'tool_calls', toolCalls };
              }
              return;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const choice = parsed.choices?.[0];
              const delta = choice?.delta;
              const finishReason = choice?.finish_reason;

              if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallAccumulator[idx]) {
                    toolCallAccumulator[idx] = { id: '', name: '', arguments: '' };
                  }
                  const acc = toolCallAccumulator[idx];
                  if (tc.id) acc.id = tc.id;
                  if (tc.function?.name) acc.name += tc.function.name;
                  if (tc.function?.arguments) acc.arguments += tc.function.arguments;
                }
              }

              if (delta?.content) {
                yield { content: delta.content, finishReason: undefined };
              }

              if (finishReason) {
                if (finishReason === 'tool_calls') {
                  const toolCalls = Object.values(toolCallAccumulator);
                  yield { content: '', finishReason: 'tool_calls', toolCalls };
                } else {
                  yield { content: '', finishReason };
                }
              }
            } catch {
              // skip unparseable lines
            }
          } else {
            try {
              const parsed = JSON.parse(trimmed);
              const choice = parsed.choices?.[0];
              const delta = choice?.delta;
              if (delta?.content) {
                yield {
                  content: delta.content,
                  finishReason: choice.finish_reason || undefined,
                };
              }
            } catch {
              // not JSON
            }
          }
        }
      }

      const toolCalls = Object.values(toolCallAccumulator);
      if (toolCalls.length > 0) {
        yield { content: '', finishReason: 'tool_calls', toolCalls };
      }
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(apiKey: string, baseUrl?: string): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.getBaseUrl(baseUrl)}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        const models = (data.data || [])
          .map((m: Record<string, unknown>) => ({
            id: m.id as string,
            name: m.id as string,
          }));
        if (models.length > 0) return models;
      }
    } catch {
      // list models not supported, return defaults
    }

    if (this.defaultModels.length > 0) {
      return this.defaultModels.map((id) => ({ id, name: id }));
    }

    return [];
  }

  async validateKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl(baseUrl)}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  countTokens(messages: Message[]): number {
    let total = 0;
    for (const msg of messages) {
      total += 4;
      total += msg.role.length;
      total += msg.content.length;
    }
    total += 2;
    return Math.ceil(total / 3.5);
  }
}
