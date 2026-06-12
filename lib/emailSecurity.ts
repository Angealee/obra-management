import { resolveMx } from 'dns/promises'

// ───────────────────────────────────────────────────────────────────────────
// Email trust gate for the public /join form.
//
// The OTP only proves "this person can read SOME inbox" — a disposable inbox
// reads email too. This module adds the missing layer: deciding whether the
// address is a real, identity-bearing email in the first place.
//
// Active policy: ALLOWLIST. Only the school domain + the major consumer
// providers are accepted; everything else (and every known disposable domain)
// is rejected before a code is ever sent. Switch EMAIL_POLICY to 'blocklist' to
// instead allow any address that is non-disposable and has valid MX records.
// ───────────────────────────────────────────────────────────────────────────

export type EmailPolicy = 'allowlist' | 'blocklist'
export const EMAIL_POLICY: EmailPolicy = 'allowlist'

// School first, then the providers a DCT student realistically uses.
export const ALLOWED_DOMAINS = new Set<string>([
  'dct.edu.ph',
  'gmail.com', 'googlemail.com',
  'outlook.com', 'outlook.ph', 'hotmail.com', 'hotmail.ph', 'live.com', 'live.com.ph', 'msn.com',
  'yahoo.com', 'yahoo.com.ph', 'ymail.com',
  'icloud.com', 'me.com',
])

// A curated set of well-known disposable / temporary mail domains. Not
// exhaustive (no static list can be) — but with the allowlist active these are
// already rejected for not being allowed; this set is the primary gate only if
// you later switch EMAIL_POLICY to 'blocklist'. Kept here so the defense
// survives a policy change.
export const DISPOSABLE_DOMAINS = new Set<string>([
  '0-mail.com', '0clickemail.com', '10minutemail.com', '10minutemail.net', '20minutemail.com',
  '33mail.com', 'anonbox.net', 'anonymbox.com', 'armyspy.com', 'binkmail.com', 'bobmail.info',
  'bugmenot.com', 'burnermail.io', 'byom.de', 'cuvox.de', 'dayrep.com', 'deadaddress.com',
  'discard.email', 'discardmail.com', 'dispostable.com', 'dropmail.me', 'einrot.com',
  'emailondeck.com', 'emailtemporanea.com', 'emailtemporar.ro', 'emailthe.net', 'emailwarden.com',
  'fakeinbox.com', 'fakemail.net', 'fakemailgenerator.com', 'fleckmail.de', 'freemail.ms',
  'gerolic.com', 'getairmail.com', 'getnada.com', 'gishpuppy.com', 'guerrillamail.biz',
  'guerrillamail.com', 'guerrillamail.de', 'guerrillamail.info', 'guerrillamail.net',
  'guerrillamail.org', 'guerrillamailblock.com', 'harakirimail.com', 'inboxalias.com',
  'inboxbear.com', 'incognitomail.com', 'jetable.org', 'kasmail.com', 'klzlk.com', 'koszmail.pl',
  'mail-temporaire.fr', 'mail.tm', 'mail7.io', 'mailcatch.com', 'maildrop.cc', 'maildrop.io',
  'maileater.com', 'mailexpire.com', 'mailforspam.com', 'mailinator.com', 'mailinator.net',
  'mailinator.org', 'mailinator2.com', 'mailmetrash.com', 'mailnesia.com', 'mailnull.com',
  'mailsac.com', 'mailtemp.info', 'mailtothis.com', 'mintemail.com', 'mohmal.com', 'moakt.com',
  'mt2015.com', 'mvrht.com', 'mytemp.email', 'mytrashmail.com', 'nada.email', 'nada.ltd',
  'no-spam.ws', 'nobulk.com', 'noclickemail.com', 'nomail.xl.cx', 'nospam.ze.tc', 'nospamfor.us',
  'notmailinator.com', 'nowmymail.com', 'objectmail.com', 'obobbo.com', 'oneoffmail.com',
  'onewaymail.com', 'owlpic.com', 'pjjkp.com', 'plexolan.de', 'pokemail.net', 'proxymail.eu',
  'putthisinyourspamdatabase.com', 'rcpt.at', 'reallymymail.com', 'recode.me', 'recursor.net',
  'rmqkr.net', 'rppkn.com', 'safe-mail.net', 'safetymail.info', 'sharklasers.com',
  'shieldedmail.com', 'shitmail.me', 'shortmail.net', 'sinnlos-mail.de', 'slopsbox.com',
  'smellfear.com', 'snakemail.com', 'sneakemail.com', 'sogetthis.com', 'spam4.me', 'spamavert.com',
  'spambob.com', 'spambog.com', 'spambox.us', 'spamfree24.org', 'spamgourmet.com', 'spamherelots.com',
  'spamhereplease.com', 'spamhole.com', 'spamify.com', 'spamspot.com', 'spamthis.co.uk',
  'spoofmail.de', 'superrito.com', 'tafmail.com', 'teleworm.us', 'tempail.com', 'tempemail.co',
  'tempemail.com', 'tempemail.net', 'tempinbox.com', 'tempmail.com', 'tempmail.de', 'tempmail.io',
  'tempmail.ninja', 'tempmail.plus', 'tempmail2.com', 'tempmailaddress.com', 'tempmailer.com',
  'tempmailo.com', 'tempr.email', 'temp-mail.org', 'temp-mail.io', 'temp-mail.ru', 'thankyou2010.com',
  'throwawaymail.com', 'tmail.ws', 'tmailinator.com', 'trash-mail.com', 'trash-mail.de',
  'trashmail.com', 'trashmail.de', 'trashmail.me', 'trashmail.net', 'trbvm.com', 'trialmail.de',
  'tyldd.com', 'uggsrock.com', 'vomoto.com', 'wegwerfmail.de', 'wegwerfmail.net', 'wh4f.org',
  'whyspam.me', 'willhackforfood.biz', 'willselfdestruct.com', 'wuzup.net', 'wuzupmail.net',
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'zoemail.org', 'zetmail.com',
])

