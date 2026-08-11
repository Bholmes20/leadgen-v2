// Centralized SMS safety configuration and PURE classifiers.
//
// This module has NO side effects and NO I/O (no db, no fetch, no env writes).
// Everything here is deterministic and unit-testable. The stateful pieces
// (kill switch evaluation, daily-cap counting, breaker, Twilio call) live in
// lib/sms.ts, which imports these helpers so every SMS sender is protected the
// same way and one sender cannot bypass another's limits.

// ── Typed SMS result ─────────────────────────────────────────────────────────
// Callers make deterministic scheduling decisions from `status` alone.
export type SmsResultStatus =
  | 'sent' // handed to Twilio and accepted
  | 'disabled' // kill switch off, auto-breaker tripped, or credentials absent — not attempted
  | 'skipped' // nothing sendable (missing/invalid recipient) — not attempted
  | 'transient_failure' // recoverable provider/network error — safe to retry later
  | 'permanent_failure' // auth/account/bad-data error — must NOT rapid-retry
  | 'cap_reached' // daily global cap hit — not attempted

export type SmsResult = {
  status: SmsResultStatus
  reason?: string // machine-readable reason, e.g. 'sms_disabled', 'auto_breaker', 'daily_cap'
  providerStatus?: number // HTTP status from Twilio, when a request was made
  providerCode?: number // Twilio error code (e.g. 20003), when parseable
  authFailure?: boolean // true when the failure was an auth/account condition
  sid?: string // Twilio message SID on success
  communicationId?: string | null // id of the communications row we logged, if any
  error?: string // human-readable detail (never contains credentials)
}

// ── Tunables (safe, conservative defaults) ───────────────────────────────────
export const SMS_DEFAULT_DAILY_CAP = 100
export const MAX_FOLLOWUP_ATTEMPTS = 4 // transient retries per lead before giving up
export const MAX_REVIEW_ATTEMPTS = 4
export const CATCHUP_WINDOW_MINUTES = 3 * 24 * 60 // 3 days: older schedules are not "caught up"
export const DISABLED_BACKOFF_MINUTES = 6 * 60 // re-check disabled/no-cred sends every ~6h
export const CAP_BACKOFF_MINUTES = 6 * 60 // re-check after the daily cap ~6h later
export const AUTO_DISABLE_COOLDOWN_MINUTES = 60 // breaker cool-down after an auth/account failure

// Twilio error codes that indicate an auth or account-level problem (not a
// per-message problem). These must trip the breaker and never rapid-retry.
export const AUTH_ACCOUNT_CODES = new Set<number>([
  20003, // Authentication error
  20005, // Account not active / suspended
  20008, // Attempt to access a non-Public API with test credentials
])

// ── Kill switch (fail closed) ────────────────────────────────────────────────
// Sending is allowed ONLY when the flag is explicitly, unambiguously truthy.
// Absent, malformed, or anything else → disabled.
type EnvLike = Record<string, string | undefined>

export function isSmsEnabled(env: EnvLike = process.env): boolean {
  const v = (env.SMS_ENABLED ?? '').trim().toLowerCase()
  return v === 'true' || v === '1' || v === 'yes' || v === 'on'
}

// ── Daily cap resolution (fail closed on malformed input) ────────────────────
export function resolveDailyCap(env: EnvLike = process.env): number {
  const raw = env.SMS_DAILY_CAP
  if (raw === undefined || raw.trim() === '') return SMS_DEFAULT_DAILY_CAP
  const n = Number(raw)
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return SMS_DEFAULT_DAILY_CAP
  return n
}

// ── Failure classification ───────────────────────────────────────────────────
export type FailureClass = 'transient' | 'permanent'

export function classifyHttpFailure(httpStatus: number, twilioCode?: number): FailureClass {
  if (httpStatus === 429) return 'transient' // rate limited by provider
  if (httpStatus >= 500) return 'transient' // provider server error
  if (httpStatus === 401 || httpStatus === 403) return 'permanent' // auth/account
  if (twilioCode !== undefined && AUTH_ACCOUNT_CODES.has(twilioCode)) return 'permanent'
  // Every other 4xx (e.g. invalid number) and any unknown condition fails
  // conservatively as permanent: we do NOT assume Twilio errors are retryable.
  return 'permanent'
}

export function isAuthOrAccountFailure(httpStatus: number, twilioCode?: number): boolean {
  return (
    httpStatus === 401 ||
    httpStatus === 403 ||
    (twilioCode !== undefined && AUTH_ACCOUNT_CODES.has(twilioCode))
  )
}

// ── Bounded retry backoff ────────────────────────────────────────────────────
// `attempt` is the 1-based count of failures so far for this lead.
// 1h → 6h → 24h → 72h, then callers stop retrying. Never every 5 minutes.
export function retryBackoffMinutes(attempt: number): number {
  const schedule = [60, 6 * 60, 24 * 60, 72 * 60]
  const idx = Math.min(Math.max(attempt, 1), schedule.length) - 1
  return schedule[idx]
}

// ── Catch-up guard ───────────────────────────────────────────────────────────
// A scheduled automated message whose due time is older than the catch-up
// window is "historical" and must NOT be sent after downtime / kill-switch
// re-enable / credential repair. Timestamps are stored as UTC
// 'YYYY-MM-DD HH:MM:SS' (see futureISO in lib/followup.ts).
export function parseDbTimestamp(ts: string | null): number | null {
  if (!ts) return null
  const ms = Date.parse(ts.includes('T') ? ts : ts.replace(' ', 'T') + 'Z')
  return Number.isNaN(ms) ? null : ms
}

export function isStaleSchedule(
  scheduledAt: string | null,
  now: Date,
  windowMinutes: number = CATCHUP_WINDOW_MINUTES,
): boolean {
  const ms = parseDbTimestamp(scheduledAt)
  if (ms === null) return false
  return ms < now.getTime() - windowMinutes * 60 * 1000
}
