// src/lib/useTrainingStore.ts
import { useCallback, useEffect, useState } from 'react';
import type { Exercise, MuscleGroup, TrainingSession } from './type';
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

/**
 * 登録画面での移行用に、今ブラウザに保存されているローカルデータを読み出す。
 * 一度も保存されたことが無いキーは「移行すべきデータなし」として空配列を返す
 * (PRESET_EXERCISES/SEED_SESSIONSをそのまま移行対象にしないため)。
 */
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

/** 登録完了後、ローカルの下書きデータは役目を終えたので消しておく */
export function clearLocalTrainingData(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY_EXERCISES);
  window.localStorage.removeItem(STORAGE_KEY_SESSIONS);
}

/**
 * トレーニング記録のデータ層。
 *
 * 未ログイン時は localStorage、ログイン時はサーバーAPIをデータソースとして使う。
 * ログイン中は「サーバーが正」という方針で、localStorageへの書き込みは行わない
 * (2つの保存先が食い違うのを防ぐため)。
 */
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

  // ログイン状態が確定したタイミングでサーバーからデータを取得する
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;

    let cancelled = false;
    setIsSyncing(true);
    Promise.all([fetchExercises(), fetchSessions()])
      .then(([serverExercises, serverSessions]) => {
        if (cancelled) return;
        // プリセット種目は常にクライアント側の定義を使い、
        // サーバーにはユーザーが追加したカスタム種目だけを持たせる設計。
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

  // 未ログイン時のみ localStorage に保存する
  useEffect(() => {
    if (isAuthenticated) return;
    saveToStorage(STORAGE_KEY_EXERCISES, exercises);
  }, [exercises, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) return;
    saveToStorage(STORAGE_KEY_SESSIONS, sessions);
  }, [sessions, isAuthenticated]);

  /**
   * 種目追加。ログイン中はサーバーにIDを発行してもらう必要があるため、
   * この関数は非同期(Promise)になる。呼び出し側(ExercisePicker)もawaitする。
   */
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
        id: `custom-${Date.now()}`,
        name: trimmed,
        muscleGroup,
        isCustom: true,
      };
      setExercises((prev) => [...prev, exercise]);
      return exercise;
    },
    [isAuthenticated],
  );

  const addSession = useCallback(
    (session: Omit<TrainingSession, 'id'>) => {
      if (isAuthenticated) {
        // UIをブロックしないよう非同期で投げっぱなしにし、成功したらstateへ反映する
        createSessionApi(session)
          .then((created) => setSessions((prev) => [...prev, created]))
          .catch((err) => console.error('[useTrainingStore] Failed to create session on server', err));
        return;
      }

      const newSession: TrainingSession = { ...session, id: `session-${Date.now()}` };
      setSessions((prev) => [...prev, newSession]);
    },
    [isAuthenticated],
  );

  const getSessions = useCallback(
    (exerciseId: string) => sessions.filter((s) => s.exerciseId === exerciseId),
    [sessions],
  );

  return { exercises, sessions, addExercise, addSession, getSessions, isSyncing };
}