'use server'

import db from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_STATUSES = ['NEW', 'REVIEWED', 'SENT', 'QUOTED', 'ROUTED', 'BOOKED', 'COMPLETED', 'LOST']
const ALLOWED_ASSIGNMENT_STATUSES = ['offered', 'accepted', 'declined', 'expired']

export async function updateLeadStatus(id: string, status: string) {
  if (!ALLOWED_STATUSES.includes(status)) return
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id)
  revalidatePath('/admin/leads')
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

  // Advance lead to 'routed' only if it hasn't moved past that yet
  db.prepare(`UPDATE leads SET status='ROUTED' WHERE id=? AND status IN ('new','NEW')`).run(leadId)

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
