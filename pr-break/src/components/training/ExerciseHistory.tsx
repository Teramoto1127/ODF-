
import { useState } from 'react';
import type { PlateauResult, TrainingSession } from '../../lib/type';
import { SetBars } from './SetBars';
import { SessionEditForm } from './SessionEditForm';
import { getAllTimeBestOneRepMax } from '../../lib/oneRepMax';
import type { SessionPatch } from '../../lib/api';

interface ExerciseHistoryProps {
  sessions: TrainingSession[];
  plateau: PlateauResult;
  onUpdateSession: (id: string, patch: SessionPatch) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ExerciseHistory({
  sessions,
  plateau,
  onUpdateSession,
  onDeleteSession,
}: ExerciseHistoryProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const maxWeight = sessions.reduce(
    (max, s) => Math.max(max, ...s.sets.map((set) => set.weight)),
    0,
  );
  const bestOneRepMax = getAllTimeBestOneRepMax(sessions);

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

  if (sorted.length === 0) {
    return (
      <div className="tl-card tl-empty">
        <p className="tl-empty-title">まだ記録がありません</p>
        <p className="tl-empty-text">最初の1本を記録すると、ここに履歴が積み上がっていきます。</p>
      </div>
    );
  }

  return (
    <div className="tl-card tl-history">
      <div className="tl-card-heading">
        <span className="tl-eyebrow">履歴</span>
        <h2 className="tl-h2">直近{sorted.length}回の記録</h2>
        {bestOneRepMax > 0 && (
          <p className="tl-onerm-badge">
            推定1RM 自己ベスト: <strong>{bestOneRepMax}kg</strong>
          </p>
        )}
      </div>
      <div className="tl-history-rows">
        {sorted.map((session) => (
          <div className="tl-history-row" key={session.id}>
            <span className="tl-history-date">{formatDate(session.date)}</span>

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
                <SetBars
                  sets={session.sets}
                  maxWeight={maxWeight}
                  highlight={plateau.isPlateaued ? plateau.topSet : null}
                />
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
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}