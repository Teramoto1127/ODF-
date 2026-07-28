import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../lib/AuthContext';

interface ResetPasswordFormProps {
  token: string;
  onDone: () => void;
}

export function ResetPasswordForm({ token, onDone }: ResetPasswordFormProps) {
  const { confirmReset } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await confirmReset(token, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="tl-card tl-auth">
      <div className="tl-card-heading">
        <span className="tl-eyebrow">パスワード再設定</span>
        <h2 className="tl-h2">新しいパスワードを設定</h2>
      </div>

      {done ? (
        <>
          <p className="tl-auth-note">パスワードを再設定しました。ログイン画面からログインしてください。</p>
          <button type="button" className="tl-btn tl-btn--accent tl-btn--full" onClick={onDone}>
            ログイン画面へ
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="tl-field">
            <label className="tl-label" htmlFor="new-password">
              新しいパスワード
            </label>
            <input
              id="new-password"
              className="tl-input"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          {error && <p className="tl-auth-error">{error}</p>}

          <button type="submit" className="tl-btn tl-btn--accent tl-btn--full" disabled={isSubmitting}>
            {isSubmitting ? '更新中…' : 'パスワードを更新'}
          </button>
        </form>
      )}
    </div>
  );
}