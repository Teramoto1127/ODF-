import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { readLocalTrainingData, clearLocalTrainingData } from '../../lib/useTrainingStore';

type Mode = 'login' | 'register';

interface AuthFormProps {
  onForgotPassword: () => void;
}

export function AuthForm({ onForgotPassword }: AuthFormProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const localData = readLocalTrainingData();
        await register(email, password, localData);
        clearLocalTrainingData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="tl-card tl-auth">
      <div className="tl-card-heading">
        <span className="tl-eyebrow">{mode === 'login' ? 'ログイン' : '新規登録'}</span>
        <h2 className="tl-h2">{mode === 'login' ? 'おかえりなさい' : 'はじめましょう'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="tl-field">
          <label className="tl-label" htmlFor="auth-email">
            メールアドレス
          </label>
          <input
            id="auth-email"
            className="tl-input"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="tl-field">
          <label className="tl-label" htmlFor="auth-password">
            パスワード
          </label>
          <input
            id="auth-password"
            className="tl-input"
            type="password"
            required
            minLength={8}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === 'register' && (
          <p className="tl-auth-note">
            今このブラウザに保存されている記録は、登録と同時にアカウントへ移行されます。
          </p>
        )}

        {error && <p className="tl-auth-error">{error}</p>}

        <button type="submit" className="tl-btn tl-btn--accent tl-btn--full" disabled={isSubmitting}>
          {isSubmitting ? '処理中…' : mode === 'login' ? 'ログイン' : '登録する'}
        </button>
      </form>

      {mode === 'login' && (
        <button
          type="button"
          className="tl-btn tl-btn--ghost tl-btn--full tl-auth-toggle"
          onClick={onForgotPassword}
        >
          パスワードをお忘れですか？
        </button>
      )}

      <button
        type="button"
        className="tl-btn tl-btn--ghost tl-btn--full tl-auth-toggle"
        onClick={() => {
          setMode((m) => (m === 'login' ? 'register' : 'login'));
          setError(null);
        }}
      >
        {mode === 'login' ? 'アカウントをお持ちでない方はこちら' : 'ログインはこちら'}
      </button>
    </div>
  );
}