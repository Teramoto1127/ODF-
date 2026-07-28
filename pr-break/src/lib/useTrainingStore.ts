import { useCallback, useEffect, useState } from 'react';
import type { Exercise, MuscleGroup, SetEntry, TrainingSession } from './type';
import { PRESET_EXERCISES } from './exercises';
import { SEED_SESSIONS } from './mockData';
import { useAuth } from './AuthContext';
import {
  fetchExercises,
  fetchSessions,
  createExerciseApi,
  updateExerciseApi,
  deleteExerciseApi,
  createSessionApi,
  updateSessionApi,
  deleteSessionApi,
  type SessionPatch,
  type ExercisePatch,
} from './api';

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

  /** カスタム種目のリネーム・部位変更。プリセット種目には呼ばないこと。 */
  const updateExercise = useCallback(
    async (id: string, patch: ExercisePatch): Promise<void> => {
      if (isAuthenticated) {
        const updated = await updateExerciseApi(id, patch);
        setExercises((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return;
      }
      setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    },
    [isAuthenticated],
  );

  /**
   * カスタム種目を削除する。紐づく過去セッションも一緒に削除する
   * (サーバー側と挙動を揃え、孤立した記録を残さないため)。
   */
  const deleteExercise = useCallback(
    async (id: string): Promise<void> => {
      if (isAuthenticated) {
        await deleteExerciseApi(id);
      }
      setExercises((prev) => prev.filter((e) => e.id !== id));
      setSessions((prev) => prev.filter((s) => s.exerciseId !== id));
    },
    [isAuthenticated],
  );

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

  const updateSession = useCallback(
    async (id: string, patch: SessionPatch): Promise<void> => {
      if (isAuthenticated) {
        const updated = await updateSessionApi(id, patch);
        setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
        return;
      }
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    [isAuthenticated],
  );

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      if (isAuthenticated) {
        await deleteSessionApi(id);
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
    },
    [isAuthenticated],
  );

  const getSessions = useCallback(
    (exerciseId: string) => sessions.filter((s) => s.exerciseId === exerciseId),
    [sessions],
  );

  return {
    exercises,
    sessions,
    addExercise,
    updateExercise,
    deleteExercise,
    addSession,
    addWorkout,
    updateSession,
    deleteSession,
    getSessions,
    isSyncing,
  };
}