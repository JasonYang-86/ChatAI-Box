import { useFileStore } from '@/stores/fileStore';

export function ChangeTracker() {
  const { changes } = useFileStore();

  if (changes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
        暂无文件变更记录
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-2 text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
        变更记录 ({changes.length})
      </div>
      {[...changes].reverse().map((change, i) => {
        const name = change.filePath.split(/[/\\]/).pop() || change.filePath;
        const time = new Date(change.timestamp).toLocaleTimeString();
        return (
          <div key={changes.length - 1 - i} className="px-3 py-2 text-[12px] border-b" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <span className="truncate font-medium" style={{ color: 'var(--text-primary)' }}>{name}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>{time}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)' }}>{change.description}</p>
            <div className="mt-0.5">
              {change.previousContent === null ? (
                <span className="text-[11px] px-1 py-0.5 rounded" style={{ background: 'rgba(52,199,89,0.12)', color: 'var(--success)' }}>新建</span>
              ) : (
                <div className="text-[11px] font-mono overflow-hidden whitespace-pre border-l-2 pl-2"
                  style={{ borderColor: 'var(--accent)', color: 'var(--text-secondary)' }}>
                  <div className="line-through opacity-60" style={{ color: 'var(--danger)' }}>
                    {change.previousContent.substring(0, 200)}
                  </div>
                  <div style={{ color: 'var(--success)' }}>
                    {change.newContent.substring(0, 200)}
                  </div>
                  {(change.previousContent.length > 200 || change.newContent.length > 200) && (
                    <span style={{ color: 'var(--text-tertiary)' }}>...</span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
