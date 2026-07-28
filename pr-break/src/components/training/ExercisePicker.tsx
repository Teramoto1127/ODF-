import { useState } from 'react';
import type { Exercise, MuscleGroup } from '../../lib/type';
import { MUSCLE_GROUPS } from '../../lib/exercises';
import type { ExercisePatch } from '../../lib/api';

interface ExercisePickerProps {
  exercises: Exercise[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddExercise: (name: string, group: MuscleGroup) => Promise<Exercise | null>;
  onUpdateExercise: (id: string, patch: ExercisePatch) => Promise<void>;
  onDeleteExercise: (id: string) => Promise<void>;
}

export function ExercisePicker({
  exercises,
  selectedId,
  onSelect,
  onAddExercise,
  onUpdateExercise,
  onDeleteExercise,
}: ExercisePickerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGroup, setNewGroup] = useState<MuscleGroup>('その他');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const grouped = MUSCLE_GROUPS.map((group) => ({
    group,
    items: exercises.filter((e) => e.muscleGroup === group),
  })).filter((g) => g.items.length > 0);

  const customExercises = exercises.filter((e) => e.isCustom);

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

  function startEditing(exercise: Exercise) {
    setEditingId(exercise.id);
    setEditingName(exercise.name);
  }

  async function handleRenameConfirm(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setBusyId(id);
    try {
      await onUpdateExercise(id, { name: trimmed });
      setEditingId(null);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(exercise: Exercise) {
    const confirmed = window.confirm(
      `「${exercise.name}」を削除しますか？\nこの種目に紐づく過去の記録もすべて削除されます。`,
    );
    if (!confirmed) return;
    setBusyId(exercise.id);
    try {
      await onDeleteExercise(exercise.id);
    } finally {
      setBusyId(null);
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
        <button
          type="button"
          className="tl-btn tl-btn--ghost"
          onClick={() => setIsManaging((v) => !v)}
        >
          {isManaging ? '閉じる' : '種目を管理'}
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

      {isManaging && (
        <div className="tl-exercise-manager">
          {customExercises.length === 0 ? (
            <p className="tl-empty-text">追加したカスタム種目がありません。</p>
          ) : (
            customExercises.map((ex) => (
              <div className="tl-exercise-manager-row" key={ex.id}>
                {editingId === ex.id ? (
                  <>
                    <input
                      className="tl-input"
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                    <button
                      type="button"
                      className="tl-btn tl-btn--accent"
                      disabled={!editingName.trim() || busyId === ex.id}
                      onClick={() => handleRenameConfirm(ex.id)}
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
                    <span className="tl-exercise-manager-name">{ex.name}</span>
                    <span className="tl-exercise-manager-group">{ex.muscleGroup}</span>
                    <button
                      type="button"
                      className="tl-btn tl-btn--ghost"
                      onClick={() => startEditing(ex)}
                    >
                      名前を変更
                    </button>
                    <button
                      type="button"
                      className="tl-btn tl-btn--ghost"
                      disabled={busyId === ex.id}
                      onClick={() => handleDelete(ex)}
                    >
                      {busyId === ex.id ? '削除中…' : '削除'}
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}