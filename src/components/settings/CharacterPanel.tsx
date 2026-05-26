import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Character } from '@/types';

export function CharacterPanel() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', systemPrompt: '', avatar: '🤖' });
  const { t } = useTranslation();

  useEffect(() => { loadCharacters(); }, []);

  const loadCharacters = async () => {
    try { const list = await window.electronAPI.invoke('character:list') as Character[]; setCharacters(list); } catch {}
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) return;
    try { const created = await window.electronAPI.invoke('character:create', { name: form.name.trim(), description: form.description.trim(), systemPrompt: form.systemPrompt.trim(), avatar: form.avatar }) as Character; setCharacters([...characters, created]); setForm({ name: '', description: '', systemPrompt: '', avatar: '🤖' }); setShowAdd(false); } catch {}
  };

  const handleDelete = async (id: string) => { try { await window.electronAPI.invoke('character:delete', id); } catch {} setCharacters(characters.filter((c) => c.id !== id)); };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{t('settings.characters')}</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-secondary text-xs py-1 px-3">{showAdd ? t('settings.cancel') : '+ ' + t('character.create')}</button>
      </div>
      {showAdd && (
        <div className="bg-bg-secondary rounded-xl p-4 space-y-3 border border-border">
          <div className="flex items-center gap-2"><span className="text-2xl">{form.avatar}</span><input className="flex-1 bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('character.name')} /></div>
          <textarea className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('character.description')} />
          <textarea className="w-full bg-bg-primary border border-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent resize-none font-mono" rows={5} value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} placeholder={t('character.systemPrompt')} />
          <button onClick={handleAdd} className="btn-primary text-xs py-1.5 px-4 w-full">{t('character.createPrompt')}</button>
        </div>
      )}
      <div className="space-y-2">
        {characters.length === 0 && <p className="text-text-secondary text-sm text-center py-4">{t('character.noCharacters')}</p>}
        {characters.map((char) => (
          <div key={char.id} className="bg-bg-secondary rounded-xl p-3 border border-border space-y-1">
            <div className="flex items-center gap-2"><span className="text-xl">{char.avatar || '🤖'}</span><div className="flex-1 min-w-0"><div className="text-sm font-medium text-text-primary">{char.name}</div><div className="text-xs text-text-secondary truncate">{char.description || char.systemPrompt.slice(0, 40)}</div></div>{!char.isBuiltin && <button onClick={() => handleDelete(char.id)} className="text-xs text-red-500 hover:underline flex-shrink-0">{t('chat.delete')}</button>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
