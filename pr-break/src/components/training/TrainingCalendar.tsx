// src/components/training/TrainingCalendar.tsx
import { useMemo, useState } from 'react';
import type { TrainingSession } from '../../lib/type';
import { buildMonthCalendar, calculateStreak } from '../../lib/streak';

interface TrainingCalendarProps {
  sessions: TrainingSession[];
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function TrainingCalendar({ sessions }: TrainingCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-indexed

  const streak = useMemo(() => calculateStreak(sessions), [sessions]);
  const days = useMemo(() => buildMonthCalendar(sessions, year, month), [sessions, year, month]);

  // 月初の曜日ぶん、カレンダー先頭に空白セルを入れて曜日の列を揃える
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leadingBlanks = Array.from({ length: firstWeekday });

  function goToPrevMonth() {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  }

  return (
    <div className="tl-card tl-calendar">
      <div className="tl-card-heading tl-calendar-heading">
        <div>
          <span className="tl-eyebrow">継続</span>
          <h2 className="tl-h2">トレーニングカレンダー</h2>
        </div>
        {streak > 0 && (
          <p className="tl-streak-badge">
            🔥 <strong>{streak}</strong>日連続
          </p>
        )}
      </div>

      <div className="tl-calendar-nav">
        <button type="button" className="tl-btn tl-btn--ghost" onClick={goToPrevMonth}>
          ←
        </button>
        <span className="tl-calendar-month-label">
          {year}年{month}月
        </span>
        <button type="button" className="tl-btn tl-btn--ghost" onClick={goToNextMonth}>
          →
        </button>
      </div>

      <div className="tl-calendar-grid">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w} className="tl-calendar-weekday">
            {w}
          </div>
        ))}
        {leadingBlanks.map((_, i) => (
          <div key={`blank-${i}`} className="tl-calendar-cell tl-calendar-cell--blank" />
        ))}
        {days.map((d) => (
          <div
            key={d.date}
            className={`tl-calendar-cell${d.hasActivity ? ' tl-calendar-cell--active' : ''}${
              d.isFuture ? ' tl-calendar-cell--future' : ''
            }`}
            title={d.hasActivity ? `${d.date}: 記録あり` : d.date}
          >
            {d.day}
          </div>
        ))}
      </div>
    </div>
  );
}