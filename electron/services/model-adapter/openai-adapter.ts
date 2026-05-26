import { BaseModelAdapter, ChatRequest, ChatResponse, ChatChunk, Message, ModelInfo } from './types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIAdapter extends BaseModelAdapter {
  readonly provider = 'openai' as const;

  private getBaseUrl(baseUrl?: string): string {
    return (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = request.apiKey;
    const baseUrl = request.baseUrl;
    if (!apiKey) throw new Error('API Key is required');
    const response = await fetch(`${this.getBaseUrl(baseUrl)}/chat/completions`, {
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
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      id: data.id,
      content: choice.message.content,
      finishReason: choice.finish_reason,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const apiKey = request.apiKey;
    const baseUrl = request.baseUrl;
    if (!apiKey) throw new Error('API Key is required');
    const response = await fetch(`${this.getBaseUrl(baseUrl)}/chat/completions`, {
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
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${err}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);

          if (jsonStr === '[DONE]') return;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              yield {
                content: delta.content,
                finishReason: parsed.choices[0].finish_reason || undefined,
              };
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(apiKey: string, baseUrl?: string): Promise<ModelInfo[]> {
    const response = await fetch(`${this.getBaseUrl(baseUrl)}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || [])
      .filter((m: Record<string, unknown>) => (m.id as string)?.startsWith('gpt'))
      .map((m: Record<string, unknown>) => ({
        id: m.id as string,
        name: m.id as string,
      }))
      .sort((a: ModelInfo, b: ModelInfo) => a.id.localeCompare(b.id));
  }

  async validateKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const models = await this.listModels(apiKey, baseUrl);
      return models.length > 0;
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
