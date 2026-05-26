import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  messages: { role: string; content: string; createdAt?: number }[];
  title: string;
}

export function ExportDialog({ isOpen, onClose, messages, title }: ExportDialogProps) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);

  if (!isOpen) return null;

  const handleExportMD = async () => {
    setExporting(true);
    const lines = [`# ${title}`, '', `> 导出时间: ${new Date().toLocaleString()}`, ''];

    for (const msg of messages) {
      const role = msg.role === 'user' ? '🧑 用户' : msg.role === 'assistant' ? '🤖 AI' : '⚙️ 系统';
      lines.push(`### ${role}`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
    }

    const content = lines.join('\n');
    await downloadFile(content, `${title}.md`, 'text/markdown');
    setExporting(false);
    onClose();
  };

  const handleExportJSON = async () => {
    setExporting(true);
    const data = {
      title,
      exportedAt: new Date().toISOString(),
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : null,
      })),
    };
    await downloadFile(JSON.stringify(data, null, 2), `${title}.json`, 'application/json');
    setExporting(false);
    onClose();
  };

  const downloadFile = async (content: string, fileName: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-bg-primary rounded-2xl shadow-2xl p-6 w-[360px] animate-fade-in">
        <h2 className="text-lg font-semibold text-text-primary mb-4">{t('export.title')}</h2>
        <div className="space-y-2">
          <button
            onClick={handleExportMD}
            disabled={exporting}
            className="btn-secondary w-full justify-start text-sm"
          >
            📝 {t('export.markdown')}
          </button>
          <button
            onClick={handleExportJSON}
            disabled={exporting}
            className="btn-secondary w-full justify-start text-sm"
          >
            📋 {t('export.json')}
          </button>
          <button onClick={onClose} className="btn-ghost w-full justify-center text-sm mt-2">
            {t('settings.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
