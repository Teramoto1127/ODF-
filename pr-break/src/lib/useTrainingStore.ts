import { useCallback, useMemo, useState } from 'react';
import type { Exercise, MuscleGroup, TrainingSession } from './type';
import { PRESET_EXERCISES } from './exercises';
import { SEED_SESSIONS } from './mockData';

/**
 * トレーニング記録のデータ層。
 *
 * 今はメモリ内 state（リロードで消える）だが、addExercise / addSession /
 * sessionsByExercise の3つのインターフェースだけを外部に公開しているので、
 * 将来サーバー/DBに繋ぐときはこのフックの中身だけを fetch 呼び出しに
 * 差し替えればよい設計にしている。
 */
export function useTrainingStore() {
  const [exercises, setExercises] = useState<Exercise[]>(PRESET_EXERCISES);
  const [sessions, setSessions] = useState<TrainingSession[]>(SEED_SESSIONS);

  const addExercise = useCallback((name: string, muscleGroup: MuscleGroup) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const exercise: Exercise = {
      id: `custom-${Date.now()}`,
      name: trimmed,
      muscleGroup,
      isCustom: true,
    };
    setExercises((prev) => [...prev, exercise]);
    return exercise;
  }, []);

  const addSession = useCallback((session: Omit<TrainingSession, 'id'>) => {
    const newSession: TrainingSession = { ...session, id: `session-${Date.now()}` };
    setSessions((prev) => [...prev, newSession]);
  }, []);

  const sessionsByExercise = useMemo(() => {
    const map = new Map<string, TrainingSession[]>();
    for (const session of sessions) {
      const list = map.get(session.exerciseId) ?? [];
      list.push(session);
      map.set(session.exerciseId, list);
    }
    return map;
  }, [sessions]);

  const getSessions = useCallback(
    (exerciseId: string) => sessionsByExercise.get(exerciseId) ?? [],
    [sessionsByExercise],
  );

  return { exercises, sessions, addExercise, addSession, getSessions };
}