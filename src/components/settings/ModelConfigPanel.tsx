import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useModelStore } from '@/stores/modelStore';
import type { ModelConfig, ProviderInfo } from '@/types/model';

export function ModelConfigPanel() {
  const { providers, setProviders, setModels, models, addModel, updateModel, removeModel, activeModelId, setActiveModel } = useModelStore();
  const { t } = useTranslation();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [form, setForm] = useState({ provider: 'openai', modelName: '', apiKey: '', baseUrl: '' });

  useEffect(() => { loadProvidersAndModels(); }, []);

  const loadProvidersAndModels = async () => {
    try {
      const providerList = await window.electronAPI.invoke('chat:getProviders') as ProviderInfo[];
      setProviders(providerList);
      const dbModels = await window.electronAPI.invoke('model:list') as ModelConfig[];
      if (Array.isArray(dbModels)) { setModels(dbModels); if (dbModels.length > 0 && !activeModelId) setActiveModel(dbModels[0].id); }
    } catch {}
  };

  const selectedProvider = providers.find((p) => p.id === form.provider);

  const handleAdd = async () => {
    if (!form.modelName.trim()) return;
    const id = crypto.randomUUID(); const now = Date.now();
    const newModel: ModelConfig = { id, provider: form.provider, modelName: form.modelName.trim(), displayName: `${selectedProvider?.name || form.provider} - ${form.modelName.trim()}`, apiKey: form.apiKey.trim(), baseUrl: form.baseUrl.trim() || selectedProvider?.defaultBaseUrl || '', isEnabled: true, createdAt: now };
    try { await window.electronAPI.invoke('model:create', { provider: newModel.provider, modelName: newModel.modelName, displayName: newModel.displayName, apiKey: newModel.apiKey, baseUrl: newModel.baseUrl, isEnabled: 1, sortOrder: 0 }); } catch {}
    addModel(newModel); setForm({ provider: 'openai', modelName: '', apiKey: '', baseUrl: '' }); setShowAdd(false);
  };

  const handleEdit = (model: ModelConfig) => { setEditingId(model.id); setForm({ provider: model.provider, modelName: model.modelName, apiKey: model.apiKey, baseUrl: model.baseUrl }); };

  const handleSaveEdit = async () => {
    if (!editingId || !form.modelName.trim()) return;
    try { await window.electronAPI.invoke('model:update', editingId, { model_name: form.modelName.trim(), display_name: `${selectedProvider?.name || form.provider} - ${form.modelName.trim()}`, api_key: form.apiKey.trim(), base_url: form.baseUrl.trim() }); } catch {}
    updateModel(editingId, { provider: form.provider, modelName: form.modelName.trim(), displayName: `${selectedProvider?.name || form.provider} - ${form.modelName.trim()}`, apiKey: form.apiKey.trim(), baseUrl: form.baseUrl.trim() });
    setEditingId(null); setForm({ provider: 'openai', modelName: '', apiKey: '', baseUrl: '' });
  };

  const handleDelete = async (id: string) => { try { await window.electronAPI.invoke('model:delete', id); } catch {} removeModel(id); };

  const handleTest = async (model: ModelConfig) => {
    setTestingId(model.id);
    try { const result = await window.electronAPI.invoke('chat:validateKey', model.provider, model.apiKey, model.baseUrl) as { valid: boolean }; alert(result.valid ? t('settings.connectSuccess') : t('settings.connectFail')); } catch { alert(t('settings.connectFail')); }
    setTestingId(null);
  };

  const handleFetchModels = async (model: ModelConfig) => {
    setTestingId(model.id);
    try { const result = await window.electronAPI.invoke('chat:listModels', model.provider, model.apiKey, model.baseUrl) as { models: { id: string; name: string }[]; error?: string }; alert(result.error ? result.error : result.models.map((m) => m.id).join('\n')); } catch { alert(t('settings.connectFail')); }
    setTestingId(null);
  };

  const PROVIDER_EMOJI: Record<string, string> = { openai: '🤖', anthropic: '🧠', deepseek: '🔍', tongyi: '☁️', moonshot: '🌙', ollama: '🖥️', 'openai-compatible': '🔌' };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t('settings.modelConfig')}</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary text-xs py-1 px-3">{showAdd ? t('settings.cancel') : t('settings.addModel')}</button>
      </div>
      {(showAdd || editingId) && (
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3 border border-border">
          <div>
            <label className="block text-xs text-text-secondary mb-1">{t('settings.provider')}</label>
            <select className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              {providers.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
            {selectedProvider && <p className="text-xs text-text-secondary mt-1">{selectedProvider.description}</p>}
          </div>
          {selectedProvider?.requiresApiKey !== false && (
            <div>
              <label className="block text-xs text-text-secondary mb-1">{t('settings.apiKey')}</label>
              <input type="password" className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." />
            </div>
          )}
          <div>
            <label className="block text-xs text-text-secondary mb-1">{t('settings.apiUrl')}</label>
            <input type="text" className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" value={form.baseUrl} onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder={selectedProvider?.defaultBaseUrl || ''} />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">{t('settings.modelName')}</label>
            <input type="text" className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} placeholder={selectedProvider?.defaultModels?.join(', ') || ''} />
            {selectedProvider?.defaultModels && selectedProvider.defaultModels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedProvider.defaultModels.map((m) => (
                  <button key={m} className="text-xs px-2 py-0.5 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-border transition-colors" onClick={() => setForm({ ...form, modelName: m })}>{m}</button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={editingId ? handleSaveEdit : handleAdd} className="btn-primary text-xs py-1.5 px-4 flex-1">{editingId ? t('settings.save') : t('settings.add')}</button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="btn-secondary text-xs py-1.5 px-4">{t('settings.cancel')}</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {models.length === 0 && <p className="text-text-secondary text-sm text-center py-4">{t('settings.noModels')}</p>}
        {models.map((model) => (
          <div key={model.id} className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors text-sm ${activeModelId === model.id ? 'bg-accent/10 border border-accent/30' : 'bg-bg-secondary border border-border hover:border-accent/30'}`} onClick={() => setActiveModel(model.id)}>
            <span className="text-base flex-shrink-0">{PROVIDER_EMOJI[model.provider] || ''}</span>
            <div className="flex-1 min-w-0"><div className="text-text-primary text-sm truncate">{model.displayName}</div><div className="text-text-secondary text-[11px]">{model.modelName}</div></div>
            {activeModelId === model.id && <span className="text-xs text-accent font-medium flex-shrink-0">{t('settings.inUse')}</span>}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button className="p-1 rounded hover:bg-bg-tertiary text-text-secondary text-xs" onClick={(e) => { e.stopPropagation(); handleTest(model); }} disabled={testingId === model.id} title={t('settings.testConnection')}>{testingId === model.id ? '...' : '🔗'}</button>
              <button className="p-1 rounded hover:bg-bg-tertiary text-text-secondary text-xs" onClick={(e) => { e.stopPropagation(); handleFetchModels(model); }} disabled={testingId === model.id} title={t('settings.fetchModels')}>📋</button>
              <button className="p-1 rounded hover:bg-bg-tertiary text-text-secondary text-xs" onClick={(e) => { e.stopPropagation(); handleEdit(model); }} title={t('chat.rename')}>✏️</button>
              <button className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-text-secondary hover:text-red-500 text-xs" onClick={(e) => { e.stopPropagation(); handleDelete(model.id); }} title={t('chat.delete')}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
