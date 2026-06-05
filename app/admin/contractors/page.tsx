export const dynamic = 'force-dynamic'

import Link from 'next/link'
import db from '@/lib/db'
import { setContractorActive } from './actions'

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

type ServiceRow = {
  contractor_id: string
  service: string
  coverage_zip: string
}

function serviceLabel(s: string) {
  if (s === 'junk-removal') return 'Junk'
  if (s === 'landscaping') return 'Landscape'
  return s
}

export default function ContractorsPage() {
  const contractors = db
    .prepare('SELECT * FROM contractors ORDER BY priority_rank ASC, name ASC')
    .all() as Contractor[]

  const serviceRows = db
    .prepare('SELECT contractor_id, service, coverage_zip FROM contractor_services ORDER BY service, coverage_zip')
    .all() as ServiceRow[]

  const coverageMap = new Map<string, ServiceRow[]>()
  for (const row of serviceRows) {
    if (!coverageMap.has(row.contractor_id)) coverageMap.set(row.contractor_id, [])
    coverageMap.get(row.contractor_id)!.push(row)
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contractors</h1>
            <p className="text-sm text-gray-500 mt-1">{contractors.length} total</p>
          </div>
          <Link
            href="/admin/contractors/new"
            className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            + Add Contractor
          </Link>
        </div>

        {contractors.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No contractors yet.{' '}
            <Link href="/admin/contractors/new" className="underline hover:text-gray-600">
              Add one
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Coverage</th>
                    <th className="px-4 py-3">Flags</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {contractors.map((c) => {
                    const rows = coverageMap.get(c.id) ?? []

                    const byService = new Map<string, string[]>()
                    for (const r of rows) {
                      if (!byService.has(r.service)) byService.set(r.service, [])
                      byService.get(r.service)!.push(r.coverage_zip)
                    }

                    return (
                      <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${!c.active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-3 text-gray-500 tabular-nums">{c.priority_rank}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          <a href={`tel:${c.phone}`} className="hover:text-green-600">{c.phone}</a>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[260px]">
                          {byService.size === 0 ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <div className="space-y-0.5">
                              {Array.from(byService.entries()).map(([svc, zips]) => (
                                <div key={svc} className="text-xs">
                                  <span className="font-medium text-gray-700">{serviceLabel(svc)}:</span>{' '}
                                  {zips.join(', ')}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.quotes_from_photos === 1 && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                              Photo quotes
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${c.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {c.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Link
                              href={`/admin/contractors/${c.id}/edit`}
                              className="text-xs text-gray-500 hover:text-gray-700 underline"
                            >
                              Edit
                            </Link>
                            <form action={setContractorActive}>
                              <input type="hidden" name="id" value={c.id} />
                              <input type="hidden" name="active" value={c.active ? '0' : '1'} />
                              <button
                                type="submit"
                                className="text-xs text-gray-500 hover:text-gray-700 underline"
                              >
                                {c.active ? 'Disable' : 'Enable'}
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
