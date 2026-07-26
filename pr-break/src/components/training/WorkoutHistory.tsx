import { useMemo, useState } from 'react';
import type { Exercise, TrainingSession } from '../../lib/type';
import { SessionEditForm } from './SessionEditForm';
import type { SessionPatch } from '../../lib/api';

interface WorkoutHistoryProps {
  sessions: TrainingSession[];
  exercises: Exercise[];
  onUpdateSession: (id: string, patch: SessionPatch) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
}

interface WorkoutGroup {
  key: string;
  date: string;
  entries: TrainingSession[];
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * workoutId を持つセッションは同じグループにまとめ、
 * 持たないセッション（1種目ずつ記録されたもの）はそれぞれ単独のグループにする。
 */
function groupByWorkout(sessions: TrainingSession[]): WorkoutGroup[] {
  const map = new Map<string, TrainingSession[]>();
  for (const s of sessions) {
    const key = s.workoutId ?? `solo-${s.id}`;
    const list = map.get(key) ?? [];
    list.push(s);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .map(([key, entries]) => ({ key, date: entries[0].date, entries }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function WorkoutHistory({
  sessions,
  exercises,
  onUpdateSession,
  onDeleteSession,
}: WorkoutHistoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groups = useMemo(() => groupByWorkout(sessions), [sessions]);
  const exerciseName = (id: string) => exercises.find((e) => e.id === id)?.name ?? '(削除された種目)';

  async function handleDelete(id: string) {
    const confirmed = window.confirm('この記録を削除しますか？元に戻せません。');
    if (!confirmed) return;
    setDeletingId(id);
    try {
      await onDeleteSession(id);
    } finally {
      setDeletingId(null);
    }
  }

  if (groups.length === 0) {
    return (
      <div className="tl-card tl-empty">
        <p className="tl-empty-title">まだ記録がありません</p>
        <p className="tl-empty-text">記録するとここにワークアウト単位で表示されます。</p>
      </div>
    );
  }

  return (
    <div className="tl-card tl-workout-history">
      <div className="tl-card-heading">
        <span className="tl-eyebrow">履歴</span>
        <h2 className="tl-h2">ワークアウト別の記録</h2>
      </div>

      <div className="tl-workout-groups">
        {groups.map((group) => (
          <div className="tl-workout-group" key={group.key}>
            <p className="tl-workout-group-date">{formatDate(group.date)}</p>
            <div className="tl-workout-group-entries">
              {group.entries.map((session) => (
                <div className="tl-workout-group-entry" key={session.id}>
                  {editingId === session.id ? (
                    <SessionEditForm
                      session={session}
                      onCancel={() => setEditingId(null)}
                      onSave={async (patch) => {
                        await onUpdateSession(session.id, patch);
                        setEditingId(null);
                      }}
                    />
                  ) : (
                    <>
                      <div className="tl-workout-entry-header">
                        <span className="tl-workout-entry-name">
                          {exerciseName(session.exerciseId)}
                        </span>
                        <div className="tl-history-row-actions">
                          <button
                            type="button"
                            className="tl-btn tl-btn--ghost"
                            onClick={() => setEditingId(session.id)}
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            className="tl-btn tl-btn--ghost"
                            onClick={() => handleDelete(session.id)}
                            disabled={deletingId === session.id}
                          >
                            {deletingId === session.id ? '削除中…' : '削除'}
                          </button>
                        </div>
                      </div>
                      <p className="tl-workout-entry-sets">
                        {session.sets.map((s, i) => (
                          <span key={i} className="tl-workout-set-chip">
                            {s.weight}kg×{s.reps}
                          </span>
                        ))}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}