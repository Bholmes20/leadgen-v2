'use server'

import db from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'
import { futureISO } from '@/lib/followup'
import { isValidQuoteStatus, itemTypeLabel } from '@/lib/pickup'
import { sendQuoteEmail } from '@/lib/email'

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

// Dollars string → integer cents, or null if blank/invalid.
function dollarsToCents(raw: string | null): number | null {
  if (!raw || !raw.trim()) return null
  const n = parseFloat(raw)
  if (!isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

// Save the customer-facing quote (amount, optional deposit, notes, exclusions) and
// an explicit quote_status. Saving an amount while still awaiting a quote advances the
// lead to 'quoted' automatically.
export async function saveQuote(formData: FormData) {
  const id = formData.get('lead_id') as string
  if (!id) return

  const quoteAmount = dollarsToCents(formData.get('quote_amount') as string | null)
  const depositAmount = dollarsToCents(formData.get('deposit_amount') as string | null)
  const quoteNotes = ((formData.get('quote_notes') as string) ?? '').trim() || null
  const quoteExclusions = ((formData.get('quote_exclusions') as string) ?? '').trim() || null

  const requested = (formData.get('quote_status') as string) || ''
  let quoteStatus: string = isValidQuoteStatus(requested) ? requested : ''

  // If admin saved an amount but left status at an early stage, move it to 'quoted'.
  const current = db.prepare('SELECT quote_status FROM leads WHERE id = ?').get(id) as
    | { quote_status: string | null }
    | undefined
  if (!quoteStatus) {
    const cur = current?.quote_status ?? 'submitted'
    quoteStatus = quoteAmount != null && (cur === 'submitted' || cur === 'needs_quote') ? 'quoted' : cur
  }

  db.prepare(`
    UPDATE leads
    SET quote_amount = ?, deposit_amount = ?, quote_notes = ?, quote_exclusions = ?, quote_status = ?
    WHERE id = ?
  `).run(quoteAmount, depositAmount, quoteNotes, quoteExclusions, quoteStatus, id)

  revalidatePath(`/admin/leads/${id}`)
}

type QuoteLead = {
  id: string
  name: string
  email: string
  item_type: string | null
  service: string
  quote_amount: number | null
  deposit_amount: number | null
  quote_notes: string | null
  quote_exclusions: string | null
}

// Send the saved quote to the customer by EMAIL only (SMS intentionally not wired yet).
// Requires a saved quote amount. Logs to communications and advances status to quote_sent.
export async function sendQuote(formData: FormData) {
  const id = formData.get('lead_id') as string
  if (!id) return

  const lead = db.prepare(`
    SELECT id, name, email, item_type, service, quote_amount, deposit_amount, quote_notes, quote_exclusions
    FROM leads WHERE id = ?
  `).get(id) as QuoteLead | undefined

  if (!lead || lead.quote_amount == null) return // nothing to send

  const serviceLabel = lead.item_type ? itemTypeLabel(lead.item_type) : 'pickup'

  try {
    await sendQuoteEmail({
      name: lead.name,
      email: lead.email,
      serviceLabel,
      quoteAmountCents: lead.quote_amount,
      depositAmountCents: lead.deposit_amount,
      notes: lead.quote_notes,
      exclusions: lead.quote_exclusions,
    })

    db.prepare(`
      INSERT INTO communications (id, lead_id, type, direction, subject, body, status, sent_by)
      VALUES (?, ?, 'email', 'outbound', 'quote', ?, 'sent', 'admin')
    `).run(uuidv4(), id, `Quote sent: ${serviceLabel}`)

    db.prepare(`UPDATE leads SET quote_status = 'quote_sent', quote_sent_at = datetime('now') WHERE id = ?`).run(id)
  } catch (err) {
    db.prepare(`
      INSERT INTO communications (id, lead_id, type, direction, subject, body, status, sent_by, error)
      VALUES (?, ?, 'email', 'outbound', 'quote', ?, 'failed', 'admin', ?)
    `).run(uuidv4(), id, `Quote send failed: ${serviceLabel}`, err instanceof Error ? err.message : String(err))
  }

  revalidatePath(`/admin/leads/${id}`)
}

export async function updateQuoteStatus(id: string, status: string) {
  if (!isValidQuoteStatus(status)) return
  db.prepare('UPDATE leads SET quote_status = ? WHERE id = ?').run(status, id)
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
