import {
  MAX_FOLLOWUP_ATTEMPTS,
  MAX_REVIEW_ATTEMPTS,
  DISABLED_BACKOFF_MINUTES,
  CAP_BACKOFF_MINUTES,
  retryBackoffMinutes,
  type SmsResultStatus,
} from './smsConfig'

const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? '706-828-1733'

export type FollowUpStep = {
  count: number
  subject: string
  message: (firstName: string, service: string) => string
  nextOffsetDays: number
  isStale?: true
}

export const FOLLOWUP_STEPS: FollowUpStep[] = [
  {
    count: 0,
    subject: 'followup_1',
    message: (firstName, service) =>
      `Hi ${firstName}, still need ${service}? We have openings this week. Call or text ${BUSINESS_PHONE} to lock in your free estimate. - Esee Property Services`,
    nextOffsetDays: 2,
  },
  {
    count: 1,
    subject: 'followup_2',
    message: (firstName, service) =>
      `Hi ${firstName}, we'd still love to handle your ${service}. Spots fill fast. Call or text ${BUSINESS_PHONE} for a free estimate. - Esee Property Services`,
    nextOffsetDays: 4,
  },
  {
    count: 2,
    subject: 'followup_3',
    message: (firstName, service) =>
      `Hi ${firstName}, last chance - closing your ${service} request soon. Still need it? Reply or call ${BUSINESS_PHONE}. - Esee Property Services`,
    nextOffsetDays: 7,
  },
  {
    count: 3,
    subject: 'stale',
    message: () => '',
    nextOffsetDays: 0,
    isStale: true,
  },
]

export function buildInitialCustomerSMS(firstName: string, service: string): string {
  return `Hi ${firstName}! Got your ${service} request. We'll call today to set up your free estimate. Reply with photos if you have them. - Esee Property Services`
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return raw
}

export function buildBrandonAlertSMS(
  name: string,
  phone: string,
  service: string,
  address: string,
  estimateLow?: number,
  estimateHigh?: number,
): string {
  const svc = service === 'junk-removal' ? 'Junk Removal' : 'Landscaping'
  const estLine = estimateLow && estimateHigh ? `\nEst: $${estimateLow}-$${estimateHigh}` : ''
  return `New ${svc} Lead\n${name} | ${formatPhone(phone)}\n${address}${estLine}`
}

export function buildReviewSMS(firstName: string, reviewLink: string): string {
  return `Hi ${firstName}, hope the job turned out great! Mind leaving us a Google review? Takes 30 sec: ${reviewLink} - Esee Property Services`
}

function toDbISO(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace('T', ' ')
}

export function isoFromDays(base: Date, days: number): string {
  return toDbISO(base.getTime() + days * 24 * 60 * 60 * 1000)
}

export function isoFromMinutes(base: Date, mins: number): string {
  return toDbISO(base.getTime() + mins * 60 * 1000)
}

export function futureISO(days: number): string {
  return isoFromDays(new Date(), days)
}

export function serviceLabel(s: string): string {
  if (s === 'junk-removal') return 'junk removal'
  return s
}

// ── Deterministic scheduling deciders ────────────────────────────────────────
// Pure functions that turn a typed SMS result into the exact scheduling change
// the cron should apply. Keeping them pure makes the safety invariants (a
// failed send always advances state, nothing hot-loops) directly testable.
export type FollowupPlan = {
  nextFollowupAt: string | null // value to write to leads.next_followup_at
  attempts: number // value to write to leads.followup_attempts
  advanceStep: boolean // increment followup_count (successful send only)
  markContacted: boolean // set last_contacted_at
  makeTerminal: boolean // set status='STALE'
  stopBatch: boolean // stop processing the rest of this cron batch
  reason: string // stored in leads.last_followup_result for observability
}

export function planFollowup(
  status: SmsResultStatus,
  ctx: { attempts: number; stepOffsetDays: number; authFailure?: boolean; now: Date },
): FollowupPlan {
  const base: FollowupPlan = {
    nextFollowupAt: null,
    attempts: ctx.attempts,
    advanceStep: false,
    markContacted: false,
    makeTerminal: false,
    stopBatch: false,
    reason: status,
  }

  switch (status) {
    case 'sent':
      return {
        ...base,
        nextFollowupAt: isoFromDays(ctx.now, ctx.stepOffsetDays),
        attempts: 0,
        advanceStep: true,
        markContacted: true,
        reason: 'sent',
      }
    case 'permanent_failure':
      // Auth/account issue already tripped the breaker in sendSMS; stop the
      // batch so we do not walk every due lead against a broken account.
      return { ...base, makeTerminal: true, stopBatch: !!ctx.authFailure, reason: 'permanent_failure' }
    case 'transient_failure': {
      const attempts = ctx.attempts + 1
      if (attempts >= MAX_FOLLOWUP_ATTEMPTS) {
        return { ...base, attempts, makeTerminal: true, reason: 'max_attempts' }
      }
      return {
        ...base,
        attempts,
        nextFollowupAt: isoFromMinutes(ctx.now, retryBackoffMinutes(attempts)),
        reason: 'transient_failure',
      }
    }
    case 'disabled':
      // System off / no creds — not the lead's fault. Push forward (never leave
      // an already-due timestamp) without burning the finite attempt budget.
      return {
        ...base,
        nextFollowupAt: isoFromMinutes(ctx.now, DISABLED_BACKOFF_MINUTES),
        stopBatch: true,
        reason: 'disabled',
      }
    case 'cap_reached':
      return {
        ...base,
        nextFollowupAt: isoFromMinutes(ctx.now, CAP_BACKOFF_MINUTES),
        stopBatch: true,
        reason: 'cap_reached',
      }
    default: // 'skipped' or anything unexpected → stop this lead safely
      return { ...base, makeTerminal: true, reason: status }
  }
}

export type ReviewPlan = {
  reviewSendAt: string | null // value to write to leads.review_send_at
  attempts: number // value to write to leads.review_attempts
  stopBatch: boolean
  reason: string
}

export function planReview(
  status: SmsResultStatus,
  ctx: { attempts: number; authFailure?: boolean; now: Date },
): ReviewPlan {
  const base: ReviewPlan = { reviewSendAt: null, attempts: ctx.attempts, stopBatch: false, reason: status }

  switch (status) {
    case 'sent':
      return { ...base, reviewSendAt: null, attempts: 0, reason: 'sent' }
    case 'permanent_failure':
      return { ...base, reviewSendAt: null, stopBatch: !!ctx.authFailure, reason: 'permanent_failure' }
    case 'transient_failure': {
      const attempts = ctx.attempts + 1
      if (attempts >= MAX_REVIEW_ATTEMPTS) {
        return { ...base, attempts, reviewSendAt: null, reason: 'max_attempts' }
      }
      return { ...base, attempts, reviewSendAt: isoFromMinutes(ctx.now, retryBackoffMinutes(attempts)), reason: 'transient_failure' }
    }
    case 'disabled':
      return { ...base, reviewSendAt: isoFromMinutes(ctx.now, DISABLED_BACKOFF_MINUTES), stopBatch: true, reason: 'disabled' }
    case 'cap_reached':
      return { ...base, reviewSendAt: isoFromMinutes(ctx.now, CAP_BACKOFF_MINUTES), stopBatch: true, reason: 'cap_reached' }
    default:
      return { ...base, reviewSendAt: null, reason: status }
  }
}
