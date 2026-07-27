// src/components/training/WeeklyVolume.tsx
import { useMemo } from 'react';
import type { Exercise, TrainingSession } from '../../lib/type';
import { getWeeklyVolumeByMuscleGroup } from '../../lib/volume';

interface WeeklyVolumeProps {
  sessions: TrainingSession[];
  exercises: Exercise[];
}

export function WeeklyVolume({ sessions, exercises }: WeeklyVolumeProps) {
  const data = useMemo(
    () => getWeeklyVolumeByMuscleGroup(sessions, exercises),
    [sessions, exercises],
  );

  const maxVolume = data.length > 0 ? data[0].volume : 0;

  if (data.length === 0) {
    return (
      <div className="tl-card tl-empty">
        <p className="tl-empty-text">直近7日間の記録がまだありません。</p>
      </div>
    );
  }

  return (
    <div className="tl-card tl-weekly-volume">
      <div className="tl-card-heading">
        <span className="tl-eyebrow">直近7日間</span>
        <h2 className="tl-h2">部位別ボリューム</h2>
      </div>

      <div className="tl-volume-bars">
        {data.map(({ group, volume }) => {
          const widthPct = maxVolume > 0 ? Math.max(4, (volume / maxVolume) * 100) : 0;
          return (
            <div className="tl-volume-row" key={group}>
              <span className="tl-volume-label">{group}</span>
              <div className="tl-volume-track">
                <div className="tl-volume-fill" style={{ width: `${widthPct}%` }} />
              </div>
              <span className="tl-volume-value">{volume.toLocaleString()}kg</span>
            </div>
          );
        })}
      </div>
      <p className="tl-volume-note">ボリューム = 重量 × 回数 の合計</p>
    </div>
  );
}