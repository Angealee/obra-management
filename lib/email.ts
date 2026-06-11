import nodemailer, { type Transporter } from 'nodemailer'

// Gmail SMTP transport using an App Password (no custom domain required).
// Requires GMAIL_USER + GMAIL_APP_PASSWORD env vars (server-only).
// NOTE: route handlers that import this MUST run on the Node.js runtime
// (the default). Do not add `export const runtime = 'edge'` — Nodemailer
// needs Node's net/tls modules.

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (transporter) return transporter

  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD are not configured.')
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
  return transporter
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  const t = getTransporter()

  const html = `
  <div style="margin:0;padding:0;background:#F7F7F5;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
      <div style="background:#0D0D0D;border-radius:14px 14px 0 0;padding:24px 28px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.45);">
          Dominican College of Tarlac
        </div>
        <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:0.02em;margin-top:6px;">
          OBRA <span style="color:#CC0000;">CMP</span>
        </div>
      </div>
      <div style="background:#ffffff;border:1px solid rgba(0,0,0,0.06);border-top:none;border-radius:0 0 14px 14px;padding:28px;">
        <p style="font-size:15px;color:#111;font-weight:600;margin:0 0 8px;">Verify your email</p>
        <p style="font-size:13.5px;color:#666;line-height:1.6;margin:0 0 20px;">
          Use the code below to finish submitting your application to
          Obra Creative Media Productions.
        </p>
        <div style="text-align:center;margin:0 0 20px;">
          <div style="display:inline-block;background:#FAFAF9;border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:16px 28px;">
            <span style="font-size:34px;font-weight:700;letter-spacing:0.32em;color:#111;font-family:'Courier New',monospace;">
              ${code}
            </span>
          </div>
        </div>
        <p style="font-size:12.5px;color:#888;line-height:1.6;margin:0 0 4px;">
          This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="font-size:12.5px;color:#888;line-height:1.6;margin:0;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
      <p style="font-size:11px;color:#bbb;text-align:center;margin:16px 0 0;">
        For internal use by CCS — Obra Creative Media Productions
      </p>
    </div>
  </div>`

  await t.sendMail({
    from: `"Obra Creative Media Productions" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${code} is your Obra verification code`,
    text:
      `Your Obra application verification code is ${code}.\n` +
      `It expires in 10 minutes.\n\n` +
      `If you didn't request this, you can ignore this email.`,
    html,
  })
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  const t = getTransporter()

  const html = `
  <div style="margin:0;padding:0;background:#F7F7F5;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:24px 16px;">
      <div style="background:#0D0D0D;border-radius:14px 14px 0 0;padding:24px 28px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.45);">
          Dominican College of Tarlac
        </div>
        <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:0.02em;margin-top:6px;">
          OBRA <span style="color:#CC0000;">CMP</span>
        </div>
      </div>
      <div style="background:#ffffff;border:1px solid rgba(0,0,0,0.06);border-top:none;border-radius:0 0 14px 14px;padding:28px;">
        <p style="font-size:15px;color:#111;font-weight:600;margin:0 0 8px;">Reset your password</p>
        <p style="font-size:13.5px;color:#666;line-height:1.6;margin:0 0 20px;">
          Use the code below to reset your Obra account password. If you didn't
          request this, your account is still safe — just ignore this email.
        </p>
        <div style="text-align:center;margin:0 0 20px;">
          <div style="display:inline-block;background:#FAFAF9;border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:16px 28px;">
            <span style="font-size:34px;font-weight:700;letter-spacing:0.32em;color:#111;font-family:'Courier New',monospace;">
              ${code}
            </span>
          </div>
        </div>
        <p style="font-size:12.5px;color:#888;line-height:1.6;margin:0 0 4px;">
          This code expires in <strong>10 minutes</strong>.
        </p>
        <p style="font-size:12.5px;color:#888;line-height:1.6;margin:0;">
          If you didn't request a password reset, you can safely ignore this email —
          your password will not change.
        </p>
      </div>
      <p style="font-size:11px;color:#bbb;text-align:center;margin:16px 0 0;">
        For internal use by CCS — Obra Creative Media Productions
      </p>
    </div>
  </div>`

  await t.sendMail({
    from: `"Obra Creative Media Productions" <${process.env.GMAIL_USER}>`,
    to,
    subject: `${code} is your Obra password reset code`,
    text:
      `Your Obra password reset code is ${code}.\n` +
      `It expires in 10 minutes.\n\n` +
      `If you didn't request this, you can ignore this email — your password will not change.`,
    html,
  })
}
