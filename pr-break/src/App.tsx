// pr-break/src/App.tsx
import { useEffect, useMemo, useState } from 'react';
import { ExercisePicker } from './components/training/ExercisePicker';
import { SessionForm } from './components/training/SessionForm';
import { WorkoutForm } from './components/training/WorkoutForm';
import { RecommendedWorkout } from './components/training/RecommendedWorkout';
import { ExerciseHistory } from './components/training/ExerciseHistory';
import { WorkoutHistory } from './components/training/WorkoutHistory';
import { ProgressChart } from './components/training/ProgressChart';
import { PlateauBanner } from './components/training/PlateauBanner';
import { TrainingCalendar } from './components/training/TrainingCalendar';
import { WeeklyVolume } from './components/training/WeeklyVolume';
import { PersonalRecordsBoard } from './components/training/PersonalRecordsBoard';
import { BodyWeightPanel } from './components/training/BodyWeightPanel';
import { WeightProgressChart } from './components/training/WeightProgressChart';
import { AuthForm } from './components/auth/AuthForm';
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm';
import { ResetPasswordForm } from './components/auth/ResetPasswordForm';
import { AccountSettings } from './components/account/AccountSettings';
import { useTrainingStore } from './lib/useTrainingStore';
import { useBodyWeightStore } from './lib/useBodyWeightStore';
import { useAuth } from './lib/AuthContext';
import { buildSuggestion, detectPlateau } from './lib/plateau';
import { calculateStreak } from './lib/streak';
import { getWeeklyVolumeByMuscleGroup } from './lib/volume';
import { getAllTimeBestOneRepMax } from './lib/oneRepMax';
import './App.css';

type EntryMode = 'recommend' | 'single' | 'workout';
type ViewMode = 'byExercise' | 'byWorkout' | 'calendar' | 'volume' | 'records' | 'weight' | 'account';
type AuthScreen = 'login' | 'forgotPassword';

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'byExercise', label: '種目別' },
  { key: 'byWorkout', label: 'ワークアウト別' },
  { key: 'calendar', label: 'カレンダー' },
  { key: 'volume', label: '週間ボリューム' },
  { key: 'records', label: 'PR一覧' },
  { key: 'weight', label: '体重' },
  { key: 'account', label: 'アカウント' },
];

function App() {
  const { user, isLoading: isAuthLoading, updateGoalWeight } = useAuth();
  const {
    exercises,
    sessions: allSessions,
    addExercise,
    updateExercise,
    deleteExercise,
    addSession,
    addWorkout,
    updateSession,
    deleteSession,
    getSessions,
  } = useTrainingStore();
  const {
    entries: bodyWeights,
    addEntry: addBodyWeightEntry,
    updateEntry: updateBodyWeightEntry,
    deleteEntry: deleteBodyWeightEntry,
  } = useBodyWeightStore();

  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? '');
  const [entryMode, setEntryMode] = useState<EntryMode>('recommend');
  const [viewMode, setViewMode] = useState<ViewMode>('byExercise');
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  const [resetToken] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('resetToken'),
  );

  useEffect(() => {
    if (exercises.length === 0) return;
    if (!exercises.some((e) => e.id === selectedId)) {
      setSelectedId(exercises[0].id);
    }
  }, [exercises, selectedId]);

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

  if (resetToken) {
    return (
      <div className="tl-app">
        <header className="tl-header">
          <h1 className="tl-h1">RINGS</h1>
        </header>
        <div style={{ padding: '0 24px' }}>
          <ResetPasswordForm
            token={resetToken}
            onDone={() => {
              window.history.replaceState({}, '', window.location.pathname);
              window.location.reload();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tl-app">
      <header className="tl-header">
        <h1 className="tl-h1">RINGS</h1>
        <p className="tl-tagline">
          同じ重量×回数が続いたら、教えてくれる。落として、増やして、また伸ばす。
        </p>
        {user && (
          <div className="tl-account-bar">
            <span className="tl-account-email">{user.email}</span>
          </div>
        )}
      </header>

      {!user ? (
        <div style={{ padding: '0 24px' }}>
          {authScreen === 'login' ? (
            <AuthForm onForgotPassword={() => setAuthScreen('forgotPassword')} />
          ) : (
            <ForgotPasswordForm onBack={() => setAuthScreen('login')} />
          )}
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
                  className={`tl-mode-tab${entryMode === 'recommend' ? ' tl-mode-tab--active' : ''}`}
                  onClick={() => setEntryMode('recommend')}
                >
                  今日のおすすめ
                </button>
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

              {entryMode === 'recommend' && (
                <RecommendedWorkout sessions={allSessions} exercises={exercises} />
              )}

              {entryMode === 'single' && (
                <>
                  <ExercisePicker
                    exercises={exercises}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onAddExercise={addExercise}
                    onUpdateExercise={updateExercise}
                    onDeleteExercise={deleteExercise}
                  />
                  <PlateauBanner suggestion={suggestion} streak={plateau.streak} />
                  <SessionForm
                    exerciseId={selectedId}
                    exerciseName={selectedExercise?.name ?? ''}
                    onSubmit={addSession}
                  />
                </>
              )}

              {entryMode === 'workout' && (
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
              {viewMode === 'weight' && (
                <>
                  <WeightProgressChart bodyWeights={bodyWeights} sessions={allSessions} />
                  <BodyWeightPanel
                    entries={bodyWeights}
                    goalWeight={user.goalWeight}
                    onAddEntry={addBodyWeightEntry}
                    onUpdateEntry={updateBodyWeightEntry}
                    onDeleteEntry={deleteBodyWeightEntry}
                    onUpdateGoalWeight={updateGoalWeight}
                  />
                </>
              )}
              {viewMode === 'account' && <AccountSettings />}
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