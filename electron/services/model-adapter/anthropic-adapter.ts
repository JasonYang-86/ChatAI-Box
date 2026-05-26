import { BaseModelAdapter, ChatRequest, ChatResponse, ChatChunk, Message, ModelInfo } from './types';

const ANTHROPIC_DEFAULT_MODELS = [
  'claude-3-5-sonnet-20240620',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

export class AnthropicAdapter extends BaseModelAdapter {
  readonly provider = 'anthropic' as const;

  private getBaseUrl(baseUrl?: string): string {
    return (baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = request.apiKey;
    if (!apiKey) throw new Error('API Key is required');

    const systemMsg = request.messages.find((m) => m.role === 'system');
    const chatMessages = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${this.getBaseUrl(request.baseUrl)}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        messages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        system: systemMsg?.content || undefined,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return {
      id: data.id,
      content,
      finishReason: data.stop_reason || 'stop',
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens || 0,
            completionTokens: data.usage.output_tokens || 0,
            totalTokens:
              (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
          }
        : undefined,
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const apiKey = request.apiKey;
    if (!apiKey) throw new Error('API Key is required');

    const systemMsg = request.messages.find((m) => m.role === 'system');
    const chatMessages = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${this.getBaseUrl(request.baseUrl)}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        messages: chatMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        system: systemMsg?.content || undefined,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP ?? 1,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${err}`);
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
          if (!trimmed) continue;
          if (!trimmed.startsWith('data: ')) continue;
          const jsonStr = trimmed.slice(6);

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'content_block_delta') {
              const text = parsed.delta?.text;
              if (text) {
                yield { content: text };
              }
            } else if (parsed.type === 'message_stop') {
              return;
            }
          } catch {
            // skip
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async listModels(_apiKey: string, _baseUrl?: string): Promise<ModelInfo[]> {
    return ANTHROPIC_DEFAULT_MODELS.map((id) => ({ id, name: id }));
  }

  async validateKey(apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.getBaseUrl(baseUrl)}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1,
            messages: [{ role: 'user', content: 'hi' }],
          }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  countTokens(messages: Message[]): number {
    let total = 0;
    for (const msg of messages) {
      total += msg.content.length;
    }
    return Math.ceil(total / 3.5);
  }
}
