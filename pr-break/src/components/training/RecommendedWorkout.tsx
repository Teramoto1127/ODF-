import { useMemo } from 'react';
import type { Exercise, TrainingSession } from '../../lib/type';
import { buildWorkoutRecommendation } from '../../lib/recommendation';

interface RecommendedWorkoutProps {
  sessions: TrainingSession[];
  exercises: Exercise[];
}

export function RecommendedWorkout({ sessions, exercises }: RecommendedWorkoutProps) {
  const recommendation = useMemo(
    () => buildWorkoutRecommendation(sessions, exercises),
    [sessions, exercises],
  );

  if (recommendation.exercises.length === 0 && !recommendation.restDaySuggested) {
    return (
      <div className="tl-card tl-empty">
        <p className="tl-empty-title">おすすめを作成できません</p>
        <p className="tl-empty-text">種目を登録すると、部位バランスを見たおすすめが表示されます。</p>
      </div>
    );
  }

  return (
    <div className="tl-recommend">
      {recommendation.restDaySuggested && (
        <div className="tl-banner tl-banner--alert tl-recommend-rest">
          <span className="tl-banner-icon" aria-hidden="true">
            ▲
          </span>
          <div>
            <p className="tl-banner-title">休養日のご提案</p>
            <p className="tl-banner-text">{recommendation.restReason}</p>
          </div>
        </div>
      )}

      <div className="tl-card">
        <div className="tl-card-heading">
          <span className="tl-eyebrow">今日のおすすめ</span>
          <h2 className="tl-h2">部位バランスから見た提案</h2>
        </div>

        <div className="tl-recommend-groups">
          {recommendation.recommendedGroups.map((group) => (
            <span className="tl-recommend-group-chip" key={group}>
              {group}
            </span>
          ))}
        </div>

        <div className="tl-recommend-list">
          {recommendation.exercises.map((ex) => (
            <div className="tl-recommend-card" key={ex.exerciseId}>
              <div className="tl-recommend-card-header">
                <span className="tl-recommend-exercise-name">{ex.exerciseName}</span>
                <span className="tl-recommend-group-tag">{ex.muscleGroup}</span>
              </div>

              {ex.hasHistory && ex.suggestedWeight !== undefined ? (
                <p className="tl-recommend-metrics">
                  {ex.suggestedWeight}kg × {ex.suggestedReps}回 × {ex.suggestedSets}セット
                </p>
              ) : (
                <p className="tl-recommend-metrics tl-recommend-metrics--muted">
                  {ex.suggestedSets}セットのめやす
                </p>
              )}

              <p className="tl-recommend-reason">{ex.reason}</p>
            </div>
          ))}
        </div>

        <p className="tl-volume-note">{recommendation.frequencyNote}</p>
      </div>
    </div>
  );
}