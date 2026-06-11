import crypto from 'crypto'

// Shared helpers for one-time codes (application email verification,
// password reset, etc.). Codes are never stored in plaintext — only
// sha256(code + OTP_PEPPER) is persisted.

export function generateOtpCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
}

export function hashOtpCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code + (process.env.OTP_PEPPER ?? ''))
    .digest('hex')
}
