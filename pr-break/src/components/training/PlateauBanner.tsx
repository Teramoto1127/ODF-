import type { Suggestion } from '../../lib/type';

interface PlateauBannerProps {
  suggestion: Suggestion;
  streak: number;
}

export function PlateauBanner({ suggestion, streak }: PlateauBannerProps) {
  if (suggestion.type === 'none') {
    return (
      <div className="tl-banner tl-banner--steady">
        <span className="tl-banner-icon" aria-hidden="true">
          ●
        </span>
        <p className="tl-banner-text">記録は順調に更新中です。このまま同じ方向で続けましょう。</p>
      </div>
    );
  }

  return (
    <div className="tl-banner tl-banner--alert" role="status">
      <span className="tl-banner-icon" aria-hidden="true">
        ▲
      </span>
      <div>
        <p className="tl-banner-title">停滞を検知（{streak}回連続）</p>
        <p className="tl-banner-text">{suggestion.message}</p>
        {suggestion.suggestedWeight !== undefined && (
          <p className="tl-banner-next">
            次回の目安:{' '}
            <strong>
              {suggestion.suggestedWeight}kg × {suggestion.suggestedReps}回
            </strong>
          </p>
        )}
      </div>
    </div>
  );
}