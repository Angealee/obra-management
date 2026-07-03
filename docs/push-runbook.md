# Push Notifications — Setup & Test Runbook

How to get Web Push working end-to-end and PROVE closed-app delivery on real
devices. Written for the current architecture: mutations send pushes
server-side (`after()` + `lib/notifyEvents.ts`), so delivery never depends on
the sender's browser.

---

## 1. One-time prerequisites (per environment)

### 1.1 Database migration (DONE in production — verified July 2026)
Run `db/2026-push-subscriptions.sql` in Supabase → SQL Editor. Idempotent.

### 1.2 VAPID keys
The keypair identifies this app to the browser push services (FCM, Apple Push,
Mozilla autopush). **One pair, everywhere, forever** — rotating it kills every
existing subscription.

Already set in Vercel (Settings → Environment Variables). For any new
environment (this dev machine included), copy those SAME values:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...   (safe in the browser)
VAPID_PRIVATE_KEY=...              (server-only — never NEXT_PUBLIC_)
VAPID_SUBJECT=mailto:someone@...   (contact address push services may use)
```

Only if starting from scratch (no keys anywhere yet):
`npx web-push generate-vapid-keys`

### 1.3 Other env vars
`SUPABASE_SERVICE_ROLE_KEY` must be valid — `lib/push.ts` reads subscriptions
with it. (The key on this machine returned 401 on 2026-07-03; replace it from
Supabase → Settings → API keys.)

### 1.4 Redeploy after env changes — WITHOUT the build cache
Vercel env vars only apply to deployments made after they're set.
`NEXT_PUBLIC_*` values are baked in at build time — and a redeploy that
reuses the build cache keeps the OLD client bundle, still missing the key.
Deployments → ⋯ → Redeploy → **uncheck "Use existing Build Cache"**.

Safety net: `GET /api/notifications` serves the public key from the server
env at runtime, and the profile card falls back to it — so enabling works
even from a stale bundle, as long as the server env has the vars.

---

## 2. Per-device requirements (what users must do)

| Platform | Requirement |
|---|---|
| Android (Chrome/Edge) | Works from the browser tab or installed PWA. Nothing special. |
| Desktop (Chrome/Edge/Firefox) | Works from the tab. |
| iPhone/iPad | iOS 16.4+, app **installed to Home Screen** (Share → Add to Home Screen), opened from the Home Screen icon. Safari tabs cannot push. |
| Any | Profile → Push Notifications → **Enable on this device**, and accept the permission prompt. |

Closed-app delivery needs nothing extra: the OS push service (FCM on Android,
Apple Push on iOS) wakes the service worker even when the app isn't running.

---

## 3. Local testing

The service worker registers **only in production builds** — `npm run dev`
can never test push.

```
npm run build
npm start          # http://localhost:3000 — localhost is exempt from HTTPS
```

Needs VAPID vars + a valid service-role key in `.env.local` (see §1).

---

## 4. Proving closed-app delivery (the acceptance test)

1. On the test device, open the app (installed PWA on mobile) and log in.
2. Profile → Push Notifications → Enable on this device → allow the prompt.
3. Press **Send test (4s delay)**, then immediately swipe the app away /
   close the browser completely.
4. Within a few seconds a system notification appears:
   *"✅ Obra push is working"*. Tapping it opens the app at /dashboard/profile.

If that works, verify a real flow: have an admin create an announcement while
the member device is closed — the member gets *"📣 New announcement"* and the
tap deep-links to it.

Repeat on: one Android phone, one iPhone (Home-Screen install), one desktop.

---

## 5. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| "The server has no VAPID keys…" (formerly "Push keys are not configured") | The card now checks the build-time key AND falls back to `GET /api/notifications` (runtime). Seeing this error therefore means the SERVER env itself lacks the VAPID vars → add all three in Vercel, redeploy **without build cache**. |
| "Could not save this device …" | Migration not run in that Supabase project. |
| Card says "Notifications activate on the production build" | You're on `npm run dev` — build & start, or use the deployed site. |
| Enable works, test never arrives | `VAPID_PRIVATE_KEY`/`VAPID_SUBJECT` missing on the server, or the service-role key is invalid → check Vercel function logs for `push_send_failed` / `push_subscriptions_fetch_failed`. |
| Worked for weeks, one device went quiet | Push service rotated the subscription. The SW's `pushsubscriptionchange` handler now re-subscribes automatically; worst case the user re-enables on the profile card. |
| iPhone shows "install to Home Screen" message | Expected — iOS only pushes from the installed app. |
| Notifications denied forever | Browser site settings → re-allow notifications → reload. |

Server logs (Vercel → Deployments → Functions): every send logs one JSON line
`push_sent { category, sent, failed, pruned }`; failures log `push_send_failed`.

---

## 6. Rollout notes

- `/api/notifications` POST was slimmed to `'test'`-only on 2026-07-04 — the
  mutation trigger types are gone; all real notifications are sent in-process
  by the mutation routes. If a user somehow runs pre-refactor cached JS, their
  mutations still succeed; only the push for that action is skipped until
  their app updates (PwaController update toast drives this).
- The test button in NotificationsCard is marked TEMPORARY; keep it until
  every device type in §4 has passed at least once in production.

## 7. Due-date reminders (Vercel Cron)

- `vercel.json` → `GET /api/cron/duty-reminders` daily at 01:00 UTC (09:00 PH).
- Members with **unfinished duties due tomorrow** get one push (deep-linked
  for a single duty; a summary when several are due).
- Requires `CRON_SECRET` in the env (Vercel sends `Authorization: Bearer`
  automatically). Manual test:
  `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/cron/duty-reminders`
- The response reports `{ dueDate, duties, members, sent }` — a zero-duty day
  returns `{ duties: 0 }`, which is success, not failure.
