import nodemailer from 'nodemailer'

const {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  SMTP_FROM = 'noreply@ezlaunch.app',
  FRONTEND_URL = 'http://localhost',
} = process.env

const configured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)

const transport = configured
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: parseInt(SMTP_PORT || '587') === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })
  : null

const isDev = process.env.NODE_ENV === 'development'

export async function sendPasswordReset(log, { to, token }) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`

  if (!configured) {
    // EZL-SECAUDIT-v0.3.0-H2: the reset link carries a working token (account takeover
    // if it lands in logs). Only print it in local dev; never on staging/prod.
    if (isDev) {
      log.info({ resetLink: link }, 'SMTP not configured — password reset link (dev mode)')
    } else {
      log.error({ to }, 'SMTP not configured — password reset email NOT sent (no token logged)')
    }
    return
  }

  // Best-effort: a mail-server failure must not fail the calling request
  // (the account is already created and the reset token is stored in redis).
  try {
    await transport.sendMail({
      from: SMTP_FROM,
      to,
      subject: 'Reset your EZ Launch password',
      text: `You requested a password reset.\n\nClick the link below to set a new password (valid 1 hour):\n\n${link}\n\nIf you did not request this, ignore this email.`,
      html: `<p>You requested a password reset.</p>
<p><a href="${link}">Reset your password</a></p>
<p>This link expires in 1 hour. If you did not request this, ignore this email.</p>`,
    })
  } catch (err) {
    // Never log the link/token here — a transient mail failure must not leak a
    // reset capability into the logs.
    log.warn({ err: err?.message, to }, 'password reset email failed to send')
  }
}
