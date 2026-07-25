// src/lib/api.ts
import type { Exercise, MuscleGroup, TrainingSession } from './type';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiErrorBody {
  error: string;
}

/**
 * 共通のfetchラッパー。
 * credentials: 'include' でCookie(JWT)を毎回送受信する。
 * エラー時はサーバーが返す { error: string } を優先してメッセージ化する。
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });

  if (!res.ok) {
    let message = `リクエストに失敗しました (${res.status})`;
    try {
      const body = (await res.json()) as ApiErrorBody;
      if (body.error) message = body.error;
    } catch {
      // JSON以外のエラーレスポンス(サーバーダウン時のHTML等)は無視してデフォルト文言を使う
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface ApiUser {
  id: string;
  email: string;
}

export interface MigratePayload {
  exercises: Exercise[];
  sessions: TrainingSession[];
}

export function registerUser(email: string, password: string, migrate?: MigratePayload) {
  return request<ApiUser>('/api/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, migrate }),
  });
}

export function loginUser(email: string, password: string) {
  return request<ApiUser>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function logoutUser() {
  return request<void>('/api/logout', { method: 'POST' });
}

export function fetchMe() {
  return request<ApiUser>('/api/me');
}

export function fetchExercises() {
  return request<Exercise[]>('/api/exercises');
}

export function createExerciseApi(name: string, muscleGroup: MuscleGroup) {
  return request<Exercise>('/api/exercises', {
    method: 'POST',
    body: JSON.stringify({ name, muscleGroup }),
  });
}

export function fetchSessions() {
  return request<TrainingSession[]>('/api/sessions');
}

export function createSessionApi(session: Omit<TrainingSession, 'id'>) {
  return request<TrainingSession>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}