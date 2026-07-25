// src/components/training/BackupPanel.tsx
import { useRef, useState } from 'react';

interface BackupPanelProps {
  exportData: () => string;
  importData: (jsonText: string, mode: 'replace' | 'merge') => { ok: true } | { ok: false; error: string };
}

function todayForFilename(): string {
  return new Date().toISOString().slice(0, 10);
}

export function BackupPanel({ exportData, importData }: BackupPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuka-log-backup-${todayForFilename()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const confirmed = window.confirm(
        '既存の記録はすべて上書きされます。バックアップから復元しますか？',
      );
      if (!confirmed) {
        e.target.value = '';
        return;
      }
      const result = importData(text, 'replace');
      if (result.ok) {
        setMessage({ type: 'success', text: '復元しました。' });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
      e.target.value = '';
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'ファイルの読み込みに失敗しました。' });
    };
    reader.readAsText(file);
  }

  return (
    <div className="tl-card tl-backup">
      <div className="tl-card-heading">
        <span className="tl-eyebrow">バックアップ</span>
        <h2 className="tl-h2">データの書き出し・復元</h2>
      </div>
      <div className="tl-backup-actions">
        <button type="button" className="tl-btn tl-btn--ghost" onClick={handleExport}>
          JSONで書き出す
        </button>
        <button type="button" className="tl-btn tl-btn--ghost" onClick={handleImportClick}>
          バックアップから復元
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      {message && (
        <p className={`tl-backup-message tl-backup-message--${message.type}`}>{message.text}</p>
      )}
    </div>
  );
}