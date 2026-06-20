export const dynamic = 'force-dynamic'

import Link from 'next/link'
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
  next_followup_at: string | null
}

type Counts = {
  total: number
  new_count: number
  followup_count: number
  won_count: number
  lost_count: number
  stale_count: number
}

type View = 'all' | 'new' | 'followup' | 'won' | 'lost' | 'stale'

function buildWhere(view: View): { sql: string; params: string[] } {
  switch (view) {
    case 'new':
      return { sql: `WHERE UPPER(status) IN ('NEW','CONTACTED')`, params: [] }
    case 'followup':
      return {
        sql: `WHERE next_followup_at IS NOT NULL
                AND next_followup_at <= datetime('now')
                AND UPPER(status) NOT IN ('WON','LOST','STALE','COMPLETED','BOOKED')`,
        params: [],
      }
    case 'won':
      return { sql: `WHERE UPPER(status) IN ('WON','BOOKED','COMPLETED')`, params: [] }
    case 'lost':
      return { sql: `WHERE UPPER(status) = 'LOST'`, params: [] }
    case 'stale':
      return { sql: `WHERE UPPER(status) = 'STALE'`, params: [] }
    default:
      return { sql: '', params: [] }
  }
}

function fmt(dateStr: string) {
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function fmtDatetime(dateStr: string) {
  return new Date(dateStr + 'Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
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

const TABS: { key: View; label: string; countKey: keyof Counts }[] = [
  { key: 'all',      label: 'All',          countKey: 'total' },
  { key: 'new',      label: 'New',          countKey: 'new_count' },
  { key: 'followup', label: 'Follow-Ups Due', countKey: 'followup_count' },
  { key: 'won',      label: 'Won',          countKey: 'won_count' },
  { key: 'lost',     label: 'Lost',         countKey: 'lost_count' },
  { key: 'stale',    label: 'Stale',        countKey: 'stale_count' },
]

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view: rawView } = await searchParams
  const view: View = (['all', 'new', 'followup', 'won', 'lost', 'stale'].includes(rawView ?? '')
    ? rawView
    : 'all') as View

  const counts = db
    .prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN UPPER(status) IN ('NEW','CONTACTED') THEN 1 END) as new_count,
        COUNT(CASE WHEN next_followup_at IS NOT NULL
                     AND next_followup_at <= datetime('now')
                     AND UPPER(status) NOT IN ('WON','LOST','STALE','COMPLETED','BOOKED')
                   THEN 1 END) as followup_count,
        COUNT(CASE WHEN UPPER(status) IN ('WON','BOOKED','COMPLETED') THEN 1 END) as won_count,
        COUNT(CASE WHEN UPPER(status) = 'LOST' THEN 1 END) as lost_count,
        COUNT(CASE WHEN UPPER(status) = 'STALE' THEN 1 END) as stale_count
      FROM leads
    `)
    .get() as Counts

  const { sql, params } = buildWhere(view)
  const orderBy = view === 'followup' ? 'next_followup_at ASC' : 'created_at DESC'

  const leads = db
    .prepare(
      `SELECT id, created_at, service, name, phone, address, estimate_low, estimate_high, status, photos, next_followup_at
       FROM leads ${sql} ORDER BY ${orderBy}`
    )
    .all(...params) as Lead[]

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
        </div>

        {/* View tabs */}
        <div className="flex gap-1 mb-4 flex-wrap">
          {TABS.map((tab) => {
            const count = counts[tab.countKey]
            const active = view === tab.key
            return (
              <Link
                key={tab.key}
                href={tab.key === 'all' ? '/admin/leads' : `/admin/leads?view=${tab.key}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                    active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {leads.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No leads in this view.
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
                    {view === 'followup' && <th className="px-4 py-3">Due</th>}
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
                          <a href={`/admin/leads/${lead.id}`} className="hover:underline hover:text-gray-600">
                            {lead.name}
                          </a>
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
                        {view === 'followup' && (
                          <td className="px-4 py-3 text-orange-600 text-xs whitespace-nowrap">
                            {lead.next_followup_at ? fmtDatetime(lead.next_followup_at) : '—'}
                          </td>
                        )}
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
