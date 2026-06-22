// Lightweight structured logger — a single choke point for app diagnostics.
//
// Works on both the server (Vercel captures stdout/stderr) and the client
// (browser console). It emits one JSON line per event so logs stay greppable
// and are trivial to forward later: to wire up Sentry / Logflare / a log drain,
// add the call inside `emit()` — nothing else in the app needs to change.

type Level = 'error' | 'warn' | 'info'
type Meta = Record<string, unknown>

function emit(level: Level, event: string, meta?: Meta) {
  const payload = { level, event, ts: new Date().toISOString(), ...meta }
  const line = JSON.stringify(payload)

  // ── Forwarding hook ──────────────────────────────────────────────
  // e.g. if (level === 'error') Sentry.captureException(...)
  // ─────────────────────────────────────────────────────────────────

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.info(line)
}

/** Normalize an unknown thrown value into a serializable shape. */
function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      digest: (error as { digest?: string }).digest,
    }
  }
  return { value: String(error) }
}

export function logError(event: string, error: unknown, meta?: Meta) {
  emit('error', event, { ...meta, error: serializeError(error) })
}

export function logWarn(event: string, meta?: Meta) {
  emit('warn', event, meta)
}

export function logInfo(event: string, meta?: Meta) {
  emit('info', event, meta)
}
