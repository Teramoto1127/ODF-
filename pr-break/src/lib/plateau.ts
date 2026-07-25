import type { PlateauResult, SetEntry, Suggestion, TrainingSession } from './type';

/** 何回連続で記録が動かなければ「停滞」とみなすか */
export const PLATEAU_THRESHOLD = 3;

/** セットの中から一番きつい（重い→同じ重さなら回数が多い）セットを代表値として取り出す */
function getTopSet(sets: SetEntry[]): SetEntry | null {
  if (sets.length === 0) return null;
  return sets.reduce((best, current) => {
    if (current.weight > best.weight) return current;
    if (current.weight === best.weight && current.reps > best.reps) return current;
    return best;
  }, sets[0]);
}

/**
 * 直近のセッションから遡って、代表セット（重量×回数）が何回連続で
 * 更新されていないかを数え、閾値以上なら停滞と判定する。
 */
export function detectPlateau(
  sessions: TrainingSession[],
  threshold: number = PLATEAU_THRESHOLD,
): PlateauResult {
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) {
    return { isPlateaued: false, streak: 0, topSet: null };
  }

  const latestTop = getTopSet(sorted[sorted.length - 1].sets);
  if (!latestTop) {
    return { isPlateaued: false, streak: 0, topSet: null };
  }

  let streak = 1;
  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    const top = getTopSet(sorted[i].sets);
    if (top && top.weight === latestTop.weight && top.reps === latestTop.reps) {
      streak += 1;
    } else {
      break;
    }
  }

  return {
    isPlateaued: streak >= threshold,
    streak,
    topSet: latestTop,
  };
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * 停滞と判定された場合に「重量を下げてボリューム(回数)を増やす」提案文を組み立てる。
 */
export function buildSuggestion(result: PlateauResult): Suggestion {
  if (!result.isPlateaued || !result.topSet) {
    return { type: 'none', message: '' };
  }

  const { weight, reps } = result.topSet;
  const step = weight >= 40 ? 2.5 : 1;
  const suggestedWeight = Math.max(roundToStep(weight * 0.9, step), step);
  const suggestedReps = reps + 2;

  return {
    type: 'deload',
    message:
      `直近${result.streak}回、${weight}kg×${reps}回から記録が動いていません。` +
      `重量を${suggestedWeight}kgまで落として、代わりに1セットあたり${suggestedReps}回まで` +
      `回数を増やしてみましょう。負荷を下げてボリュームを確保し、回復を優先する提案です。`,
    suggestedWeight,
    suggestedReps,
  };
}