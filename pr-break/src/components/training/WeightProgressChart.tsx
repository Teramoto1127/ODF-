import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BodyWeightEntry, TrainingSession } from '../../lib/type';
import { buildWeightVolumeSeries } from '../../lib/weightProgress';

interface WeightProgressChartProps {
  bodyWeights: BodyWeightEntry[];
  sessions: TrainingSession[];
}

export function WeightProgressChart({ bodyWeights, sessions }: WeightProgressChartProps) {
  const data = useMemo(() => buildWeightVolumeSeries(bodyWeights, sessions, 10), [bodyWeights, sessions]);

  const hasAnyWeight = data.some((d) => d.weight !== null);

  if (!hasAnyWeight) {
    return (
      <div className="tl-card tl-chart-empty">
        <p className="tl-empty-text">体重を記録すると、ここにトレーニング量と重ねた推移グラフが表示されます。</p>
      </div>
    );
  }

  return (
    <div className="tl-card tl-chart">
      <div className="tl-card-heading">
        <span className="tl-eyebrow">推移</span>
        <h2 className="tl-h2">体重 × 週間ボリューム</h2>
      </div>
      <div className="tl-chart-body">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="var(--tl-line)" strokeDasharray="3 3" />
            <XAxis dataKey="weekLabel" tick={{ fill: 'var(--tl-chalk-dim)', fontSize: 11 }} />
            <YAxis
              yAxisId="volume"
              orientation="right"
              tick={{ fill: 'var(--tl-chalk-dim)', fontSize: 10 }}
              width={50}
            />
            <YAxis
              yAxisId="weight"
              orientation="left"
              domain={['dataMin - 2', 'dataMax + 2']}
              tick={{ fill: 'var(--tl-chalk-dim)', fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--tl-surface-2)',
                border: '1px solid var(--tl-line)',
                borderRadius: 6,
              }}
              labelStyle={{ color: 'var(--tl-chalk)' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              yAxisId="volume"
              dataKey="volume"
              name="週間ボリューム(kg)"
              fill="var(--tl-line)"
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="weight"
              name="体重(kg)"
              stroke="var(--tl-effort)"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}