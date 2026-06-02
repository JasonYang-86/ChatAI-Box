import { ipcMain } from 'electron';
import {
  createAdapter,
  ModelProvider,
  Message,
  getAllProviders,
} from '../services/model-adapter';
import { mcpManager } from '../services/mcp/mcp-manager';
import * as fsOps from '../services/file-system';

const FILE_SYSTEM_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'fs_list_directory',
      description: '列出指定目录下的所有文件和文件夹。参数 path 是相对于工作目录的路径，留空表示根目录。',
      parameters: {
        type: 'object' as const,
        properties: { path: { type: 'string', description: '目录路径，相对于工作目录' } },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fs_read_file',
      description: '读取指定文件的内容。参数 path 是相对于工作目录的文件路径。',
      parameters: {
        type: 'object' as const,
        properties: { path: { type: 'string', description: '文件路径，相对于工作目录' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fs_write_file',
      description: '将内容写入指定文件，如果文件不存在则创建。参数 path 是文件路径，content 是写入的内容。',
      parameters: {
        type: 'object' as const,
        properties: {
          path: { type: 'string', description: '文件路径，相对于工作目录' },
          content: { type: 'string', description: '要写入的完整内容' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fs_create_directory',
      description: '创建一个新文件夹。参数 path 是相对于工作目录的文件夹路径。',
      parameters: {
        type: 'object' as const,
        properties: { path: { type: 'string', description: '文件夹路径' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'fs_delete_file_or_dir',
      description: '删除指定文件或文件夹。参数 path 是相对于工作目录的路径。请谨慎使用。',
      parameters: {
        type: 'object' as const,
        properties: { path: { type: 'string', description: '文件/文件夹路径' } },
        required: ['path'],
      },
    },
  },
];

async function executeFileSystemTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'fs_list_directory': {
        const files = fsOps.listDir((args.path as string) || '.');
        return JSON.stringify(files.map(f => ({
          name: f.name, path: f.path, type: f.type, size: f.size
        })), null, 2);
      }
      case 'fs_read_file': {
        const content = fsOps.readFileContent(args.path as string);
        return content.length > 10000 ? content.substring(0, 10000) + '\n...(已截断，文件过大)' : content;
      }
      case 'fs_write_file': {
        fsOps.writeFileContent(args.path as string, args.content as string);
        return `✅ 文件已保存: ${args.path}`;
      }
      case 'fs_create_directory': {
        fsOps.createDir(args.path as string);
        return `✅ 文件夹已创建: ${args.path}`;
      }
      case 'fs_delete_file_or_dir': {
        fsOps.deleteFileOrDir(args.path as string);
        return `✅ 已删除: ${args.path}`;
      }
      default:
        return `未知的文件操作: ${name}`;
    }
  } catch (e: unknown) {
    return `错误: ${(e as Error).message}`;
  }
}

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
      const allTools = [...FILE_SYSTEM_TOOLS, ...mcpTools];
      const hasTools = allTools.length > 0;

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
          hasTools ? allTools : undefined,
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
    tools,
  });

  let hasToolCalls = false;
  const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];

  for await (const chunk of stream) {
    if (chunk.toolCalls && chunk.toolCalls.length > 0) {
      for (const tc of chunk.toolCalls) {
        const existing = toolCalls.find(t => t.id === tc.id);
        if (existing) {
          existing.arguments += tc.arguments;
        } else if (tc.id) {
          toolCalls.push({ id: tc.id, name: tc.name, arguments: tc.arguments });
        }
      }
    }

    if (chunk.content) {
      if (!hasToolCalls) {
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

            const isFileTool = FILE_SYSTEM_TOOLS.some(t => t.function.name === tc.name);

            let result: { content: string } | { content: Array<{ type: string; text: string }> } = { content: '' };

            if (isFileTool) {
              const content = await executeFileSystemTool(tc.name, args);
              result = { content };
            } else {
              result = await mcpManager.executeTool(tc.name, args);
            }

            const resultContent: string = typeof result.content === 'string'
              ? result.content
              : Array.isArray(result.content)
                ? (result.content as Array<{ text: string }>).map((c) => c.text).join('\n')
                : String(result.content);

            win.send('chat:stream-chunk', {
              conversationId,
              messageId,
              content: `\n> **${tc.name}**\n> ${resultContent.slice(0, 500)}${resultContent.length > 500 ? '...' : ''}`,
            });

            messages.push({
              role: 'assistant' as const,
              content: `Tool call: ${tc.name}(${JSON.stringify(args)})`,
            });
            messages.push({
              role: 'user' as const,
              content: `Tool result for ${tc.name}: ${resultContent}`,
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
