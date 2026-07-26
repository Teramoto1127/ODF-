import { useState } from 'react';
import type { SetEntry, TrainingSession } from '../../lib/type';

interface SessionEditFormProps {
  session: TrainingSession;
  onSave: (patch: { date: string; sets: SetEntry[]; note?: string }) => Promise<void>;
  onCancel: () => void;
}

export function SessionEditForm({ session, onSave, onCancel }: SessionEditFormProps) {
  const [date, setDate] = useState(session.date);
  const [sets, setSets] = useState<SetEntry[]>(session.sets.map((s) => ({ ...s })));
  const [note, setNote] = useState(session.note ?? '');
  const [isSaving, setIsSaving] = useState(false);

  function updateSet(index: number, patch: Partial<SetEntry>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSetRow() {
    setSets((prev) => [...prev, { weight: 0, reps: 0 }]);
  }

  function removeSetRow(index: number) {
    setSets((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSave() {
    const validSets = sets.filter((s) => s.weight > 0 && s.reps > 0);
    if (validSets.length === 0) return;
    setIsSaving(true);
    try {
      await onSave({ date, sets: validSets, note: note.trim() || undefined });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="tl-session-edit">
      <div className="tl-field">
        <label className="tl-label">日付</label>
        <input
          className="tl-input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="tl-set-rows">
        {sets.map((set, i) => (
          <div className="tl-set-row" key={i}>
            <span className="tl-set-index">{i + 1}</span>
            <input
              className="tl-input tl-input--num"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.5}
              value={set.weight || ''}
              onChange={(e) => updateSet(i, { weight: Number(e.target.value) })}
            />
            <span className="tl-set-unit">kg</span>
            <span className="tl-set-sep">×</span>
            <input
              className="tl-input tl-input--num"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={set.reps || ''}
              onChange={(e) => updateSet(i, { reps: Number(e.target.value) })}
            />
            <span className="tl-set-unit">回</span>
            <button
              type="button"
              className="tl-set-remove"
              aria-label="このセットを削除"
              onClick={() => removeSetRow(i)}
              disabled={sets.length === 1}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="tl-btn tl-btn--ghost tl-btn--full" onClick={addSetRow}>
        + セットを追加
      </button>

      <div className="tl-field">
        <label className="tl-label">メモ</label>
        <input
          className="tl-input"
          type="text"
          placeholder="任意"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="tl-session-edit-actions">
        <button
          type="button"
          className="tl-btn tl-btn--accent"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? '保存中…' : '保存'}
        </button>
        <button type="button" className="tl-btn tl-btn--ghost" onClick={onCancel} disabled={isSaving}>
          キャンセル
        </button>
      </div>
    </div>
  );
}