import type { Exercise, MuscleGroup, SetEntry, TrainingSession } from './type';
import { MUSCLE_GROUPS } from './exercises';
import { detectPlateau, getTopSet } from './plateau';
import { calculateStreak } from './streak';

export interface ExerciseRecommendation {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  hasHistory: boolean;
  suggestedWeight?: number;
  suggestedReps?: number;
  suggestedSets: number;
  reason: string;
}

export interface WorkoutRecommendation {
  restDaySuggested: boolean;
  restReason: string | null;
  recommendedGroups: MuscleGroup[];
  exercises: ExerciseRecommendation[];
  frequencyNote: string;
}

const RECOMMENDED_GROUP_COUNT = 2;
const EXERCISES_PER_GROUP = 2;
const DEFAULT_SETS = 3;
const REST_DAY_STREAK_THRESHOLD = 6;

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** 種目ごとの直近セッション一覧から、部位ごとの「最後に鍛えた日」を求める */
function getLastTrainedDateByGroup(
  sessions: TrainingSession[],
  exercises: Exercise[],
): Map<MuscleGroup, string> {
  const exerciseGroupMap = new Map(exercises.map((e) => [e.id, e.muscleGroup]));
  const map = new Map<MuscleGroup, string>();

  for (const session of sessions) {
    const group = exerciseGroupMap.get(session.exerciseId);
    if (!group) continue;
    const current = map.get(group);
    if (!current || session.date > current) {
      map.set(group, session.date);
    }
  }
  return map;
}

/**
 * 直近28日間の練習日数から、週あたりの平均頻度を算出しコメントを組み立てる。
 */
function buildFrequencyNote(sessions: TrainingSession[]): string {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 27);

  const distinctDates = new Set(
    sessions
      .filter((s) => new Date(`${s.date}T00:00:00`) >= since)
      .map((s) => s.date),
  );
  const avgPerWeek = Math.round((distinctDates.size / 4) * 10) / 10;

  if (distinctDates.size === 0) {
    return '直近4週間の記録がまだありません。無理のない範囲で再開しましょう。';
  }
  if (avgPerWeek >= 6) {
    return `直近4週間で週平均${avgPerWeek}回のペースです。休養日も意識的に確保しましょう。`;
  }
  if (avgPerWeek <= 1.5) {
    return `直近4週間で週平均${avgPerWeek}回のペースです。頻度を少し上げると記録が安定しやすくなります。`;
  }
  return `直近4週間で週平均${avgPerWeek}回のペースです。良い頻度が保てています。`;
}

/**
 * 停滞していない種目向けに、単純な漸進的過負荷ルールで次回のめやすを算出する。
 * ・回数がまだ少なければ(10回未満)、同じ重量のまま回数を1つ増やす
 * ・十分な回数(10回以上)ができていれば、重量を1段階上げて回数を少し戻す
 */
function suggestProgression(topSet: SetEntry): { weight: number; reps: number } {
  const step = topSet.weight >= 40 ? 2.5 : 1;
  if (topSet.reps < 10) {
    return { weight: topSet.weight, reps: topSet.reps + 1 };
  }
  return {
    weight: roundToStep(topSet.weight + step, step),
    reps: Math.max(8, topSet.reps - 2),
  };
}

