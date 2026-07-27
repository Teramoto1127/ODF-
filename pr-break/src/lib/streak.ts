// src/lib/streak.ts
import type { TrainingSession } from './type';

export interface DayActivity {
  /** ISO yyyy-mm-dd */
  date: string;
  /** その日に記録されたセッション数 */
  sessionCount: number;
}

/** セッション一覧から、日付ごとの活動有無をまとめる */
export function buildActivityMap(sessions: TrainingSession[]): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  for (const s of sessions) {
    const existing = map.get(s.date);
    if (existing) {
      existing.sessionCount += 1;
    } else {
      map.set(s.date, { date: s.date, sessionCount: 1 });
    }
  }
  return map;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * 今日から遡って、記録がある日が何日連続で続いているかを数える。
 * 今日まだ記録が無い場合は「昨日から遡って連続しているか」を見る
 * （その日のうちにまだ記録していないだけでストリークが切れたと
 *   表示されるのを防ぐため）。
 */
export function calculateStreak(sessions: TrainingSession[]): number {
  const activityMap = buildActivityMap(sessions);
  if (activityMap.size === 0) return 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  // 今日の記録がまだ無ければ、判定の起点を昨日にずらす
  if (!activityMap.has(toISODate(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!activityMap.has(toISODate(cursor))) {
      return 0;
    }
  }

  let streak = 0;
  while (activityMap.has(toISODate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** 指定した年月(1-indexed month)のカレンダー用に、日付ごとの活動有無を並べた配列を作る */
export function buildMonthCalendar(
  sessions: TrainingSession[],
  year: number,
  month: number,
): { date: string; day: number; hasActivity: boolean; isFuture: boolean }[] {
  const activityMap = buildActivityMap(sessions);
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: { date: string; day: number; hasActivity: boolean; isFuture: boolean }[] = [];
  for (let day = 1; day <= daysInMonth; day += 1) {
    const d = new Date(year, month - 1, day);
    const iso = toISODate(d);
    days.push({
      date: iso,
      day,
      hasActivity: activityMap.has(iso),
      isFuture: d > today,
    });
  }
  return days;
}