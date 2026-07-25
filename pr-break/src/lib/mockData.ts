import type { TrainingSession } from './type';

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * 初回表示用のサンプル記録。
 * ベンチプレスはあえて3回連続で60kg×8回のまま停滞させ、
 * 提案バナーの挙動をすぐ確認できるようにしている。
 */
export const SEED_SESSIONS: TrainingSession[] = [
  {
    id: 'seed-bench-1',
    exerciseId: 'bench-press',
    date: daysAgo(21),
    sets: [
      { weight: 60, reps: 8 },
      { weight: 60, reps: 7 },
    ],
  },
  {
    id: 'seed-bench-2',
    exerciseId: 'bench-press',
    date: daysAgo(14),
    sets: [
      { weight: 60, reps: 8 },
      { weight: 57.5, reps: 8 },
    ],
  },
  {
    id: 'seed-bench-3',
    exerciseId: 'bench-press',
    date: daysAgo(7),
    sets: [
      { weight: 60, reps: 8 },
      { weight: 60, reps: 6 },
    ],
  },
  {
    id: 'seed-squat-1',
    exerciseId: 'squat',
    date: daysAgo(14),
    sets: [{ weight: 80, reps: 5 }],
  },
  {
    id: 'seed-squat-2',
    exerciseId: 'squat',
    date: daysAgo(7),
    sets: [{ weight: 82.5, reps: 5 }],
  },
];