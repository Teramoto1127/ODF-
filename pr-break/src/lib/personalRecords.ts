// src/lib/personalRecords.ts
import type { Exercise, TrainingSession } from './type';
import { getSessionBestOneRepMax } from './oneRepMax';

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  bestOneRepMax: number;
  bestWeight: number;
  lastPerformedDate: string | null;
}

/** 種目ごとに、これまでの推定1RM自己ベスト・最大重量・最終実施日をまとめる */
export function buildPersonalRecords(
  sessions: TrainingSession[],
  exercises: Exercise[],
): PersonalRecord[] {
  const byExercise = new Map<string, TrainingSession[]>();
  for (const s of sessions) {
    const list = byExercise.get(s.exerciseId) ?? [];
    list.push(s);
    byExercise.set(s.exerciseId, list);
  }

  const records: PersonalRecord[] = [];
  for (const exercise of exercises) {
    const exerciseSessions = byExercise.get(exercise.id);
    if (!exerciseSessions || exerciseSessions.length === 0) continue;

    const bestOneRepMax = exerciseSessions.reduce(
      (best, s) => Math.max(best, getSessionBestOneRepMax(s)),
      0,
    );
    const bestWeight = exerciseSessions.reduce(
      (best, s) => Math.max(best, ...s.sets.map((set) => set.weight)),
      0,
    );
    const lastPerformedDate = [...exerciseSessions].sort((a, b) => b.date.localeCompare(a.date))[0]
      .date;

    records.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      bestOneRepMax,
      bestWeight,
      lastPerformedDate,
    });
  }

  return records.sort((a, b) => b.bestOneRepMax - a.bestOneRepMax);
}