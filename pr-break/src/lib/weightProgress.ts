import type { BodyWeightEntry, TrainingSession } from './type';

export interface GoalProgress {
  startWeight: number;
  currentWeight: number;
  goalWeight: number;
  /** 0〜100(達成後は100で頭打ち)。マイナスは後退(目標と逆方向に進んだ)を示す */
  progressPercent: number;
  /** ダイエット(減量)方向かバルクアップ(増量)方向か */
  direction: 'lose' | 'gain';
  remainingKg: number;
}

/**
 * 最初の記録(開始体重)から現在の記録(最新体重)までの間に、
 * 目標体重に対してどれだけ進んだかを算出する。
 * 記録が1件以下、または目標未設定の場合はnullを返す。
 */
export function calculateGoalProgress(
  entries: BodyWeightEntry[],
  goalWeight: number | null,
): GoalProgress | null {
  if (goalWeight === null || entries.length < 1) return null;

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const startWeight = sorted[0].weight;
  const currentWeight = sorted[sorted.length - 1].weight;

  const direction: 'lose' | 'gain' = goalWeight <= startWeight ? 'lose' : 'gain';
  const totalDistance = Math.abs(goalWeight - startWeight);

  if (totalDistance === 0) {
    return { startWeight, currentWeight, goalWeight, progressPercent: 100, direction, remainingKg: 0 };
  }

  const traveled = direction === 'lose' ? startWeight - currentWeight : currentWeight - startWeight;
  const progressPercent = Math.max(0, Math.min(100, Math.round((traveled / totalDistance) * 100)));
  const remainingKg = Math.round(Math.abs(goalWeight - currentWeight) * 10) / 10;

  return { startWeight, currentWeight, goalWeight, progressPercent, direction, remainingKg };
}

export interface WeightVolumePoint {
  weekLabel: string;
  weekStart: string;
  weight: number | null;
  volume: number;
}

function formatWeekLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 直近N週分について、7日ごとのバケツに区切り、
 * 「その週の総トレーニングボリューム」と「その週の平均体重(記録が無ければnull)」
 * を1本の時系列としてまとめる。体重×トレーニング量を重ねて見るためのデータ生成。
 */
export function buildWeightVolumeSeries(
  bodyWeights: BodyWeightEntry[],
  sessions: TrainingSession[],
  weeks: number = 10,
): WeightVolumePoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const points: WeightVolumePoint[] = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const weekStartIso = weekStart.toISOString().slice(0, 10);
    const weekEndIso = weekEnd.toISOString().slice(0, 10);

    const volume = sessions
      .filter((s) => s.date >= weekStartIso && s.date <= weekEndIso)
      .reduce((sum, s) => sum + s.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0), 0);

    const weightsInWeek = bodyWeights.filter((w) => w.date >= weekStartIso && w.date <= weekEndIso);
    const weight =
      weightsInWeek.length > 0
        ? Math.round(
            (weightsInWeek.reduce((sum, w) => sum + w.weight, 0) / weightsInWeek.length) * 10,
          ) / 10
        : null;

    points.push({
      weekLabel: formatWeekLabel(weekStart),
      weekStart: weekStartIso,
      weight,
      volume: Math.round(volume),
    });
  }

  return points;
}