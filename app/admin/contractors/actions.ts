'use server'

import db from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

const SERVICES = ['junk-removal', 'landscaping'] as const

function parseCoverage(formData: FormData): Array<{ service: string; zip: string }> {
  const rows: Array<{ service: string; zip: string }> = []
  for (const service of SERVICES) {
    const raw = (formData.get(`coverage_${service}`) as string | null) ?? ''
    for (const zip of raw.split(',').map((z) => z.trim()).filter(Boolean)) {
      rows.push({ service, zip })
    }
  }
  return rows
}

export async function createContractor(formData: FormData) {
  const id = uuidv4()
  const name = (formData.get('name') as string).trim()
  const phone = (formData.get('phone') as string).trim()
  const email = (formData.get('email') as string | null)?.trim() || null
  const priority_rank = parseInt(formData.get('priority_rank') as string, 10) || 100
  const quotes_from_photos = formData.get('quotes_from_photos') === 'on' ? 1 : 0

  db.prepare(`
    INSERT INTO contractors (id, name, phone, email, priority_rank, quotes_from_photos)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, name, phone, email, priority_rank, quotes_from_photos)

  const insertService = db.prepare(`
    INSERT OR IGNORE INTO contractor_services (contractor_id, service, coverage_zip)
    VALUES (?, ?, ?)
  `)
  for (const { service, zip } of parseCoverage(formData)) {
    insertService.run(id, service, zip)
  }

  redirect('/admin/contractors')
}

export async function setContractorActive(formData: FormData) {
  const id = formData.get('id') as string
  const active = formData.get('active') === '1' ? 1 : 0
  db.prepare('UPDATE contractors SET active=? WHERE id=?').run(active, id)
  revalidatePath('/admin/contractors')
}
