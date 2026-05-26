import { BaseModelAdapter, ChatRequest, ChatResponse, ChatChunk, Message, ModelInfo } from './types';

export class OllamaAdapter extends BaseModelAdapter {
  readonly provider = 'ollama' as const;

  private getBaseUrl(baseUrl?: string): string {
    return (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const baseUrl = this.getBaseUrl(request.baseUrl);
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 4096,
          top_p: request.topP ?? 1,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${err}`);
    }

    const data = await response.json();
    return {
      id: data.created_at || '',
      content: data.message?.content || '',
      finishReason: data.done_reason || 'stop',
      usage: data.eval_count
        ? {
            promptTokens: data.prompt_eval_count || 0,
            completionTokens: data.eval_count || 0,
            totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
          }
        : undefined,
    };
  }

  async *chatStream(request: ChatRequest): AsyncGenerator<ChatChunk> {
    const baseUrl = this.getBaseUrl(request.baseUrl);
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        options: {
          temperature: request.temperature ?? 0.7,
          num_predict: request.maxTokens ?? 4096,
          top_p: request.topP ?? 1,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${err}`);
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
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.message?.content) {
              yield {
                content: parsed.message.content,
                finishReason: parsed.done ? 'stop' : undefined,
              };
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

  async listModels(_apiKey: string, baseUrl?: string): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.getBaseUrl(baseUrl)}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        return (data.models || []).map((m: Record<string, unknown>) => ({
          id: m.name as string,
          name: m.name as string,
        }));
      }
    } catch {
      throw new Error('无法连接到 Ollama 服务，请确保 Ollama 已启动');
    }
    return [];
  }

  async validateKey(_apiKey: string, baseUrl?: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.getBaseUrl(baseUrl)}/api/tags`);
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
    return Math.ceil(total / 2);
  }
}
