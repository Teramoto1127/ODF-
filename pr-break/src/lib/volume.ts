// src/lib/volume.ts
import type { Exercise, MuscleGroup, TrainingSession } from './type';

/** 1セッションの総ボリューム(重量×回数の合計)を計算する */
export function getSessionVolume(session: TrainingSession): number {
  return session.sets.reduce((sum, set) => sum + set.weight * set.reps, 0);
}

function startOfWeek(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

/**
 * 直近7日間のセッションを部位ごとに集計し、総ボリュームを算出する。
 * exercises が既に削除されている場合など、対応する種目が見つからない
 * セッションは集計から除外する。
 */
export function getWeeklyVolumeByMuscleGroup(
  sessions: TrainingSession[],
  exercises: Exercise[],
): { group: MuscleGroup; volume: number }[] {
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
  const since = startOfWeek(6); // 今日を含めて直近7日間

  const totals = new Map<MuscleGroup, number>();
  for (const session of sessions) {
    const sessionDate = new Date(`${session.date}T00:00:00`);
    if (sessionDate < since) continue;

    const exercise = exerciseMap.get(session.exerciseId);
    if (!exercise) continue;

    const volume = getSessionVolume(session);
    totals.set(exercise.muscleGroup, (totals.get(exercise.muscleGroup) ?? 0) + volume);
  }

  return Array.from(totals.entries())
    .map(([group, volume]) => ({ group, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);
}