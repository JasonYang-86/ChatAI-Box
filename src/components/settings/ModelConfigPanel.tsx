import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useModelStore } from '@/stores/modelStore';
import type { ModelConfig, ProviderInfo } from '@/types/model';

export function ModelConfigPanel() {
  const { providers, setProviders, setModels, models, addModel, updateModel, removeModel, activeModelId, setActiveModel } = useModelStore();
  const { t } = useTranslation();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ provider: 'openai', modelName: '', apiKey: '', baseUrl: '' });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const plist = await window.electronAPI.invoke('chat:getProviders') as ProviderInfo[];
      setProviders(plist);
      const mlist = await window.electronAPI.invoke('model:list') as ModelConfig[];
      if (Array.isArray(mlist)) { setModels(mlist); if (mlist.length && !activeModelId) setActiveModel(mlist[0].id); }
    } catch {}
  };

  const sel = providers.find((p) => p.id === form.provider);

  const handleAdd = async () => {
    if (!form.modelName.trim()) return;
    const id = crypto.randomUUID();
    const m: ModelConfig = { id, provider: form.provider, modelName: form.modelName.trim(),
      displayName: `${sel?.name || form.provider} - ${form.modelName.trim()}`,
      apiKey: form.apiKey.trim(), baseUrl: form.baseUrl.trim() || sel?.defaultBaseUrl || '', isEnabled: true, createdAt: Date.now() };
    try { await window.electronAPI.invoke('model:create', { provider: m.provider, modelName: m.modelName, displayName: m.displayName, apiKey: m.apiKey, baseUrl: m.baseUrl, isEnabled: 1, sortOrder: 0 }); } catch {}
    addModel(m); setForm({ provider: 'openai', modelName: '', apiKey: '', baseUrl: '' }); setShowAdd(false);
  };

  const startEdit = (m: ModelConfig) => { setEditingId(m.id); setForm({ provider: m.provider, modelName: m.modelName, apiKey: m.apiKey, baseUrl: m.baseUrl }); };

  const saveEdit = async () => {
    if (!editingId || !form.modelName.trim()) return;
    try { await window.electronAPI.invoke('model:update', editingId, { model_name: form.modelName.trim(), display_name: `${sel?.name || form.provider} - ${form.modelName.trim()}`, api_key: form.apiKey.trim(), base_url: form.baseUrl.trim() }); } catch {}
    updateModel(editingId, { provider: form.provider, modelName: form.modelName.trim(), displayName: `${sel?.name || form.provider} - ${form.modelName.trim()}`, apiKey: form.apiKey.trim(), baseUrl: form.baseUrl.trim() });
    setEditingId(null); setForm({ provider: 'openai', modelName: '', apiKey: '', baseUrl: '' });
  };

  const remove = async (id: string) => { try { await window.electronAPI.invoke('model:delete', id); } catch {} removeModel(id); };

  return (
    <div className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t('settings.modelConfig')}</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary text-[13px] py-1.5 px-4 rounded-xl">
          {showAdd ? '取消' : t('settings.addModel')}</button>
      </div>

      {(showAdd || editingId) && (
        <div className="card animate-fade-in-up">
          <div><label className="label">{t('settings.provider')}</label>
            <select className="select-field" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></div>
          {sel?.requiresApiKey !== false && (
            <div className="mt-3"><label className="label">{t('settings.apiKey')}</label>
              <input type="password" className="input-field" value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })} placeholder="sk-..." /></div>
          )}
          <div className="mt-3"><label className="label">{t('settings.apiUrl')}</label>
            <input className="input-field" value={form.baseUrl}
              onChange={(e) => setForm({ ...form, baseUrl: e.target.value })} placeholder={sel?.defaultBaseUrl || ''} /></div>
          <div className="mt-3"><label className="label">{t('settings.modelName')}</label>
            <input className="input-field" value={form.modelName}
              onChange={(e) => setForm({ ...form, modelName: e.target.value })} placeholder={sel?.defaultModels?.join(', ') || ''} /></div>
          <div className="flex gap-2 mt-4">
            <button onClick={editingId ? saveEdit : handleAdd} className="btn-primary text-[13px] py-2 px-5 rounded-xl flex-1">
              {editingId ? '保存' : '添加'}</button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); }} className="btn-secondary text-[13px] py-2 px-5 rounded-xl">取消</button>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {models.map((m) => (
          <div key={m.id}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all text-[13px] group"
            style={activeModelId === m.id
              ? { background: 'var(--accent-soft)', border: '1px solid var(--accent-soft)' }
              : { background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
            onClick={() => setActiveModel(m.id)}>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{m.displayName}</div>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.modelName}</div>
            </div>
            {activeModelId === m.id && <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>当前</span>}
            <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
              <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-muted)' }} onClick={(e) => { e.stopPropagation(); startEdit(m); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 3 22l1.5-4.5L17 3z" /></svg>
              </button>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[rgba(255,64,58,0.1)]"
                onClick={(e) => { e.stopPropagation(); remove(m.id); }} style={{ color: 'var(--danger)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
