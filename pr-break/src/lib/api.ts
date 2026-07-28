import type { Exercise, MuscleGroup, TrainingSession } from './type';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

interface ApiErrorBody {
  error: string;
}

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
      // JSON以外のエラーレスポンスは無視してデフォルト文言を使う
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

// --- パスワードリセット ---

export function requestPasswordReset(email: string) {
  return request<{ ok: true }>('/api/password-reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function confirmPasswordReset(token: string, newPassword: string) {
  return request<{ ok: true }>('/api/password-reset/confirm', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}

// --- アカウント設定 ---

export function changePasswordApi(currentPassword: string, newPassword: string) {
  return request<{ ok: true }>('/api/account/password', {
    method: 'PATCH',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function deleteAccountApi() {
  return request<void>('/api/account', { method: 'DELETE' });
}

// --- 種目 ---

export function fetchExercises() {
  return request<Exercise[]>('/api/exercises');
}

export function createExerciseApi(name: string, muscleGroup: MuscleGroup) {
  return request<Exercise>('/api/exercises', {
    method: 'POST',
    body: JSON.stringify({ name, muscleGroup }),
  });
}

export type ExercisePatch = Partial<Pick<Exercise, 'name' | 'muscleGroup'>>;

export function updateExerciseApi(id: string, patch: ExercisePatch) {
  return request<Exercise>(`/api/exercises/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteExerciseApi(id: string) {
  return request<void>(`/api/exercises/${id}`, { method: 'DELETE' });
}

// --- セッション ---

export function fetchSessions() {
  return request<TrainingSession[]>('/api/sessions');
}

export interface SessionFilter {
  exerciseId?: string;
  from?: string;
  to?: string;
}

export function fetchSessionsFiltered(filter: SessionFilter) {
  const params = new URLSearchParams();
  if (filter.exerciseId) params.set('exerciseId', filter.exerciseId);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  return request<TrainingSession[]>(`/api/sessions?${params.toString()}`);
}

export function createSessionApi(session: Omit<TrainingSession, 'id'>) {
  return request<TrainingSession>('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(session),
  });
}

export type SessionPatch = Partial<Pick<TrainingSession, 'date' | 'sets' | 'note'>>;

export function updateSessionApi(id: string, patch: SessionPatch) {
  return request<TrainingSession>(`/api/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function deleteSessionApi(id: string) {
  return request<void>(`/api/sessions/${id}`, { method: 'DELETE' });
}