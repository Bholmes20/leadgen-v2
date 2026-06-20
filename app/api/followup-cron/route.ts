import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { sendSMS } from '@/lib/sms'
import {
  FOLLOWUP_STEPS,
  buildReviewSMS,
  futureISO,
  serviceLabel,
} from '@/lib/followup'

const CRON_SECRET = process.env.CRON_SECRET
const GOOGLE_REVIEW_LINK = process.env.GOOGLE_REVIEW_LINK ?? ''

// Statuses where follow-ups should stop
const TERMINAL = ['WON', 'LOST', 'STALE', 'COMPLETED', 'BOOKED']
const TERMINAL_PLACEHOLDERS = TERMINAL.map(() => '?').join(',')

type FollowUpLead = {
  id: string
  name: string
  phone: string
  service: string
  followup_count: number
}

type ReviewLead = {
  id: string
  name: string
  phone: string
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let followupsSent = 0
  let reviewsSent = 0
  let markedStale = 0
  const errors: string[] = []

  // ── Follow-up sequence ────────────────────────────────────────────────────
  const dueLeads = db
    .prepare(
      `SELECT id, name, phone, service, followup_count
       FROM leads
       WHERE next_followup_at IS NOT NULL
         AND next_followup_at <= datetime('now')
         AND UPPER(status) NOT IN (${TERMINAL_PLACEHOLDERS})
       ORDER BY next_followup_at ASC
       LIMIT 20`
    )
    .all(...TERMINAL) as FollowUpLead[]

  for (const lead of dueLeads) {
    const step = FOLLOWUP_STEPS.find((s) => s.count === lead.followup_count)
    if (!step) continue

    if (step.isStale) {
      db.prepare(
        `UPDATE leads SET status='STALE', next_followup_at=NULL WHERE id=?`
      ).run(lead.id)
      markedStale++
      continue
    }

    // Idempotency: skip if this step was already sent successfully
    const alreadySent = db
      .prepare(
        `SELECT id FROM communications
         WHERE lead_id=? AND type='sms' AND direction='outbound'
           AND subject=? AND status='sent'`
      )
      .get(lead.id, step.subject)

    if (alreadySent) {
      // Advance the pointer without sending again
      db.prepare(
        `UPDATE leads SET followup_count=followup_count+1, next_followup_at=? WHERE id=?`
      ).run(futureISO(step.nextOffsetDays), lead.id)
      continue
    }

    const firstName = lead.name.split(' ')[0]
    const svc = serviceLabel(lead.service)
    const message = step.message(firstName, svc)

    try {
      await sendSMS({ to: lead.phone, body: message, leadId: lead.id, subject: step.subject })

      db.prepare(
        `UPDATE leads
         SET followup_count    = followup_count + 1,
             last_contacted_at = datetime('now'),
             next_followup_at  = ?
         WHERE id=?`
      ).run(futureISO(step.nextOffsetDays), lead.id)

      followupsSent++
    } catch (err) {
      errors.push(`followup ${lead.id}: ${err}`)
      console.error(`followup-cron: failed for lead ${lead.id}:`, err)
    }
  }

  // ── Review request automation ─────────────────────────────────────────────
  const reviewDue = db
    .prepare(
      `SELECT id, name, phone FROM leads
       WHERE review_send_at IS NOT NULL
         AND review_send_at <= datetime('now')
       LIMIT 20`
    )
    .all() as ReviewLead[]

  for (const lead of reviewDue) {
    // Idempotency: don't send if review was already sent
    const alreadySent = db
      .prepare(
        `SELECT id FROM communications
         WHERE lead_id=? AND type='sms' AND direction='outbound'
           AND subject='review_request' AND status='sent'`
      )
      .get(lead.id)

    if (alreadySent) {
      db.prepare(`UPDATE leads SET review_send_at=NULL WHERE id=?`).run(lead.id)
      continue
    }

    if (!GOOGLE_REVIEW_LINK) {
      console.warn('followup-cron: GOOGLE_REVIEW_LINK not set — skipping review SMS')
      break
    }

    const firstName = lead.name.split(' ')[0]
    const message = buildReviewSMS(firstName, GOOGLE_REVIEW_LINK)

    try {
      await sendSMS({ to: lead.phone, body: message, leadId: lead.id, subject: 'review_request' })
      db.prepare(`UPDATE leads SET review_send_at=NULL WHERE id=?`).run(lead.id)
      reviewsSent++
    } catch (err) {
      errors.push(`review ${lead.id}: ${err}`)
      console.error(`followup-cron: review SMS failed for lead ${lead.id}:`, err)
    }
  }

  return NextResponse.json({ followupsSent, reviewsSent, markedStale, errors })
}
