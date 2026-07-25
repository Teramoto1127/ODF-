// src/components/training/ProgressChart.tsx
import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrainingSession } from '../../lib/type';
import { getSessionBestOneRepMax } from '../../lib/oneRepMax';

interface ProgressChartProps {
  sessions: TrainingSession[];
}

type Period = '1m' | '3m' | '6m' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  '1m': '直近1ヶ月',
  '3m': '直近3ヶ月',
  '6m': '直近6ヶ月',
  all: '全期間',
};

function periodToStartDate(period: Period): Date | null {
  if (period === 'all') return null;
  const months = { '1m': 1, '3m': 3, '6m': 6 }[period];
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

export function ProgressChart({ sessions }: ProgressChartProps) {
  const [period, setPeriod] = useState<Period>('3m');

  const chartData = useMemo(() => {
    const startDate = periodToStartDate(period);
    return [...sessions]
      .filter((s) => !startDate || new Date(`${s.date}T00:00:00`) >= startDate)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((s) => ({
        date: s.date,
        oneRepMax: getSessionBestOneRepMax(s),
      }));
  }, [sessions, period]);

  if (sessions.length < 2) {
    return (
      <div className="tl-card tl-chart-empty">
        <p className="tl-empty-text">記録が2件以上たまると、ここに推移グラフが表示されます。</p>
      </div>
    );
  }

  return (
    <div className="tl-card tl-chart">
      <div className="tl-card-heading tl-chart-heading">
        <div>
          <span className="tl-eyebrow">推移</span>
          <h2 className="tl-h2">推定1RMの推移</h2>
        </div>
        <div className="tl-period-tabs">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`tl-period-tab${period === p ? ' tl-period-tab--active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="tl-chart-body">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--tl-line)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: 'var(--tl-chalk-dim)', fontSize: 11 }}
              tickFormatter={(d: string) => {
                const date = new Date(`${d}T00:00:00`);
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis tick={{ fill: 'var(--tl-chalk-dim)', fontSize: 11 }} unit="kg" />
            <Tooltip
              contentStyle={{
                background: 'var(--tl-surface-2)',
                border: '1px solid var(--tl-line)',
                borderRadius: 6,
              }}
              labelStyle={{ color: 'var(--tl-chalk)' }}
              formatter={(value) => [`${value}kg`, '推定1RM']}
            />
            <Line
              type="monotone"
              dataKey="oneRepMax"
              stroke="var(--tl-steady)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}