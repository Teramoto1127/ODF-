// src/components/training/WorkoutForm.tsx
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Exercise, SetEntry } from '../../lib/type';
import { MUSCLE_GROUPS } from '../../lib/exercises';

interface WorkoutEntryDraft {
  key: string;
  exerciseId: string;
  sets: SetEntry[];
}

interface WorkoutFormProps {
  exercises: Exercise[];
  onSubmit: (date: string, entries: { exerciseId: string; sets: SetEntry[] }[]) => Promise<string>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptySet(): SetEntry {
  return { weight: 0, reps: 0 };
}

function makeEntry(defaultExerciseId: string): WorkoutEntryDraft {
  return {
    key: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    exerciseId: defaultExerciseId,
    sets: [emptySet()],
  };
}

export function WorkoutForm({ exercises, onSubmit }: WorkoutFormProps) {
  const [date, setDate] = useState(today());
  const [entries, setEntries] = useState<WorkoutEntryDraft[]>([makeEntry(exercises[0]?.id ?? '')]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const grouped = MUSCLE_GROUPS.map((group) => ({
    group,
    items: exercises.filter((e) => e.muscleGroup === group),
  })).filter((g) => g.items.length > 0);

  function updateEntryExercise(entryKey: string, exerciseId: string) {
    setEntries((prev) => prev.map((e) => (e.key === entryKey ? { ...e, exerciseId } : e)));
  }

  function updateSet(entryKey: string, setIndex: number, patch: Partial<SetEntry>) {
    setEntries((prev) =>
      prev.map((e) =>
        e.key === entryKey
          ? { ...e, sets: e.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)) }
          : e,
      ),
    );
  }

  function addSetRow(entryKey: string) {
    setEntries((prev) =>
      prev.map((e) => (e.key === entryKey ? { ...e, sets: [...e.sets, emptySet()] } : e)),
    );
  }

  function removeSetRow(entryKey: string, setIndex: number) {
    setEntries((prev) =>
      prev.map((e) =>
        e.key === entryKey && e.sets.length > 1
          ? { ...e, sets: e.sets.filter((_, i) => i !== setIndex) }
          : e,
      ),
    );
  }

  function addExerciseBlock() {
    setEntries((prev) => [...prev, makeEntry(exercises[0]?.id ?? '')]);
  }

  function removeExerciseBlock(entryKey: string) {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.key !== entryKey) : prev));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validEntries = entries
      .map((entry) => ({
        exerciseId: entry.exerciseId,
        sets: entry.sets.filter((s) => s.weight > 0 && s.reps > 0),
      }))
      .filter((entry) => entry.exerciseId && entry.sets.length > 0);

    if (validEntries.length === 0) return;

    setIsSubmitting(true);
    try {
      await onSubmit(date, validEntries);
      setEntries([makeEntry(exercises[0]?.id ?? '')]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="tl-card tl-workout-form" onSubmit={handleSubmit}>
      <div className="tl-card-heading">
        <span className="tl-eyebrow">ワークアウトを記録</span>
        <h2 className="tl-h2">複数種目まとめて記録</h2>
      </div>

      <div className="tl-field">
        <label className="tl-label" htmlFor="workout-date">
          日付
        </label>
        <input
          id="workout-date"
          className="tl-input"
          type="date"
          value={date}
          max={today()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="tl-workout-entries">
        {entries.map((entry, entryIdx) => (
          <div className="tl-workout-entry" key={entry.key}>
            <div className="tl-picker-row">
              <select
                className="tl-select"
                value={entry.exerciseId}
                onChange={(e) => updateEntryExercise(entry.key, e.target.value)}
              >
                {grouped.map(({ group, items }) => (
                  <optgroup key={group} label={group}>
                    {items.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {entries.length > 1 && (
                <button
                  type="button"
                  className="tl-btn tl-btn--ghost"
                  onClick={() => removeExerciseBlock(entry.key)}
                >
                  種目を削除
                </button>
              )}
            </div>

            <div className="tl-set-rows">
              {entry.sets.map((set, setIdx) => (
                <div className="tl-set-row" key={setIdx}>
                  <span className="tl-set-index">{setIdx + 1}</span>
                  <input
                    className="tl-input tl-input--num"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.5}
                    placeholder="重量"
                    value={set.weight || ''}
                    onChange={(e) => updateSet(entry.key, setIdx, { weight: Number(e.target.value) })}
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
                    onChange={(e) => updateSet(entry.key, setIdx, { reps: Number(e.target.value) })}
                  />
                  <span className="tl-set-unit">回</span>
                  <button
                    type="button"
                    className="tl-set-remove"
                    aria-label="このセットを削除"
                    onClick={() => removeSetRow(entry.key, setIdx)}
                    disabled={entry.sets.length === 1}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="tl-btn tl-btn--ghost tl-btn--full"
              onClick={() => addSetRow(entry.key)}
            >
              + セットを追加
            </button>

            {entryIdx < entries.length - 1 && <hr className="tl-workout-divider" />}
          </div>
        ))}
      </div>

      <button type="button" className="tl-btn tl-btn--ghost tl-btn--full" onClick={addExerciseBlock}>
        + 種目を追加
      </button>

      <button type="submit" className="tl-btn tl-btn--accent tl-btn--full" disabled={isSubmitting}>
        {isSubmitting ? '記録中…' : 'ワークアウトを記録する'}
      </button>
    </form>
  );
}