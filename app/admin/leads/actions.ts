'use server'

import db from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'
import { futureISO } from '@/lib/followup'

const REVIEW_DELAY_DAYS = parseInt(process.env.REVIEW_DELAY_DAYS ?? '7', 10)

const ALLOWED_STATUSES = [
  'NEW', 'CONTACTED', 'REVIEWED', 'SENT', 'QUOTED',
  'ROUTED', 'WON', 'BOOKED', 'COMPLETED', 'LOST', 'STALE',
]

// Statuses where we stop follow-ups
const TERMINAL_STATUSES = ['WON', 'LOST', 'STALE', 'BOOKED', 'COMPLETED']

const ALLOWED_ASSIGNMENT_STATUSES = ['offered', 'accepted', 'declined', 'expired']

export async function updateLeadStatus(id: string, status: string) {
  if (!ALLOWED_STATUSES.includes(status)) return

  const updates: Record<string, unknown> = { status }

  if (TERMINAL_STATUSES.includes(status)) {
    updates.next_followup_at = null
  }

  if (status === 'WON' || status === 'BOOKED' || status === 'COMPLETED') {
    updates.review_send_at = futureISO(REVIEW_DELAY_DAYS)
  }

  const setClauses = Object.keys(updates)
    .map((k) => `${k} = ?`)
    .join(', ')
  const values = [...Object.values(updates), id]

  db.prepare(`UPDATE leads SET ${setClauses} WHERE id = ?`).run(...values)
  revalidatePath('/admin/leads')
}

export async function saveNotes(id: string, notes: string) {
  db.prepare('UPDATE leads SET notes = ? WHERE id = ?').run(notes.trim(), id)
  revalidatePath(`/admin/leads/${id}`)
}

export async function assignContractor(formData: FormData) {
  const leadId = formData.get('lead_id') as string
  const contractorId = formData.get('contractor_id') as string
  if (!leadId || !contractorId) return

  // Don't create a duplicate if already offered or accepted
  const existing = db
    .prepare(`SELECT id FROM assignments WHERE lead_id=? AND contractor_id=? AND status IN ('offered','accepted')`)
    .get(leadId, contractorId)
  if (existing) return

  db.prepare(`
    INSERT INTO assignments (id, lead_id, contractor_id, status, offered_at)
    VALUES (?, ?, ?, 'offered', datetime('now'))
  `).run(uuidv4(), leadId, contractorId)

  // Advance lead to 'ROUTED' only if it hasn't moved past that yet
  db.prepare(
    `UPDATE leads SET status='ROUTED' WHERE id=? AND UPPER(status) IN ('NEW','CONTACTED')`
  ).run(leadId)

  revalidatePath(`/admin/leads/${leadId}`)
  revalidatePath('/admin/leads')
}

export async function updateAssignment(formData: FormData) {
  const id = formData.get('assignment_id') as string
  const status = formData.get('status') as string
  const quoteRaw = formData.get('quote_amount') as string | null
  const leadId = formData.get('lead_id') as string

  if (!ALLOWED_ASSIGNMENT_STATUSES.includes(status)) return

  const quoteAmount = quoteRaw && quoteRaw.trim() ? Math.round(parseFloat(quoteRaw) * 100) : null

  db.prepare(`
    UPDATE assignments
    SET status        = ?,
        responded_at  = datetime('now'),
        accepted_at   = CASE WHEN ? = 'accepted' THEN datetime('now') ELSE accepted_at END,
        quote_amount  = ?
    WHERE id = ?
  `).run(status, status, quoteAmount, id)

  revalidatePath(`/admin/leads/${leadId}`)
}
