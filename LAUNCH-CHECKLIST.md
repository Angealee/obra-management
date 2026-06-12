# Launch Checklist — before handing accounts to students

Work through this top to bottom. The first section is the one that actually
causes "it's broken" messages: students with valid logins seeing **empty
dashboards** because of missing setup, not bugs.

---

## 1. Database — run the pending migrations (one time, in order)

In the Supabase dashboard → **SQL Editor**, run any migration you haven't yet:

- [ ] `db/2026-academic-year-members.sql` — roster table (required for Members + dashboards)
- [ ] `db/2026-performance-indexes.sql` — indexes on the core foreign keys
- [ ] `db/2026-join-forensics.sql` — **new**: /join forensic columns + `application_blocks` ban list

> These are additive and idempotent (safe to re-run). The index migration has no
> app-visible effect except faster queries as data grows.

---

## 2. Academic Year + roster (the #1 cause of "empty dashboard")

A student only sees content, and admins only see the student in the Members
list, when **both** of these are true:

- [ ] An academic year is **set Active** (`Dashboard → Academic Years → Set Active`).
- [ ] Each student has a row in that year's roster (`academic_year_members`).

How the roster gets populated:

- New members added **while a year is active** are placed on that year's roster
  automatically.
- Existing members were backfilled into the active year by the migration above.
- You can confirm/adjust per member from their detail page → **"Active for [year]"** panel.

**Verify before launch:**

- [ ] Open `Dashboard → Members` with the correct year selected in the top-bar
      picker. Every student you expect is listed.
- [ ] If a student is missing: set them active for the year from their member page.

---

## 3. Smoke test with ONE real student account

Create or pick one test student account and confirm the full path **before**
sending out the rest:

- [ ] Log in as the student (try both email **and** username if you issue usernames).
- [ ] Dashboard loads and shows their year (not "No active academic year").
- [ ] They can see duties assigned to them and upcoming events.
- [ ] They can edit their profile and change their password.
- [ ] Log in as a consultant — the student appears in Members and Workloads.

---

## 4. Security checks (changed in this pass)

- [ ] **Login throttle**: intentionally fail login for one account ~8 times in a
      few minutes → you should get the "Too many failed attempts for this
      account" message. Confirm a *different* account on the **same network**
      can still log in (proves it's per-account, not per-IP / per-campus).
- [ ] **CSP is now enforced** (`next.config.ts`). After deploying, open the app
      and watch the browser **Console** on these screens for red `Content
      Security Policy` errors:
  - [ ] Login page (logo image, fonts)
  - [ ] Dashboard (fonts, icons)
  - [ ] Profile → avatar upload + display (Supabase Storage image)
  - [ ] Any page that loads remote images
  - If something breaks, revert the header key to
    `Content-Security-Policy-Report-Only` in `next.config.ts`, redeploy, and add
    the missing source to the `csp` array.

---

## 4b. Join-form abuse defenses (new)

- [ ] **Disposable/temp email is rejected**: try submitting with a `@mailinator.com`
      or `@temp-mail.org` address → it should be refused *before* a code is sent,
      with the "use your school or Gmail/Outlook/Yahoo/iCloud email" message.
- [ ] **Allowlist works**: a normal `@dct.edu.ph` / Gmail address gets a code.
- [ ] **Alias farming is blocked**: after one application from `name@gmail.com`,
      `name+test@gmail.com` and `n.a.m.e@gmail.com` are treated as the same inbox
      (duplicate / rate-limited).
- [ ] **Forensics show up**: open a test application in the dashboard → the
      "Security & Forensics" card shows IP, device fingerprint, canonical email.
- [ ] **Block tool works** (consultant): block the test email, then try to
      re-apply with it → silently refused (no error shown to the applicant).
      Remember: prefer email/domain blocks; IP blocks can hit a whole campus.

## 5. Environment / deploy

- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
      `SUPABASE_SERVICE_ROLE_KEY` set in Vercel (service key is **server-only**).
- [ ] Email (nodemailer) credentials set, if OTP / forgot-password is in use.
- [ ] Production build passes: `npm run build`.

---

## Rollback notes

- The performance changes are code-level and revert with git.
- The index migration can be dropped (`drop index if exists idx_...`) with no
  data loss; it only affects query speed.
- CSP can be returned to report-only without a code change to behavior (header
  key only).
