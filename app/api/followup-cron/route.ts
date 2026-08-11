import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sendSMS } from '@/lib/sms'
import {
  FOLLOWUP_STEPS,
  buildReviewSMS,
  planFollowup,
  planReview,
  serviceLabel,
} from '@/lib/followup'
import { isStaleSchedule } from '@/lib/smsConfig'

const CRON_SECRET = process.env.CRON_SECRET
const GOOGLE_REVIEW_LINK = process.env.GOOGLE_REVIEW_LINK ?? ''

// Statuses where follow-ups should stop (case-insensitive: production data
// contains mixed/lowercase statuses like 'new').
const TERMINAL = ['WON', 'LOST', 'STALE', 'COMPLETED', 'BOOKED']
const TERMINAL_PLACEHOLDERS = TERMINAL.map(() => '?').join(',')

type FollowUpLead = {
  id: string
  name: string
  phone: string
  service: string
  followup_count: number
  followup_attempts: number
  next_followup_at: string
}

type ReviewLead = {
  id: string
  name: string
  phone: string
  review_attempts: number
  review_send_at: string
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  let followupsSent = 0
  let reviewsSent = 0
  let markedStale = 0
  let skippedStale = 0
  let deferred = 0
  const errors: string[] = []

  // Persist a follow-up scheduling decision + observability breadcrumb.
  const applyFollowup = db.prepare(
    `UPDATE leads
        SET status              = CASE WHEN ? = 1 THEN 'STALE' ELSE status END,
            followup_count      = followup_count + CASE WHEN ? = 1 THEN 1 ELSE 0 END,
            followup_attempts   = ?,
            last_contacted_at   = CASE WHEN ? = 1 THEN datetime('now') ELSE last_contacted_at END,
            next_followup_at    = ?,
            last_followup_result= ?
      WHERE id = ?`,
  )

  // ── Follow-up sequence ────────────────────────────────────────────────────
  const dueLeads = db
    .prepare(
      `SELECT id, name, phone, service, followup_count, followup_attempts, next_followup_at
         FROM leads
        WHERE next_followup_at IS NOT NULL
          AND next_followup_at <= datetime('now')
          AND UPPER(status) NOT IN (${TERMINAL_PLACEHOLDERS})
        ORDER BY next_followup_at ASC
        LIMIT 20`,
    )
    .all(...TERMINAL) as FollowUpLead[]

  for (const lead of dueLeads) {
    const step = FOLLOWUP_STEPS.find((s) => s.count === lead.followup_count)

    // Unknown/exhausted step → retire safely.
    if (!step) {
      applyFollowup.run(1, 0, lead.followup_attempts, 0, null, 'no_step', lead.id)
      markedStale++
      continue
    }

    if (step.isStale) {
      applyFollowup.run(1, 0, lead.followup_attempts, 0, null, 'stale', lead.id)
      markedStale++
      continue
    }

    // No-catch-up guard: a schedule older than the catch-up window is
    // historical — retire it instead of sending a stale message.
    if (isStaleSchedule(lead.next_followup_at, now)) {
      applyFollowup.run(1, 0, lead.followup_attempts, 0, null, 'skipped_stale', lead.id)
      skippedStale++
      continue
    }

    // Idempotency: this step already went out successfully — advance the pointer.
    const alreadySent = db
      .prepare(
        `SELECT id FROM communications
          WHERE lead_id=? AND type='sms' AND direction='outbound'
            AND subject=? AND status='sent'`,
      )
      .get(lead.id, step.subject)

    if (alreadySent) {
      const plan = planFollowup('sent', {
        attempts: lead.followup_attempts,
        stepOffsetDays: step.nextOffsetDays,
        now,
      })
      applyFollowup.run(0, 1, plan.attempts, 0, plan.nextFollowupAt, 'already_sent', lead.id)
      continue
    }

    const firstName = lead.name.split(' ')[0]
    const message = step.message(firstName, serviceLabel(lead.service))

    const result = await sendSMS({ to: lead.phone, body: message, leadId: lead.id, subject: step.subject })

    const plan = planFollowup(result.status, {
      attempts: lead.followup_attempts,
      stepOffsetDays: step.nextOffsetDays,
      authFailure: result.authFailure,
      now,
    })

    applyFollowup.run(
      plan.makeTerminal ? 1 : 0,
      plan.advanceStep ? 1 : 0,
      plan.attempts,
      plan.markContacted ? 1 : 0,
      plan.nextFollowupAt,
      plan.reason,
      lead.id,
    )

    if (result.status === 'sent') followupsSent++
    else if (plan.makeTerminal) markedStale++
    else deferred++

    if (result.status !== 'sent') {
      errors.push(`followup ${lead.id}: ${plan.reason}${result.error ? ` (${result.error})` : ''}`)
    }

    // Kill switch / cap / auth failure → stop the batch; nothing else will send.
    if (plan.stopBatch) break
  }

  // ── Review request automation ─────────────────────────────────────────────
  const applyReview = db.prepare(
    `UPDATE leads SET review_send_at = ?, review_attempts = ? WHERE id = ?`,
  )

  const reviewDue = db
    .prepare(
      `SELECT id, name, phone, review_attempts, review_send_at FROM leads
        WHERE review_send_at IS NOT NULL
          AND review_send_at <= datetime('now')
        LIMIT 20`,
    )
    .all() as ReviewLead[]

  for (const lead of reviewDue) {
    // Idempotency: already reviewed → clear.
    const alreadySent = db
      .prepare(
        `SELECT id FROM communications
          WHERE lead_id=? AND type='sms' AND direction='outbound'
            AND subject='review_request' AND status='sent'`,
      )
      .get(lead.id)

    if (alreadySent) {
      applyReview.run(null, lead.review_attempts, lead.id)
      continue
    }

    if (!GOOGLE_REVIEW_LINK) {
      console.warn('followup-cron: GOOGLE_REVIEW_LINK not set — skipping review SMS')
      break
    }

    // No-catch-up guard for reviews.
    if (isStaleSchedule(lead.review_send_at, now)) {
      applyReview.run(null, lead.review_attempts, lead.id)
      skippedStale++
      continue
    }

    const firstName = lead.name.split(' ')[0]
    const message = buildReviewSMS(firstName, GOOGLE_REVIEW_LINK)

    const result = await sendSMS({ to: lead.phone, body: message, leadId: lead.id, subject: 'review_request' })

    const plan = planReview(result.status, { attempts: lead.review_attempts, authFailure: result.authFailure, now })
    applyReview.run(plan.reviewSendAt, plan.attempts, lead.id)

    if (result.status === 'sent') reviewsSent++
    else errors.push(`review ${lead.id}: ${plan.reason}${result.error ? ` (${result.error})` : ''}`)

    if (plan.stopBatch) break
  }

  return NextResponse.json({ followupsSent, reviewsSent, markedStale, skippedStale, deferred, errors })
}
