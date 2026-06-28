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

export async function sendPasswordReset(log, { to, token }) {
  const link = `${FRONTEND_URL}/reset-password?token=${token}`

  if (!configured) {
    log.info({ resetLink: link }, 'SMTP not configured — password reset link (dev mode)')
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
    log.warn({ err, to, resetLink: link }, 'password reset email failed to send — link logged as fallback')
  }
}
