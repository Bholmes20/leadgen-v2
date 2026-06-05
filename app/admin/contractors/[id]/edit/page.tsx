export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import db from '@/lib/db'
import { ContractorForm } from '../../ContractorForm'

type Contractor = {
  id: string
  name: string
  phone: string
  email: string | null
  priority_rank: number
  rating: number | null
  quotes_from_photos: number
  active: number
}

type ServiceRow = { service: string; coverage_zip: string }

export default async function EditContractorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const contractor = db
    .prepare('SELECT * FROM contractors WHERE id=?')
    .get(id) as Contractor | undefined

  if (!contractor) notFound()

  const serviceRows = db
    .prepare('SELECT service, coverage_zip FROM contractor_services WHERE contractor_id=? ORDER BY service, coverage_zip')
    .all(id) as ServiceRow[]

  const junkZips = serviceRows
    .filter((r) => r.service === 'junk-removal')
    .map((r) => r.coverage_zip)
    .join(', ')

  const landscapingZips = serviceRows
    .filter((r) => r.service === 'landscaping')
    .map((r) => r.coverage_zip)
    .join(', ')

  async function updateContractor(formData: FormData) {
    'use server'
    const name = (formData.get('name') as string).trim()
    const phone = (formData.get('phone') as string).trim()
    const email = (formData.get('email') as string | null)?.trim() || null
    const priority_rank = parseInt(formData.get('priority_rank') as string, 10) || 100
    const quotes_from_photos = formData.get('quotes_from_photos') === 'on' ? 1 : 0

    db.prepare(`
      UPDATE contractors SET name=?, phone=?, email=?, priority_rank=?, quotes_from_photos=?
      WHERE id=?
    `).run(name, phone, email, priority_rank, quotes_from_photos, id)

    db.prepare('DELETE FROM contractor_services WHERE contractor_id=?').run(id)

    const insert = db.prepare(`
      INSERT OR IGNORE INTO contractor_services (contractor_id, service, coverage_zip)
      VALUES (?, ?, ?)
    `)
    for (const service of ['junk-removal', 'landscaping'] as const) {
      const raw = (formData.get(`coverage_${service}`) as string | null) ?? ''
      for (const zip of raw.split(',').map((z) => z.trim()).filter(Boolean)) {
        insert.run(id, service, zip)
      }
    }

    revalidatePath('/admin/contractors')
    redirect('/admin/contractors')
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link href="/admin/contractors" className="text-sm text-gray-500 hover:text-gray-700">
            ← Contractors
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Edit Contractor</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ContractorForm
            action={updateContractor}
            contractor={contractor}
            junkZips={junkZips}
            landscapingZips={landscapingZips}
          />
        </div>
      </div>
    </main>
  )
}
