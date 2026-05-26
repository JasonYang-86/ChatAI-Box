import { create } from 'zustand';
import type { Conversation, Message } from '@/types';

interface ChatState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  streamingMessageId: string | null;
  isStreaming: boolean;
  isLoading: boolean;
  shouldStop: boolean;

  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (id: string) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, data: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;

  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessageContent: (id: string, content: string) => void;
  removeMessage: (id: string) => void;

  startStreaming: (messageId: string) => void;
  appendToStreaming: (content: string) => void;
  finishStreaming: () => void;
  stopStreaming: () => void;
  requestStop: () => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  streamingMessageId: null,
  isStreaming: false,
  isLoading: false,
  shouldStop: false,

  setConversations: (conversations) => set({ conversations }),

  setCurrentConversation: (id) => set({ currentConversationId: id }),

  addConversation: (conversation) =>
    set((state) => ({ conversations: [conversation, ...state.conversations] })),

  updateConversation: (id, data) =>
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, ...data } : c)),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      currentConversationId: state.currentConversationId === id ? null : state.currentConversationId,
      messages: state.currentConversationId === id ? [] : state.messages,
    })),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  updateMessageContent: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),

  removeMessage: (id) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    })),

  startStreaming: (messageId) =>
    set({ streamingMessageId: messageId, isStreaming: true, isLoading: false, shouldStop: false }),

  appendToStreaming: (content) =>
    set((state) => {
      if (!state.streamingMessageId) return state;
      return {
        messages: state.messages.map((m) =>
          m.id === state.streamingMessageId ? { ...m, content: m.content + content } : m,
        ),
      };
    }),

  finishStreaming: () =>
    set({ streamingMessageId: null, isStreaming: false, isLoading: false }),

  stopStreaming: () =>
    set({ streamingMessageId: null, isStreaming: false, isLoading: false }),

  requestStop: () => set({ shouldStop: true }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
