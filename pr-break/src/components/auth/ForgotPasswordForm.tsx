import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../lib/AuthContext';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const { requestReset } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestReset(email);
      setSent(true);
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
        <h2 className="tl-h2">再設定用リンクを送信</h2>
      </div>

      {sent ? (
        <p className="tl-auth-note">
          入力されたメールアドレス宛に再設定用のリンクを送信しました（該当するアカウントが存在する場合）。メールをご確認ください。
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="tl-field">
            <label className="tl-label" htmlFor="reset-email">
              メールアドレス
            </label>
            <input
              id="reset-email"
              className="tl-input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && <p className="tl-auth-error">{error}</p>}

          <button type="submit" className="tl-btn tl-btn--accent tl-btn--full" disabled={isSubmitting}>
            {isSubmitting ? '送信中…' : '再設定用リンクを送信'}
          </button>
        </form>
      )}

      <button type="button" className="tl-btn tl-btn--ghost tl-btn--full tl-auth-toggle" onClick={onBack}>
        ログイン画面に戻る
      </button>
    </div>
  );
}