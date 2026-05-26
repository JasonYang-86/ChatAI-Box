import { ipcMain } from 'electron';
import {
  createAdapter,
  ModelProvider,
  Message,
  getAllProviders,
} from '../services/model-adapter';

interface ChatStreamRequest {
  provider: ModelProvider;
  model: string;
  messages: Message[];
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  conversationId: string;
  messageId: string;
}

export function registerChatIpc(): void {
  ipcMain.handle('chat:getProviders', () => {
    return getAllProviders().map((p) => ({
      id: p.id,
      name: p.name,
      defaultBaseUrl: p.defaultBaseUrl,
      defaultModels: p.defaultModels,
      requiresApiKey: p.requiresApiKey,
      description: p.description,
    }));
  });

  ipcMain.handle(
    'chat:completions',
    async (event, params: ChatStreamRequest) => {
      const win = event.sender;
      const {
        conversationId,
        messageId,
        provider,
        model,
        messages,
        apiKey,
        baseUrl,
        temperature,
        maxTokens,
      } = params;

      const adapter = createAdapter(provider);
      let fullContent = '';

      try {
        const stream = adapter.chatStream({
          model,
          messages,
          temperature: temperature ?? 0.7,
          maxTokens: maxTokens ?? 4096,
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
        });

        for await (const chunk of stream) {
          fullContent += chunk.content;
          win.send('chat:stream-chunk', {
            conversationId,
            messageId,
            content: chunk.content,
          });

          if (chunk.finishReason) {
            win.send('chat:stream-done', {
              conversationId,
              messageId,
              content: fullContent,
              finishReason: chunk.finishReason,
            });
            return { success: true, content: fullContent };
          }
        }

        win.send('chat:stream-done', {
          conversationId,
          messageId,
          content: fullContent,
          finishReason: 'stop',
        });

        return { success: true, content: fullContent };
      } catch (e) {
        const error = (e as Error).message || String(e);
        win.send('chat:stream-error', {
          conversationId,
          messageId,
          error,
        });
        return { success: false, error };
      }
    },
  );

  ipcMain.handle('chat:stop', () => {
    return true;
  });

  ipcMain.handle(
    'chat:validateKey',
    async (_event, provider: ModelProvider, apiKey: string, baseUrl?: string) => {
      try {
        const adapter = createAdapter(provider);
        const valid = await adapter.validateKey(apiKey, baseUrl);
        return { valid };
      } catch {
        return { valid: false };
      }
    },
  );

  ipcMain.handle(
    'chat:listModels',
    async (_event, provider: ModelProvider, apiKey: string, baseUrl?: string) => {
      try {
        const adapter = createAdapter(provider);
        const models = await adapter.listModels(apiKey, baseUrl);
        return { models };
      } catch (e) {
        return { models: [], error: (e as Error).message };
      }
    },
  );
}
