import { useMemo, useState } from 'react';
import { ExercisePicker } from './components/training/ExercisePicker';
import { SessionForm } from './components/training/SessionForm';
import { ExerciseHistory } from './components/training/ExerciseHistory';
import { PlateauBanner } from './components/training/PlateauBanner';
import { AuthForm } from './components/auth/AuthForm';
import { useTrainingStore } from './lib/useTrainingStore';
import { useAuth } from './lib/AuthContext';
import { buildSuggestion, detectPlateau } from './lib/plateau';
import './App.css';

function App() {
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const { exercises, addExercise, addSession, getSessions } = useTrainingStore();
  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? '');

  const selectedExercise = exercises.find((e) => e.id === selectedId);
  const sessions = getSessions(selectedId);

  const plateau = useMemo(() => detectPlateau(sessions), [sessions]);
  const suggestion = useMemo(() => buildSuggestion(plateau), [plateau]);

  // Cookie確認中は画面がちらつかないよう何も出さない
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
        <AuthForm />
      ) : (
        <main className="tl-main">
          <section className="tl-panel">
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
          </section>

          <section className="tl-panel">
            <ExerciseHistory sessions={sessions} plateau={plateau} />
          </section>
        </main>
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