// src/components/training/ExerciseHistory.tsx
import type { PlateauResult, TrainingSession } from '../../lib/type';
import { SetBars } from './SetBars';
import { getAllTimeBestOneRepMax } from '../../lib/oneRepMax';

interface ExerciseHistoryProps {
  sessions: TrainingSession[];
  plateau: PlateauResult;
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function ExerciseHistory({ sessions, plateau }: ExerciseHistoryProps) {
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const maxWeight = sessions.reduce(
    (max, s) => Math.max(max, ...s.sets.map((set) => set.weight)),
    0,
  );
  const bestOneRepMax = getAllTimeBestOneRepMax(sessions);

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
            <SetBars
              sets={session.sets}
              maxWeight={maxWeight}
              highlight={plateau.isPlateaued ? plateau.topSet : null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}