import { useMemo, useState } from 'react';
import { ExercisePicker } from './components/training/ExercisePicker';
import { SessionForm } from './components/training/SessionForm';
import { ExerciseHistory } from './components/training/ExerciseHistory';
import { PlateauBanner } from './components/training/PlateauBanner';
import { useTrainingStore } from './lib/useTrainingStore';
import { buildSuggestion, detectPlateau } from './lib/plateau';
import './App.css';

function App() {
  const { exercises, addExercise, addSession, getSessions } = useTrainingStore();
  const [selectedId, setSelectedId] = useState(exercises[0]?.id ?? '');

  const selectedExercise = exercises.find((e) => e.id === selectedId);
  const sessions = getSessions(selectedId);

  const plateau = useMemo(() => detectPlateau(sessions), [sessions]);
  const suggestion = useMemo(() => buildSuggestion(plateau), [plateau]);

  return (
    <div className="tl-app">
      <header className="tl-header">
        <span className="tl-eyebrow">STRENGTH LOG</span>
        <h1 className="tl-h1">負荷ログ</h1>
        <p className="tl-tagline">
          同じ重量×回数が続いたら、教えてくれる。落として、増やして、また伸ばす。
        </p>
      </header>

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

      <footer className="tl-footer">
        <p>記録は現在このブラウザのセッション内だけに保持されます（サーバー保存は今後対応予定）。</p>
      </footer>
    </div>
  );
}

export default App;