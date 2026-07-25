// src/components/training/ExercisePicker.tsx
import { useState } from 'react';
import type { Exercise, MuscleGroup } from '../../lib/type';
import { MUSCLE_GROUPS } from '../../lib/exercises';

interface ExercisePickerProps {
  exercises: Exercise[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddExercise: (name: string, group: MuscleGroup) => Promise<Exercise | null>;
}

export function ExercisePicker({
  exercises,
  selectedId,
  onSelect,
  onAddExercise,
}: ExercisePickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<MuscleGroup>('その他');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const grouped = MUSCLE_GROUPS.map((group) => ({
    group,
    items: exercises.filter((e) => e.muscleGroup === group),
  })).filter((g) => g.items.length > 0);

  async function handleAddConfirm() {
    setIsSubmitting(true);
    try {
      const created = await onAddExercise(newName, newGroup);
      if (created) {
        onSelect(created.id);
        setNewName('');
        setNewGroup('その他');
        setIsAdding(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="tl-field">
      <label className="tl-label" htmlFor="exercise-select">
        種目
      </label>
      <div className="tl-picker-row">
        <select
          id="exercise-select"
          className="tl-select"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
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
        <button
          type="button"
          className="tl-btn tl-btn--ghost"
          onClick={() => setIsAdding((v) => !v)}
        >
          {isAdding ? '閉じる' : '+ 種目を追加'}
        </button>
      </div>

      {isAdding && (
        <div className="tl-add-exercise">
          <input
            className="tl-input"
            type="text"
            placeholder="種目名（例: ケーブルフライ）"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <select
            className="tl-select"
            value={newGroup}
            onChange={(e) => setNewGroup(e.target.value as MuscleGroup)}
          >
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="tl-btn tl-btn--accent"
            disabled={!newName.trim() || isSubmitting}
            onClick={handleAddConfirm}
          >
            {isSubmitting ? '追加中…' : '追加して選択'}
          </button>
        </div>
      )}
    </div>
  );
}