export type EmailAssessment = {
  ok: boolean
  /** Machine reason when ok=false: 'invalid' | 'disposable' | 'not_allowed' | 'no_mx' */
  reason?: 'invalid' | 'disposable' | 'not_allowed' | 'no_mx'
  /** User-facing message when ok=false. */
  message?: string
  /** Lowercased, +tag/dot-normalized address for dedupe + rate-limit keys. */
  canonical: string
  /** Normalized (lowercased/trimmed) address as typed. */
  normalized: string
  domain: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Collapse provider-specific aliases to a single canonical address so one inbox
 * can't masquerade as many: strips +tags everywhere and dots on Gmail.
 *   Juan.Dela.Cruz+obra@googlemail.com  →  juandelacruz@gmail.com
 */
export function canonicalizeEmail(raw: string): { normalized: string; canonical: string; domain: string } {
  const normalized = raw.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at < 0) return { normalized, canonical: normalized, domain: '' }

  let local = normalized.slice(0, at)
  let domain = normalized.slice(at + 1)

  // Drop everything after the first '+' (sub-addressing) for all providers.
  const plus = local.indexOf('+')
  if (plus >= 0) local = local.slice(0, plus)

  // Gmail treats googlemail.com as gmail.com and ignores dots in the local part.
  if (domain === 'googlemail.com') domain = 'gmail.com'
  if (domain === 'gmail.com') local = local.replace(/\./g, '')

  return { normalized, canonical: `${local}@${domain}`, domain }
}

/** DNS MX lookup with a hard timeout so a slow resolver can't hang the request. */
export async function hasMxRecord(domain: string, timeoutMs = 3500): Promise<boolean> {
  if (!domain) return false
  try {
    const records = await Promise.race([
      resolveMx(domain),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('mx-timeout')), timeoutMs)),
    ])
    return Array.isArray(records) && records.length > 0
  } catch {
    return false
  }
}

const ALLOWLIST_MESSAGE =
  'Please use your school email (@dct.edu.ph) or a Gmail, Outlook, Yahoo, or iCloud address. Temporary or disposable emails are not accepted.'
const NO_MX_MESSAGE =
  'That email domain does not appear to accept mail. Please use a real, working email address.'

/**
 * The single entry point both API routes call. Returns ok=false with a
 * user-facing message when the address must be refused.
 */
export async function assessEmail(raw: string): Promise<EmailAssessment> {
  const { normalized, canonical, domain } = canonicalizeEmail(raw)

  if (!EMAIL_RE.test(normalized) || !domain) {
    return { ok: false, reason: 'invalid', message: 'Enter a valid email address.', canonical, normalized, domain }
  }

  if (DISPOSABLE_DOMAINS.has(domain)) {
    // Same message as not_allowed so we don't reveal the disposable check.
    return { ok: false, reason: 'disposable', message: ALLOWLIST_MESSAGE, canonical, normalized, domain }
  }

  if (EMAIL_POLICY === 'allowlist') {
    if (!ALLOWED_DOMAINS.has(domain)) {
      return { ok: false, reason: 'not_allowed', message: ALLOWLIST_MESSAGE, canonical, normalized, domain }
    }
    return { ok: true, canonical, normalized, domain }
  }

  // blocklist mode: require real mail servers.
  if (!(await hasMxRecord(domain))) {
    return { ok: false, reason: 'no_mx', message: NO_MX_MESSAGE, canonical, normalized, domain }
  }
  return { ok: true, canonical, normalized, domain }
}
