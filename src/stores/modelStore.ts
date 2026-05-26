import { create } from 'zustand';
import type { ModelConfig, ProviderInfo } from '@/types/model';

interface ModelState {
  providers: ProviderInfo[];
  models: ModelConfig[];
  activeModelId: string | null;
  loading: boolean;

  setProviders: (providers: ProviderInfo[]) => void;
  setModels: (models: ModelConfig[]) => void;
  addModel: (model: ModelConfig) => void;
  updateModel: (id: string, data: Partial<ModelConfig>) => void;
  removeModel: (id: string) => void;
  setActiveModel: (id: string) => void;
  setLoading: (loading: boolean) => void;

  getActiveModel: () => ModelConfig | null;
  getModelsByProvider: (provider: string) => ModelConfig[];
}

export const useModelStore = create<ModelState>((set, get) => ({
  providers: [],
  models: [],
  activeModelId: null,
  loading: false,

  setProviders: (providers) => set({ providers }),

  setModels: (models) => set({ models }),

  addModel: (model) =>
    set((state) => ({ models: [...state.models, model] })),

  updateModel: (id, data) =>
    set((state) => ({
      models: state.models.map((m) => (m.id === id ? { ...m, ...data } : m)),
    })),

  removeModel: (id) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
      activeModelId:
        state.activeModelId === id ? null : state.activeModelId,
    })),

  setActiveModel: (id) => {
    localStorage.setItem('chatai-active-model', id);
    set({ activeModelId: id });
  },

  setLoading: (loading) => set({ loading }),

  getActiveModel: () => {
    const { models, activeModelId } = get();
    return models.find((m) => m.id === activeModelId) || null;
  },

  getModelsByProvider: (provider) => {
    return get().models.filter((m) => m.provider === provider);
  },
}));