function buildExerciseRecommendation(
  exercise: Exercise,
  sessionsForExercise: TrainingSession[],
): ExerciseRecommendation {
  if (sessionsForExercise.length === 0) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      hasHistory: false,
      suggestedSets: DEFAULT_SETS,
      reason: 'まだ記録がありません。フォーム確認を兼ねて、軽めの重量から始めましょう。',
    };
  }

  const sorted = [...sessionsForExercise].sort((a, b) => a.date.localeCompare(b.date));
  const lastSession = sorted[sorted.length - 1];
  const suggestedSets = lastSession.sets.length || DEFAULT_SETS;

  const plateau = detectPlateau(sessionsForExercise);
  if (plateau.isPlateaued && plateau.topSet) {
    const step = plateau.topSet.weight >= 40 ? 2.5 : 1;
    const suggestedWeight = Math.max(roundToStep(plateau.topSet.weight * 0.9, step), step);
    const suggestedReps = plateau.topSet.reps + 2;
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      hasHistory: true,
      suggestedWeight,
      suggestedReps,
      suggestedSets,
      reason: `直近${plateau.streak}回記録が動いていません。重量を落としてボリュームを確保しましょう。`,
    };
  }

  const topSet = getTopSet(lastSession.sets);
  if (!topSet) {
    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      muscleGroup: exercise.muscleGroup,
      hasHistory: false,
      suggestedSets: DEFAULT_SETS,
      reason: '有効なセット記録が見つかりませんでした。無理のない重量から試してみましょう。',
    };
  }

  const progression = suggestProgression(topSet);
  const reason =
    progression.weight === topSet.weight
      ? `前回${topSet.weight}kg×${topSet.reps}回でした。同じ重量のまま回数を+1狙ってみましょう。`
      : `前回${topSet.weight}kg×${topSet.reps}回でした。回数が十分なので重量を上げてみましょう。`;

  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    muscleGroup: exercise.muscleGroup,
    hasHistory: true,
    suggestedWeight: progression.weight,
    suggestedReps: progression.reps,
    suggestedSets,
    reason,
  };
}

/**
 * 部位バランス・休養日・種目ごとの重量/回数のめやすをまとめて算出する。
 * すべてクライアント側で完結するルールベースのロジック(AI呼び出しなし)。
 */
export function buildWorkoutRecommendation(
  sessions: TrainingSession[],
  exercises: Exercise[],
): WorkoutRecommendation {
  const streak = calculateStreak(sessions);
  const restDaySuggested = streak >= REST_DAY_STREAK_THRESHOLD;
  const restReason = restDaySuggested
    ? `${streak}日連続でトレーニングしています。今日は休養日にして回復を優先するのも良い選択です。`
    : null;

  const lastTrainedByGroup = getLastTrainedDateByGroup(sessions, exercises);
  const availableGroups = MUSCLE_GROUPS.filter((group) =>
    exercises.some((e) => e.muscleGroup === group),
  );

  // 「一度も記録が無い部位」を最優先、その次に「最後に鍛えた日が古い部位」の順で並べる
  const sortedGroups = [...availableGroups].sort((a, b) => {
    const dateA = lastTrainedByGroup.get(a);
    const dateB = lastTrainedByGroup.get(b);
    if (!dateA && !dateB) return 0;
    if (!dateA) return -1;
    if (!dateB) return 1;
    return dateA.localeCompare(dateB);
  });

  const recommendedGroups = sortedGroups.slice(0, RECOMMENDED_GROUP_COUNT);

  const sessionsByExercise = new Map<string, TrainingSession[]>();
  for (const s of sessions) {
    const list = sessionsByExercise.get(s.exerciseId) ?? [];
    list.push(s);
    sessionsByExercise.set(s.exerciseId, list);
  }

  const exerciseRecommendations: ExerciseRecommendation[] = [];
  for (const group of recommendedGroups) {
    const exercisesInGroup = exercises.filter((e) => e.muscleGroup === group);

    // 記録がある種目を「最後に鍛えた日が古い順」に並べ、無い種目は末尾に回す
    const sorted = [...exercisesInGroup].sort((a, b) => {
      const lastA = sessionsByExercise.get(a.id)?.slice(-1)[0]?.date;
      const lastB = sessionsByExercise.get(b.id)?.slice(-1)[0]?.date;
      if (!lastA && !lastB) return 0;
      if (!lastA) return 1;
      if (!lastB) return -1;
      return lastA.localeCompare(lastB);
    });

    for (const exercise of sorted.slice(0, EXERCISES_PER_GROUP)) {
      const sessionsForExercise = sessionsByExercise.get(exercise.id) ?? [];
      exerciseRecommendations.push(buildExerciseRecommendation(exercise, sessionsForExercise));
    }
  }

  return {
    restDaySuggested,
    restReason,
    recommendedGroups,
    exercises: exerciseRecommendations,
    frequencyNote: buildFrequencyNote(sessions),
  };
}