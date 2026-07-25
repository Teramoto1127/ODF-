import type { Exercise } from './type';

export const PRESET_EXERCISES: Exercise[] = [
  { id: 'bench-press', name: 'ベンチプレス', muscleGroup: '胸' },
  { id: 'incline-db-press', name: 'インクラインダンベルプレス', muscleGroup: '胸' },
  { id: 'squat', name: 'スクワット', muscleGroup: '脚' },
  { id: 'leg-press', name: 'レッグプレス', muscleGroup: '脚' },
  { id: 'deadlift', name: 'デッドリフト', muscleGroup: '背中' },
  { id: 'barbell-row', name: 'バーベルロウ', muscleGroup: '背中' },
  { id: 'lat-pulldown', name: 'ラットプルダウン', muscleGroup: '背中' },
  { id: 'overhead-press', name: 'オーバーヘッドプレス', muscleGroup: '肩' },
  { id: 'side-raise', name: 'サイドレイズ', muscleGroup: '肩' },
  { id: 'dumbbell-curl', name: 'ダンベルカール', muscleGroup: '腕' },
  { id: 'tricep-pushdown', name: 'トライセッププッシュダウン', muscleGroup: '腕' },
];

export const MUSCLE_GROUPS: Exercise['muscleGroup'][] = [
  '胸',
  '背中',
  '脚',
  '肩',
  '腕',
  'その他',
];