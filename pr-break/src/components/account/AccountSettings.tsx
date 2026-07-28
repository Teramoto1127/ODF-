import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../lib/AuthContext';

export function AccountSettings() {
  const { user, changePassword, deleteAccount, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      'アカウントを削除しますか？すべての記録が完全に削除され、元に戻せません。',
    );
    if (!confirmed) return;

    const reconfirmed = window.confirm('本当によろしいですか？この操作は取り消せません。');
    if (!reconfirmed) return;

    setIsDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : '削除に失敗しました。');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="tl-panel">
      <div className="tl-card">
        <div className="tl-card-heading">
          <span className="tl-eyebrow">アカウント</span>
          <h2 className="tl-h2">アカウント設定</h2>
        </div>
        <p className="tl-auth-note">ログイン中のメールアドレス: {user?.email}</p>
        <button type="button" className="tl-btn tl-btn--ghost tl-btn--full" onClick={() => logout()}>
          ログアウト
        </button>
      </div>

      <div className="tl-card">
        <div className="tl-card-heading">
          <span className="tl-eyebrow">セキュリティ</span>
          <h2 className="tl-h2">パスワードを変更</h2>
        </div>
        <form onSubmit={handleChangePassword}>
          <div className="tl-field">
            <label className="tl-label" htmlFor="current-password">
              現在のパスワード
            </label>
            <input
              id="current-password"
              className="tl-input"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="tl-field">
            <label className="tl-label" htmlFor="new-password-settings">
              新しいパスワード
            </label>
            <input
              id="new-password-settings"
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
          {success && <p className="tl-auth-success">パスワードを変更しました。</p>}

          <button type="submit" className="tl-btn tl-btn--accent tl-btn--full" disabled={isSubmitting}>
            {isSubmitting ? '変更中…' : 'パスワードを変更'}
          </button>
        </form>
      </div>

      <div className="tl-card tl-danger-zone">
        <div className="tl-card-heading">
          <span className="tl-eyebrow">危険な操作</span>
          <h2 className="tl-h2">アカウントを削除</h2>
        </div>
        <p className="tl-auth-note">
          アカウントを削除すると、記録・種目を含むすべてのデータが完全に削除されます。この操作は取り消せません。
        </p>
        <button
          type="button"
          className="tl-btn tl-btn--danger tl-btn--full"
          onClick={handleDeleteAccount}
          disabled={isDeleting}
        >
          {isDeleting ? '削除中…' : 'アカウントを削除する'}
        </button>
      </div>
    </div>
  );
}