import db from './db'
import { v4 as uuidv4 } from 'uuid'
import {
  AUTO_DISABLE_COOLDOWN_MINUTES,
  classifyHttpFailure,
  isAuthOrAccountFailure,
  isSmsEnabled,
  resolveDailyCap,
  type SmsResult,
} from './smsConfig'

export type { SmsResult, SmsResultStatus } from './smsConfig'

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return null
}

// ── Communications logging ───────────────────────────────────────────────────
// Only 'sent' and 'failed' rows represent an actual Twilio request; the daily
// cap counts exactly those. 'disabled' / 'cap_reached' / 'skipped' rows are
// observability breadcrumbs for sends that never reached the provider.
function logComm(
  leadId: string | undefined,
  subject: string,
  body: string,
  status: string,
  error?: string,
): string | null {
  if (!leadId) return null
  const id = uuidv4()
  db.prepare(
    `INSERT INTO communications (id, lead_id, type, direction, subject, body, status, error)
     VALUES (?, ?, 'sms', 'outbound', ?, ?, ?, ?)`,
  ).run(id, leadId, subject, body, status, error ?? null)
  return id
}

// ── Auto-breaker (persistent, self-healing) ──────────────────────────────────
// One auth/account failure disables all sends for a cool-down window so a
// suspended Twilio account can never be hammered every 5 minutes. It clears
// itself automatically once the window passes.
function breakerActive(): boolean {
  const row = db
    .prepare(`SELECT 1 AS ok FROM app_flags WHERE key='sms_auto_disabled_until' AND value > datetime('now')`)
    .get() as { ok: number } | undefined
  return !!row
}

function tripBreaker(): void {
  db.prepare(
    `INSERT INTO app_flags (key, value, updated_at)
     VALUES ('sms_auto_disabled_until', datetime('now', ?), datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
  ).run(`+${AUTO_DISABLE_COOLDOWN_MINUTES} minutes`)
}

// ── Daily cap ────────────────────────────────────────────────────────────────
function sentOrFailedToday(): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS n FROM communications
       WHERE type='sms' AND direction='outbound'
         AND status IN ('sent','failed')
         AND date(created_at) = date('now')`,
    )
    .get() as { n: number }
  return row.n
}

function parseTwilioCode(text: string): number | undefined {
  try {
    const j = JSON.parse(text) as { code?: number }
    return typeof j.code === 'number' ? j.code : undefined
  } catch {
    return undefined
  }
}

/**
 * Send an SMS through Twilio behind the full communication-safety layer.
 *
 * NEVER throws. Always returns a typed {@link SmsResult} so callers can make a
 * deterministic scheduling decision. Protection order (fail closed):
 *   1. global kill switch (SMS_ENABLED)
 *   2. auto-breaker (recent auth/account failure)
 *   3. credentials present
 *   4. valid recipient
 *   5. daily global cap
 *   6. Twilio request + failure classification
 */
export async function sendSMS({
  to,
  body,
  leadId,
  subject,
}: {
  to: string
  body: string
  leadId?: string
  subject?: string
}): Promise<SmsResult> {
  const subj = subject ?? 'sms'

  // 1. Global kill switch — fail closed.
  if (!isSmsEnabled()) {
    const communicationId = logComm(leadId, subj, body, 'disabled', 'sms_disabled')
    return { status: 'disabled', reason: 'sms_disabled', communicationId }
  }

  // 2. Auto-breaker from a prior auth/account failure.
  if (breakerActive()) {
    const communicationId = logComm(leadId, subj, body, 'disabled', 'auto_breaker')
    return { status: 'disabled', reason: 'auto_breaker', communicationId }
  }

  // 3. Credentials must be fully configured.
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    const communicationId = logComm(leadId, subj, body, 'disabled', 'no_credentials')
    return { status: 'disabled', reason: 'no_credentials', communicationId }
  }

  // 4. Recipient must be valid — a bad number is non-retryable.
  const normalized = normalizePhone(to)
  if (!normalized) {
    const communicationId = logComm(leadId, subj, body, 'skipped', 'invalid_phone')
    return { status: 'permanent_failure', reason: 'invalid_phone', communicationId }
  }

  // 5. Daily global cap — one sender cannot bypass it.
  if (sentOrFailedToday() >= resolveDailyCap()) {
    const communicationId = logComm(leadId, subj, body, 'cap_reached', 'daily_cap')
    return { status: 'cap_reached', reason: 'daily_cap', communicationId }
  }

  // 6. Attempt the send. Log a pending row first so it is always accounted for.
  const commId = leadId ? uuidv4() : null
  if (commId && leadId) {
    db.prepare(
      `INSERT INTO communications (id, lead_id, type, direction, subject, body, status)
       VALUES (?, ?, 'sms', 'outbound', ?, ?, 'pending')`,
    ).run(commId, leadId, subj, body)
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`
    const auth = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: FROM_NUMBER, To: normalized, Body: body }).toString(),
    })

    if (res.ok) {
      const data = (await res.json()) as { sid: string }
      if (commId) {
        db.prepare(`UPDATE communications SET status='sent', external_id=? WHERE id=?`).run(data.sid, commId)
      }
      return { status: 'sent', sid: data.sid, communicationId: commId }
    }

    // Non-OK HTTP → classify.
    const text = await res.text().catch(() => '(unreadable)')
    const code = parseTwilioCode(text)
    const cls = classifyHttpFailure(res.status, code)
    const authFailure = isAuthOrAccountFailure(res.status, code)
    const detail = `${cls}: Twilio ${res.status}${code !== undefined ? ` code ${code}` : ''}`

    if (commId) {
      db.prepare(`UPDATE communications SET status='failed', error=? WHERE id=?`).run(detail, commId)
    }

    // An auth/account failure trips the breaker so nothing hot-loops.
    if (authFailure) tripBreaker()

    return {
      status: cls === 'permanent' ? 'permanent_failure' : 'transient_failure',
      reason: authFailure ? 'auth_account' : 'provider_error',
      providerStatus: res.status,
      providerCode: code,
      authFailure,
      communicationId: commId,
      error: detail,
    }
  } catch (err) {
    // Network / timeout / unexpected → transient (recoverable).
    const detail = `transient: ${String(err)}`
    if (commId) {
      db.prepare(`UPDATE communications SET status='failed', error=? WHERE id=?`).run(detail, commId)
    }
    return { status: 'transient_failure', reason: 'network', communicationId: commId, error: detail }
  }
}
