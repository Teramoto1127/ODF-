export type MuscleGroup = '胸' | '背中' | '脚' | '肩' | '腕' | 'その他';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom?: boolean;
}

export interface SetEntry {
  weight: number; // kg
  reps: number;
}

export interface TrainingSession {
  id: string;
  exerciseId: string;
  date: string; // ISO yyyy-mm-dd
  sets: SetEntry[];
  note?: string;
}

export interface PlateauResult {
  isPlateaued: boolean;
  streak: number;
  topSet: SetEntry | null;
}

export type SuggestionType = 'deload' | 'none';

export interface Suggestion {
  type: SuggestionType;
  message: string;
  suggestedWeight?: number;
  suggestedReps?: number;
}