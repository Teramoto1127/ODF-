import { useState } from 'react';
import type { FormEvent } from 'react';
import type { SetEntry, TrainingSession } from '../../lib/type';

interface SessionFormProps {
  exerciseId: string;
  exerciseName: string;
  onSubmit: (session: Omit<TrainingSession, 'id'>) => void;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptySet(): SetEntry {
  return { weight: 0, reps: 0 };
}

export function SessionForm({ exerciseId, exerciseName, onSubmit }: SessionFormProps) {
  const [date, setDate] = useState(today());
  const [sets, setSets] = useState<SetEntry[]>([emptySet()]);

  function updateSet(index: number, patch: Partial<SetEntry>) {
    setSets((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addSetRow() {
    setSets((prev) => [...prev, emptySet()]);
  }

  function removeSetRow(index: number) {
    setSets((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validSets = sets.filter((s) => s.weight > 0 && s.reps > 0);
    if (validSets.length === 0) return;
    onSubmit({ exerciseId, date, sets: validSets });
    setSets([emptySet()]);
  }

  return (
    <form className="tl-card tl-session-form" onSubmit={handleSubmit}>
      <div className="tl-card-heading">
        <span className="tl-eyebrow">記録を追加</span>
        <h2 className="tl-h2">{exerciseName || '種目を選択してください'}</h2>
      </div>

      <div className="tl-field">
        <label className="tl-label" htmlFor="session-date">
          日付
        </label>
        <input
          id="session-date"
          className="tl-input"
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="tl-field">
        <span className="tl-label">セット</span>
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
                placeholder="重量"
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
                placeholder="回数"
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
      </div>

      <button type="submit" className="tl-btn tl-btn--accent tl-btn--full">
        記録する
      </button>
    </form>
  );
}