import type { SetEntry } from '../../lib/type';

interface SetBarsProps {
  sets: SetEntry[];
  /** このエクササイズの履歴全体での最大重量。バーの高さの基準にする */
  maxWeight: number;
  /** 停滞判定に使われた「動いていない」代表セットと同じものを目立たせる */
  highlight?: SetEntry | null;
}

const MIN_HEIGHT_PCT = 18;
const MAX_HEIGHT_PCT = 100;

function isSameSet(a: SetEntry, b: SetEntry | null | undefined): boolean {
  return !!b && a.weight === b.weight && a.reps === b.reps;
}

/**
 * セットごとに1本の「バー」を描画する。バーの高さ = 重量、
 * バー上に並ぶチョークのタリー（|）= 回数。
 * 停滞の代表セットと一致するバーは効果色でハイライトする。
 */
export function SetBars({ sets, maxWeight, highlight }: SetBarsProps) {
  const safeMax = maxWeight > 0 ? maxWeight : 1;

  return (
    <div className="tl-setbars" role="list" aria-label="セット記録">
      {sets.map((set, i) => {
        const heightPct = Math.max(
          MIN_HEIGHT_PCT,
          Math.min(MAX_HEIGHT_PCT, (set.weight / safeMax) * MAX_HEIGHT_PCT),
        );
        const stuck = isSameSet(set, highlight);
        return (
          <div className="tl-setbar" role="listitem" key={i}>
            <div className="tl-setbar-ticks" aria-hidden="true">
              {Array.from({ length: Math.min(set.reps, 12) }).map((_, tickIdx) => (
                <span key={tickIdx} className="tl-tick" />
              ))}
            </div>
            <div
              className={`tl-setbar-fill${stuck ? ' tl-setbar-fill--stuck' : ''}`}
              style={{ height: `${heightPct}%` }}
            />
            <div className="tl-setbar-label">
              {set.weight}
              <span className="tl-setbar-unit">kg</span>
              <span className="tl-setbar-sep">×</span>
              {set.reps}
            </div>
          </div>
        );
      })}
    </div>
  );
}