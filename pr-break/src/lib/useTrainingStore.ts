// src/lib/useTrainingStore.ts
import { useCallback, useEffect, useState } from 'react';
import type { Exercise, MuscleGroup, SetEntry, TrainingSession } from './type';
import { PRESET_EXERCISES } from './exercises';
import { SEED_SESSIONS } from './mockData';
import { useAuth } from './AuthContext';
import { fetchExercises, fetchSessions, createExerciseApi, createSessionApi } from './api';

export const STORAGE_KEY_EXERCISES = 'fuka-log:exercises';
export const STORAGE_KEY_SESSIONS = 'fuka-log:sessions';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[useTrainingStore] Failed to load "${key}" from localStorage`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[useTrainingStore] Failed to save "${key}" to localStorage`, err);
  }
}

export function readLocalTrainingData(): {
  exercises: Exercise[];
  sessions: TrainingSession[];
} {
  const hasSavedExercises =
    typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY_EXERCISES) !== null;
  const hasSavedSessions =
    typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY_SESSIONS) !== null;
  return {
    exercises: hasSavedExercises ? loadFromStorage(STORAGE_KEY_EXERCISES, []) : [],
    sessions: hasSavedSessions ? loadFromStorage(STORAGE_KEY_SESSIONS, []) : [],
  };
}

export function clearLocalTrainingData(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY_EXERCISES);
  window.localStorage.removeItem(STORAGE_KEY_SESSIONS);
}

/** ID生成の共通ヘルパー。Date.now()だけだと同一ミリ秒内での連続生成(ワークアウト一括登録時)に
 *  IDが衝突する恐れがあるため、ランダムな接尾辞を付ける。 */
function generateLocalId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useTrainingStore() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !!user;

  const [exercises, setExercises] = useState<Exercise[]>(() =>
    loadFromStorage(STORAGE_KEY_EXERCISES, PRESET_EXERCISES),
  );
  const [sessions, setSessions] = useState<TrainingSession[]>(() =>
    loadFromStorage(STORAGE_KEY_SESSIONS, SEED_SESSIONS),
  );
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    let cancelled = false;
    setIsSyncing(true);
    Promise.all([fetchExercises(), fetchSessions()])
      .then(([serverExercises, serverSessions]) => {
        if (cancelled) return;
        setExercises([...PRESET_EXERCISES, ...serverExercises]);
        setSessions(serverSessions);
      })
      .catch((err) => {
        console.error('[useTrainingStore] Failed to load data from server', err);
      })
      .finally(() => {
        if (!cancelled) setIsSyncing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (isAuthenticated) return;
    saveToStorage(STORAGE_KEY_EXERCISES, exercises);
  }, [exercises, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    saveToStorage(STORAGE_KEY_SESSIONS, sessions);
  }, [sessions, isAuthenticated]);

  const addExercise = useCallback(
    async (name: string, muscleGroup: MuscleGroup): Promise<Exercise | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      if (isAuthenticated) {
        try {
          const created = await createExerciseApi(trimmed, muscleGroup);
          setExercises((prev) => [...prev, created]);
          return created;
        } catch (err) {
          console.error('[useTrainingStore] Failed to create exercise on server', err);
          return null;
        }
      }

      const exercise: Exercise = {
        id: generateLocalId('custom'),
        name: trimmed,
        muscleGroup,
        isCustom: true,
      };
      setExercises((prev) => [...prev, exercise]);
      return exercise;
    },
    [isAuthenticated],
  );

  /**
   * セッションを1件追加する。呼び出し側で await できるよう常にPromiseを返す。
   * (単発記録・ワークアウト一括記録どちらからも呼ばれる共通のコア関数)
   */
  const addSession = useCallback(
    async (session: Omit<TrainingSession, 'id'>): Promise<void> => {
      if (isAuthenticated) {
        const created = await createSessionApi(session);
        setSessions((prev) => [...prev, created]);
        return;
      }

      const newSession: TrainingSession = { ...session, id: generateLocalId('session') };
      setSessions((prev) => [...prev, newSession]);
    },
    [isAuthenticated],
  );

  /**
   * 1回のワークアウトとして複数種目をまとめて記録する。
   * 同じ workoutId を全エントリに付与し、日付は共通のものを使う。
   * 並列(Promise.all)ではなく直列(for...of)で送るのは、途中で失敗した時に
   * 「どこまで登録できたか」を追いやすくするため。
   */
  const addWorkout = useCallback(
    async (
      date: string,
      entries: { exerciseId: string; sets: SetEntry[]; note?: string }[],
    ): Promise<string> => {
      const workoutId = generateLocalId('workout');
      for (const entry of entries) {
        await addSession({ ...entry, date, workoutId });
      }
      return workoutId;
    },
    [addSession],
  );

  const getSessions = useCallback(
    (exerciseId: string) => sessions.filter((s) => s.exerciseId === exerciseId),
    [sessions],
  );

  return {
    exercises,
    sessions,
    addExercise,
    addSession,
    addWorkout,
    getSessions,
    isSyncing,
  };
}