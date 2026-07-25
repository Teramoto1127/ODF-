// src/lib/oneRepMax.ts
import type { SetEntry, TrainingSession } from './type';

/**
 * Epley式による推定1RM（1回だけ挙げられる最大重量）の計算。
 * reps=1のときはweightそのものになる。
 * 高rep(目安15回超)になるほど誤差が大きくなる点に留意。
 */
export function estimateOneRepMax(set: SetEntry): number {
  if (set.reps <= 0 || set.weight <= 0) return 0;
  const raw = set.weight * (1 + set.reps / 30);
  return Math.round(raw * 10) / 10; // 小数第1位まで
}

/** 1セッション内で最も高い推定1RMを返す */
export function getSessionBestOneRepMax(session: TrainingSession): number {
  return session.sets.reduce((best, set) => Math.max(best, estimateOneRepMax(set)), 0);
}

/** 複数セッションの中から、これまでの最高推定1RMを返す */
export function getAllTimeBestOneRepMax(sessions: TrainingSession[]): number {
  return sessions.reduce((best, s) => Math.max(best, getSessionBestOneRepMax(s)), 0);
}