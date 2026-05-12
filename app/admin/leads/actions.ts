'use server'

import db from '@/lib/db'
import { revalidatePath } from 'next/cache'

const ALLOWED_STATUSES = ['NEW', 'REVIEWED', 'SENT', 'QUOTED', 'BOOKED', 'COMPLETED', 'LOST']

export async function updateLeadStatus(id: string, status: string) {
  if (!ALLOWED_STATUSES.includes(status)) return
  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id)
  revalidatePath('/admin/leads')
}
