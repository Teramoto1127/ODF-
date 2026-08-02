import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { BodyWeightEntry } from '../../lib/type';
import { calculateGoalProgress } from '../../lib/weightProgress';

interface BodyWeightPanelProps {
  entries: BodyWeightEntry[];
  goalWeight: number | null;
  onAddEntry: (date: string, weight: number) => Promise<void>;
  onUpdateEntry: (id: string, patch: { date?: string; weight?: number }) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onUpdateGoalWeight: (goalWeight: number | null) => Promise<void>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function BodyWeightPanel({
  entries,
  goalWeight,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onUpdateGoalWeight,
}: BodyWeightPanelProps) {
  const [date, setDate] = useState(today());
  const [weight, setWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [goalInput, setGoalInput] = useState(goalWeight?.toString() ?? '');
  const [isSavingGoal, setIsSavingGoal] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingWeight, setEditingWeight] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  const progress = useMemo(() => calculateGoalProgress(entries, goalWeight), [entries, goalWeight]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = Number(weight);
    if (!value || value <= 0) return;
    setIsSubmitting(true);
    try {
      await onAddEntry(date, value);
      setWeight('');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveGoal() {
    setIsSavingGoal(true);
    try {
      const trimmed = goalInput.trim();
      await onUpdateGoalWeight(trimmed ? Number(trimmed) : null);
    } finally {
      setIsSavingGoal(false);
    }
  }

  function startEditing(entry: BodyWeightEntry) {
    setEditingId(entry.id);
    setEditingWeight(entry.weight.toString());
  }

  async function handleSaveEdit(id: string) {
    const value = Number(editingWeight);
    if (!value || value <= 0) return;
    setBusyId(id);
    try {
      await onUpdateEntry(id, { weight: value });
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm('この記録を削除しますか？');
    if (!confirmed) return;
    setBusyId(id);
    try {
      await onDeleteEntry(id);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="tl-panel">
      <div className="tl-card">
        <div className="tl-card-heading">
          <span className="tl-eyebrow">体重を記録</span>
          <h2 className="tl-h2">今日の体重</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="tl-field">
            <label className="tl-label" htmlFor="weight-date">
              日付
            </label>
            <input
              id="weight-date"
              className="tl-input"
              type="date"
              value={date}
              max={today()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="tl-field">
            <label className="tl-label" htmlFor="weight-value">
              体重
            </label>
            <div className="tl-picker-row">
              <input
                id="weight-value"
                className="tl-input tl-input--num"
                type="number"
                inputMode="decimal"
                min={0}
                step={0.1}
                placeholder="例: 65.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
              <span className="tl-set-unit">kg</span>
            </div>
          </div>
          <button type="submit" className="tl-btn tl-btn--accent tl-btn--full" disabled={isSubmitting}>
            {isSubmitting ? '保存中…' : '記録する'}
          </button>
        </form>
      </div>

      <div className="tl-card">
        <div className="tl-card-heading">
          <span className="tl-eyebrow">目標</span>
          <h2 className="tl-h2">目標体重</h2>
        </div>
        <div className="tl-picker-row">
          <input
            className="tl-input tl-input--num"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            placeholder="例: 60.0"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
          />
          <span className="tl-set-unit">kg</span>
          <button
            type="button"
            className="tl-btn tl-btn--ghost"
            onClick={handleSaveGoal}
            disabled={isSavingGoal}
          >
            {isSavingGoal ? '保存中…' : '設定'}
          </button>
        </div>

        {progress && (
          <div className="tl-goal-progress">
            <div className="tl-goal-progress-track">
              <div
                className="tl-goal-progress-fill"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
            <p className="tl-goal-progress-text">
              達成度 <strong>{progress.progressPercent}%</strong>（目標まであと
              {progress.remainingKg}kg）
            </p>
          </div>
        )}
      </div>

      <div className="tl-card">
        <div className="tl-card-heading">
          <span className="tl-eyebrow">履歴</span>
          <h2 className="tl-h2">記録一覧</h2>
        </div>

        {sorted.length === 0 ? (
          <p className="tl-empty-text">まだ体重の記録がありません。</p>
        ) : (
          <div className="tl-weight-list">
            {sorted.map((entry) => (
              <div className="tl-weight-row" key={entry.id}>
                <span className="tl-history-date">{formatDate(entry.date)}</span>
                {editingId === entry.id ? (
                  <>
                    <input
                      className="tl-input tl-input--num"
                      type="number"
                      step={0.1}
                      value={editingWeight}
                      onChange={(e) => setEditingWeight(e.target.value)}
                    />
                    <span className="tl-set-unit">kg</span>
                    <button
                      type="button"
                      className="tl-btn tl-btn--accent"
                      onClick={() => handleSaveEdit(entry.id)}
                      disabled={busyId === entry.id}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      className="tl-btn tl-btn--ghost"
                      onClick={() => setEditingId(null)}
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  <>
                    <span className="tl-weight-value">{entry.weight}kg</span>
                    <div className="tl-history-row-actions">
                      <button
                        type="button"
                        className="tl-btn tl-btn--ghost"
                        onClick={() => startEditing(entry)}
                      >
                        編集
                      </button>
                      <button
                        type="button"
                        className="tl-btn tl-btn--ghost"
                        onClick={() => handleDelete(entry.id)}
                        disabled={busyId === entry.id}
                      >
                        {busyId === entry.id ? '削除中…' : '削除'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}