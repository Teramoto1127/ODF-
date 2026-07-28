const RESEND_API_KEY = process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.MAIL_FROM || 'onboarding@resend.dev';

/**
 * パスワードリセットメールを送信する。
 * RESEND_API_KEY が未設定の場合は実際には送信せず、コンソールにURLを
 * 出力するだけの開発用モードで動作する（Resend未契約でも動作確認できるように）。
 */
export async function sendPasswordResetEmail(to, resetUrl) {
  if (!RESEND_API_KEY) {
    console.log(`[mail] RESEND_API_KEY未設定のため送信をスキップします。`);
    console.log(`[mail] ${to} 宛のリセットURL: ${resetUrl}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: MAIL_FROM,
      to,
      subject: '【負荷ログ】パスワード再設定のご案内',
      html: `
        <p>負荷ログのパスワード再設定リクエストを受け付けました。</p>
        <p>以下のリンクから新しいパスワードを設定してください（60分間有効です）。</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>心当たりがない場合は、このメールを無視してください。</p>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[mail] Resend API error', res.status, body);
    throw new Error('メールの送信に失敗しました。');
  }
}