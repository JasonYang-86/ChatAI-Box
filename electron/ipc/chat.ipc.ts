import { ipcMain } from 'electron';
import {
  createAdapter,
  ModelProvider,
  Message,
  getAllProviders,
} from '../services/model-adapter';
import { mcpManager } from '../services/mcp/mcp-manager';

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

      const mcpTools = mcpManager.getToolsForProvider();
      const hasTools = mcpTools.length > 0;

      try {
        const fullContent = await streamAndCollect(
          win,
          conversationId,
          messageId,
          provider,
          model,
          messages,
          apiKey,
          baseUrl,
          temperature,
          maxTokens,
          hasTools ? mcpTools : undefined,
        );
        return { success: true, content: fullContent };
      } catch (e) {
        const error = (e as Error).message || String(e);
        win.send('chat:stream-error', { conversationId, messageId, error });
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

  ipcMain.handle('mcp:hasTools', () => {
    return mcpManager.getServerIds().length > 0;
  });
}

async function streamAndCollect(
  win: Electron.WebContents,
  conversationId: string,
  messageId: string,
  provider: ModelProvider,
  model: string,
  messages: Message[],
  apiKey?: string,
  baseUrl?: string,
  temperature?: number,
  maxTokens?: number,
  tools?: Array<{ type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }>,
): Promise<string> {
  const adapter = createAdapter(provider);
  let fullContent = '';

  const stream = adapter.chatStream({
    model,
    messages,
    temperature: temperature ?? 0.7,
    maxTokens: maxTokens ?? 4096,
    apiKey: apiKey || undefined,
    baseUrl: baseUrl || undefined,
  });

  let hasToolCalls = false;
  const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];
  let currentToolCall: { id: string; name: string; arguments: string } | null = null;

  for await (const chunk of stream) {
    if (chunk.finishReason === 'tool_calls' || chunk.content) {
      if (!hasToolCalls && chunk.content) {
        fullContent += chunk.content;
        win.send('chat:stream-chunk', { conversationId, messageId, content: chunk.content });
      }
    }

    if (chunk.finishReason) {
      if (chunk.finishReason === 'tool_calls' && tools) {
        hasToolCalls = true;

        win.send('chat:stream-chunk', {
          conversationId,
          messageId,
          content: '\n\n🔧 *正在调用工具...*',
        });

        for (const tc of toolCalls) {
          try {
            const args = JSON.parse(tc.arguments || '{}');
            const result = await mcpManager.executeTool(tc.name, args);

            win.send('chat:stream-chunk', {
              conversationId,
              messageId,
              content: `\n> **${tc.name}**(${JSON.stringify(args)})\n> ${result.content.slice(0, 500)}${result.content.length > 500 ? '...' : ''}`,
            });

            messages.push({
              role: 'assistant' as const,
              content: `Tool call: ${tc.name}(${JSON.stringify(args)})`,
            });
            messages.push({
              role: 'user' as const,
              content: `Tool result for ${tc.name}: ${result.content}`,
            });
          } catch (e) {
            win.send('chat:stream-chunk', {
              conversationId,
              messageId,
              content: `\n❌ ${tc.name}: ${(e as Error).message}`,
            });
          }
        }

        fullContent += '\n\n';
        const followUpContent = await streamAndCollect(
          win,
          conversationId,
          messageId,
          provider,
          model,
          messages,
          apiKey,
          baseUrl,
          temperature,
          maxTokens,
        );
        fullContent += followUpContent;

        win.send('chat:stream-done', { conversationId, messageId, content: fullContent, finishReason: 'stop' });
        return fullContent;
      }

      win.send('chat:stream-done', {
        conversationId,
        messageId,
        content: fullContent,
        finishReason: chunk.finishReason,
      });
      return fullContent;
    }
  }

  win.send('chat:stream-done', { conversationId, messageId, content: fullContent, finishReason: 'stop' });
  return fullContent;
}
