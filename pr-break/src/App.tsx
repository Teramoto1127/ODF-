import { useMemo, useState } from 'react';
import { ExercisePicker } from './components/training/ExercisePicker';
import { SessionForm } from './components/training/SessionForm';
import { WorkoutForm } from './components/training/WorkoutForm';
import { ExerciseHistory } from './components/training/ExerciseHistory';
import { WorkoutHistory } from './components/training/WorkoutHistory';
import { ProgressChart } from './components/training/ProgressChart';
import { PlateauBanner } from './components/training/PlateauBanner';
import { TrainingCalendar } from './components/training/TrainingCalendar';
import { WeeklyVolume } from './components/training/WeeklyVolume';
import { PersonalRecordsBoard } from './components/training/PersonalRecordsBoard';
import { AuthForm } from './components/auth/AuthForm';
import { useTrainingStore } from './lib/useTrainingStore';
import { useAuth } from './lib/AuthContext';
import { buildSuggestion, detectPlateau } from './lib/plateau';
import { calculateStreak } from './lib/streak';
import { getWeeklyVolumeByMuscleGroup } from './lib/volume';
import { getAllTimeBestOneRepMax } from './lib/oneRepMax';
import './App.css';

type EntryMode = 'single' | 'workout';
type ViewMode = 'byExercise' | 'byWorkout' | 'calendar' | 'volume' | 'records';

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'byExercise', label: '種目別' },
  { key: 'byWorkout', label: 'ワークアウト別' },
  { key: 'calendar', label: 'カレンダー' },
  { key: 'volume', label: '週間ボリューム' },
  { key: 'records', label: 'PR一覧' },
];

function App() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const {
    exercises,
    sessions: allSessions,
    addExercise,
    addSession,
    addWorkout,
    updateSession,
    deleteSession,
    getSessions,
  } = useTrainingStore();
  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? '');
  const [entryMode, setEntryMode] = useState<EntryMode>('single');
  const [viewMode, setViewMode] = useState<ViewMode>('byExercise');

  const selectedExercise = exercises.find((e) => e.id === selectedId);
  const sessions = getSessions(selectedId);

  const plateau = useMemo(() => detectPlateau(sessions), [sessions]);
  const suggestion = useMemo(() => buildSuggestion(plateau), [plateau]);

  const streak = useMemo(() => calculateStreak(allSessions), [allSessions]);
  const weeklyVolumeTotal = useMemo(() => {
    const byGroup = getWeeklyVolumeByMuscleGroup(allSessions, exercises);
    return byGroup.reduce((sum, g) => sum + g.volume, 0);
  }, [allSessions, exercises]);
  const bestOneRepMax = useMemo(() => getAllTimeBestOneRepMax(allSessions), [allSessions]);

  if (isAuthLoading) {
    return null;
  }

  return (
    <div className="tl-app">
      <header className="tl-header">
        <span className="tl-eyebrow">STRENGTH LOG</span>
        <h1 className="tl-h1">負荷ログ</h1>
        <p className="tl-tagline">
          同じ重量×回数が続いたら、教えてくれる。落として、増やして、また伸ばす。
        </p>
        {user && (
          <div className="tl-account-bar">
            <span className="tl-account-email">{user.email}</span>
            <button type="button" className="tl-btn tl-btn--ghost" onClick={() => logout()}>
              ログアウト
            </button>
          </div>
        )}
      </header>

      {!user ? (
        <div style={{ padding: '0 24px' }}>
          <AuthForm />
        </div>
      ) : (
        <>
          <div className="tl-stats-row">
            <div className="tl-stat-card">
              <p className="tl-stat-label">継続日数</p>
              <p className="tl-stat-value">
                {streak}
                <span className="tl-stat-unit">日</span>
              </p>
            </div>
            <div className="tl-stat-card">
              <p className="tl-stat-label">週間ボリューム</p>
              <p className="tl-stat-value">
                {weeklyVolumeTotal.toLocaleString()}
                <span className="tl-stat-unit">kg</span>
              </p>
            </div>
            <div className="tl-stat-card tl-stat-card--dark">
              <p className="tl-stat-label">推定1RM 自己ベスト</p>
              <p className="tl-stat-value">
                {bestOneRepMax}
                <span className="tl-stat-unit">kg</span>
              </p>
            </div>
          </div>

          <main className="tl-main">
            <section className="tl-panel">
              <div className="tl-mode-tabs">
                <button
                  type="button"
                  className={`tl-mode-tab${entryMode === 'single' ? ' tl-mode-tab--active' : ''}`}
                  onClick={() => setEntryMode('single')}
                >
                  1種目ずつ記録
                </button>
                <button
                  type="button"
                  className={`tl-mode-tab${entryMode === 'workout' ? ' tl-mode-tab--active' : ''}`}
                  onClick={() => setEntryMode('workout')}
                >
                  ワークアウトでまとめて記録
                </button>
              </div>

              {entryMode === 'single' ? (
                <>
                  <ExercisePicker
                    exercises={exercises}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onAddExercise={addExercise}
                  />
                  <PlateauBanner suggestion={suggestion} streak={plateau.streak} />
                  <SessionForm
                    exerciseId={selectedId}
                    exerciseName={selectedExercise?.name ?? ''}
                    onSubmit={addSession}
                  />
                </>
              ) : (
                <WorkoutForm exercises={exercises} onSubmit={addWorkout} />
              )}
            </section>

            <section className="tl-panel">
              <div className="tl-mode-tabs tl-mode-tabs--wrap">
                {VIEW_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`tl-mode-tab${viewMode === tab.key ? ' tl-mode-tab--active' : ''}`}
                    onClick={() => setViewMode(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {viewMode === 'byExercise' && (
                <>
                  <ProgressChart sessions={sessions} />
                  <ExerciseHistory
                    sessions={sessions}
                    plateau={plateau}
                    onUpdateSession={updateSession}
                    onDeleteSession={deleteSession}
                  />
                </>
              )}
              {viewMode === 'byWorkout' && (
                <WorkoutHistory
                  sessions={allSessions}
                  exercises={exercises}
                  onUpdateSession={updateSession}
                  onDeleteSession={deleteSession}
                />
              )}
              {viewMode === 'calendar' && <TrainingCalendar sessions={allSessions} />}
              {viewMode === 'volume' && (
                <WeeklyVolume sessions={allSessions} exercises={exercises} />
              )}
              {viewMode === 'records' && (
                <PersonalRecordsBoard sessions={allSessions} exercises={exercises} />
              )}
            </section>
          </main>
        </>
      )}

      <footer className="tl-footer">
        <p>
          {user
            ? 'ログイン中は記録がサーバーに保存されます。'
            : 'ログインすると記録がどの端末からでも見られるようになります。'}
        </p>
      </footer>
    </div>
  );
}

export default App;