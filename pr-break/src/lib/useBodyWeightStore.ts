import { useCallback, useEffect, useRef, useState } from 'react';
import type { BodyWeightEntry } from './type';
import { useAuth } from './AuthContext';
import {
  fetchBodyWeights,
  createBodyWeightApi,
  updateBodyWeightApi,
  deleteBodyWeightApi,
  type BodyWeightPatch,
} from './api';

export const STORAGE_KEY_BODY_WEIGHTS = 'fuka-log:body-weights';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[useBodyWeightStore] Failed to load "${key}" from localStorage`, err);
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[useBodyWeightStore] Failed to save "${key}" to localStorage`, err);
  }
}

export function readLocalBodyWeights(): BodyWeightEntry[] {
  const hasSaved =
    typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY_BODY_WEIGHTS) !== null;
  return hasSaved ? loadFromStorage(STORAGE_KEY_BODY_WEIGHTS, []) : [];
}

export function clearLocalBodyWeights(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY_BODY_WEIGHTS);
}

function generateLocalId(): string {
  return `weight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useBodyWeightStore() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !!user;

  const [entries, setEntries] = useState<BodyWeightEntry[]>(() =>
    loadFromStorage(STORAGE_KEY_BODY_WEIGHTS, []),
  );

  // ログアウトを検知したら、直前のユーザーのデータが残らないようリセットする。
  // (useTrainingStoreと同じ理由: ログアウト直後の保存処理で前ユーザーの
  //  データがlocalStorageに書き戻され、次のアカウントに紛れ込むのを防ぐ)
  const wasAuthenticatedRef = useRef(false);
  useEffect(() => {
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      clearLocalBodyWeights();
      setEntries([]);
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    let cancelled = false;
    fetchBodyWeights()
      .then((serverEntries) => {
        if (!cancelled) setEntries(serverEntries);
      })
      .catch((err) => {
        console.error('[useBodyWeightStore] Failed to load from server', err);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (isAuthenticated) return;
    saveToStorage(STORAGE_KEY_BODY_WEIGHTS, entries);
  }, [entries, isAuthenticated]);

  const addEntry = useCallback(
    async (date: string, weight: number): Promise<void> => {
      if (isAuthenticated) {
        const created = await createBodyWeightApi({ date, weight });
        setEntries((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
        return;
      }
      const created: BodyWeightEntry = { id: generateLocalId(), date, weight };
      setEntries((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
    },
    [isAuthenticated],
  );

  const updateEntry = useCallback(
    async (id: string, patch: BodyWeightPatch): Promise<void> => {
      if (isAuthenticated) {
        const updated = await updateBodyWeightApi(id, patch);
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? updated : e)).sort((a, b) => a.date.localeCompare(b.date)),
        );
        return;
      }
      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? { ...e, ...patch } : e))
          .sort((a, b) => a.date.localeCompare(b.date)),
      );
    },
    [isAuthenticated],
  );

  const deleteEntry = useCallback(
    async (id: string): Promise<void> => {
      if (isAuthenticated) {
        await deleteBodyWeightApi(id);
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [isAuthenticated],
  );

  return { entries, addEntry, updateEntry, deleteEntry };
}