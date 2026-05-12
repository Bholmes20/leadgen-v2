import db from '@/lib/db'
import { StatusSelect } from './StatusSelect'

type Lead = {
  id: string
  created_at: string
  service: string
  name: string
  phone: string
  address: string
  estimate_low: number | null
  estimate_high: number | null
  status: string
  photos: string
}

function fmt(dateStr: string) {
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtEstimate(low: number | null, high: number | null) {
  if (!low && !high) return '—'
  if (low && high) return `$${low.toLocaleString()} – $${high.toLocaleString()}`
  return `$${(low ?? high)!.toLocaleString()}`
}

function serviceLabel(s: string) {
  if (s === 'junk-removal') return 'Junk Removal'
  if (s === 'landscaping') return 'Landscaping'
  return s
}

export default function AdminLeadsPage() {
  const leads = db
    .prepare('SELECT id, created_at, service, name, phone, address, estimate_low, estimate_high, status, photos FROM leads ORDER BY created_at DESC')
    .all() as Lead[]

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{leads.length} total</p>
        </div>

        {leads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No leads yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Service</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Estimate</th>
                    <th className="px-4 py-3">Photos</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => {
                    const photos: string[] = (() => {
                      try { return JSON.parse(lead.photos || '[]') } catch { return [] }
                    })()

                    return (
                      <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                          {fmt(lead.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {lead.name}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {serviceLabel(lead.service)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          <a href={`tel:${lead.phone}`} className="hover:text-green-600">
                            {lead.phone}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={lead.address}>
                          {lead.address}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {fmtEstimate(lead.estimate_low, lead.estimate_high)}
                        </td>
                        <td className="px-4 py-3">
                          {photos.length === 0 ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <div className="flex gap-1">
                              {photos.slice(0, 3).map((src, i) => (
                                <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={src}
                                    alt=""
                                    className="w-8 h-8 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              ))}
                              {photos.length > 3 && (
                                <span className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded text-xs text-gray-500 border border-gray-200">
                                  +{photos.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusSelect id={lead.id} current={lead.status} />
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
