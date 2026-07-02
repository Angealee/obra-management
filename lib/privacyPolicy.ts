// Data-privacy constants shared by the /join consent flow (client) and the
// application API routes (server). No server-only imports — safe for both.
//
// Policy (agreed 2026-07-02):
//   • Consent is collected in a modal BEFORE the first server request (the
//     OTP send is the first time personal data leaves the browser).
//   • Proof of consent (timestamp + notice version) is stored on each
//     application — columns added in db/2026-privacy-consent.sql.
//   • Retention: rejected/withdrawn applications are deleted one (1) year
//     after the decision, via the consultant-run purge on /dashboard/activity.

/** Bump when the notice text meaningfully changes, so stored consents stay auditable. */
export const CONSENT_VERSION = '2026-07-v1'

/** Contact listed in the notice for access / correction / deletion requests. */
export const PRIVACY_CONTACT_EMAIL = 'koby.macale@dct.edu.ph'

/** Days a rejected/withdrawn application is kept after its decision. */
export const APPLICATION_RETENTION_DAYS = 365
