import { useChatStore } from '@/stores/chatStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';

function generateId(): string {
  return crypto.randomUUID();
}

interface StreamChunkEvent {
  conversationId: string;
  messageId: string;
  content: string;
  finishReason?: string;
}

interface StreamErrorEvent {
  conversationId: string;
  messageId: string;
  error: string;
}

export async function sendMessage(
  conversationId: string,
  userContent: string,
  modelConfig: {
    provider: string;
    model: string;
    apiKey: string;
    baseUrl?: string;
  },
) {
  const store = useChatStore.getState();
  const userMsgId = generateId();
  const assistantMsgId = generateId();
  const now = Date.now();

  const userMsg = {
    id: userMsgId,
    conversationId,
    role: 'user' as const,
    content: userContent,
    tokenCount: null,
    createdAt: now,
  };

  const assistantMsg = {
    id: assistantMsgId,
    conversationId,
    role: 'assistant' as const,
    content: '',
    tokenCount: null,
    createdAt: now + 1,
  };

  store.addMessage(userMsg);
  store.addMessage(assistantMsg);
  store.setLoading(true);

  try {
    await window.electronAPI.invoke('message:create', conversationId, 'user', userContent);
  } catch {
    // browser mode
  }

  store.setLoading(false);
  store.startStreaming(assistantMsgId);

  let resolved = false;

  const onResolved = () => {
    resolved = true;
  };

  const cleanup = setupStreamListeners(
    assistantMsgId,
    conversationId,
    () => {
      onResolved();
      try {
        const finalMsg = useChatStore.getState().messages.find((m) => m.id === assistantMsgId);
        if (finalMsg) {
          window.electronAPI.invoke(
            'message:create',
            conversationId,
            'assistant',
            finalMsg.content,
          );
        }
      } catch {
        // browser mode
      }
    },
    () => {
      onResolved();
      store.updateMessageContent(assistantMsgId, '错误：请求失败，请检查 API Key 和网络连接。');
      store.finishStreaming();
    },
  );

  try {
    const messages = useChatStore
      .getState()
      .messages.filter((m) => m.id !== assistantMsgId)
      .map((m) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }));

    const conv = useChatStore.getState().conversations.find(
      (c) => c.id === conversationId,
    );
    const systemPrompt = conv?.systemPrompt || `你是 ChatAI，一个智能 AI 助手。你当前运行的模型是 ${modelConfig.model}（提供商：${modelConfig.provider}）。请始终以 ChatAI 的身份回答用户问题，不要自称 Claude、GPT 或其他任何特定的 AI 模型名称。`;

    let finalSystemPrompt = systemPrompt;

    const { knowledgeEnabled } = useKnowledgeStore.getState();
    if (knowledgeEnabled) {
      try {
        const searchResult = await window.electronAPI.invoke('knowledge:search', {
          query: userContent,
          apiKey: modelConfig.apiKey,
          baseUrl: modelConfig.baseUrl,
          limit: 3,
        }) as { success: boolean; results: { content: string; fileName: string; score: number }[] };

        if (searchResult.success && searchResult.results.length > 0) {
          const knowledgeContext = searchResult.results
            .map((r, i) => `[来源${i + 1}: ${r.fileName}]\n${r.content}`)
            .join('\n\n');
          const kbPrefix = `以下是与用户问题相关的知识库内容，请基于这些内容回答。如果知识库内容不足以回答问题，请据实告知。\n\n${knowledgeContext}\n\n---\n`;
          finalSystemPrompt = kbPrefix + (finalSystemPrompt || '');
        }
      } catch {
        // 检索失败，不回退
      }
    }

    const fullMessages = finalSystemPrompt
      ? [{ role: 'system' as const, content: finalSystemPrompt }, ...messages]
      : messages;

    await window.electronAPI.invoke('chat:completions', {
      provider: modelConfig.provider,
      model: modelConfig.model,
      messages: fullMessages,
      apiKey: modelConfig.apiKey,
      baseUrl: modelConfig.baseUrl,
      conversationId,
      messageId: assistantMsgId,
    });
  } catch (e) {
    if (!resolved) {
      onResolved();
      store.updateMessageContent(
        assistantMsgId,
        `错误：${(e as Error).message || '请求失败'}`,
      );
      store.finishStreaming();
    }
  } finally {
    setTimeout(() => {
      if (!resolved) {
        useChatStore.getState().finishStreaming();
      }
      cleanup();
    }, 300);
  }
}

function setupStreamListeners(
  messageId: string,
  _conversationId: string,
  onDone: () => void,
  onError: () => void,
): () => void {
  const unsubChunk = window.electronAPI.on(
    'chat:stream-chunk',
    (data: unknown) => {
      const event = data as StreamChunkEvent;
      if (event.messageId !== messageId) return;
      useChatStore.getState().appendToStreaming(event.content);
    },
  );

  const unsubDone = window.electronAPI.on(
    'chat:stream-done',
    (data: unknown) => {
      const event = data as StreamChunkEvent;
      if (event.messageId !== messageId) return;
      useChatStore.getState().finishStreaming();
      onDone();
    },
  );

  const unsubError = window.electronAPI.on(
    'chat:stream-error',
    (data: unknown) => {
      const event = data as StreamErrorEvent;
      if (event.messageId !== messageId) return;
      onError();
    },
  );

  return () => {
    unsubChunk();
    unsubDone();
    unsubError();
  };
}
