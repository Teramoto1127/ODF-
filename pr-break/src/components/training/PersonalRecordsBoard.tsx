// src/components/training/PersonalRecordsBoard.tsx
import { useMemo } from 'react';
import type { Exercise, TrainingSession } from '../../lib/type';
import { buildPersonalRecords } from '../../lib/personalRecords';

interface PersonalRecordsBoardProps {
  sessions: TrainingSession[];
  exercises: Exercise[];
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function PersonalRecordsBoard({ sessions, exercises }: PersonalRecordsBoardProps) {
  const records = useMemo(() => buildPersonalRecords(sessions, exercises), [sessions, exercises]);

  if (records.length === 0) {
    return (
      <div className="tl-card tl-empty">
        <p className="tl-empty-text">記録がたまると、ここに種目別の自己ベストが並びます。</p>
      </div>
    );
  }

  return (
    <div className="tl-card tl-pr-board">
      <div className="tl-card-heading">
        <span className="tl-eyebrow">自己ベスト</span>
        <h2 className="tl-h2">種目別 PR一覧</h2>
      </div>

      <div className="tl-pr-list">
        {records.map((r) => (
          <div className="tl-pr-row" key={r.exerciseId}>
            <div className="tl-pr-row-main">
              <span className="tl-pr-name">{r.exerciseName}</span>
              <span className="tl-pr-1rm">推定1RM {r.bestOneRepMax}kg</span>
            </div>
            <div className="tl-pr-row-sub">
              <span>最大重量 {r.bestWeight}kg</span>
              {r.lastPerformedDate && <span>最終実施 {formatDate(r.lastPerformedDate)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}