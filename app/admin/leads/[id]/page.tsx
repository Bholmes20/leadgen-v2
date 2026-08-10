export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import db from '@/lib/db'
import { matchContractors } from '@/lib/matching'
import { assignContractor, updateAssignment, saveNotes } from '../actions'

type Lead = {
  id: string
  created_at: string
  service: string
  name: string
  email: string
  phone: string
  address: string
  zip: string | null
  details: string | null
  photos: string | null
  estimate_low: number | null
  estimate_high: number | null
  status: string
  last_contacted_at: string | null
  next_followup_at: string | null
  followup_count: number
  notes: string | null
  review_send_at: string | null
  source_page: string | null
  niche: string | null
  city: string | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_term: string | null
  utm_content: string | null
  referrer_url: string | null
  source_id: string | null
}

type Assignment = {
  id: string
  contractor_id: string
  status: string
  offered_at: string
  responded_at: string | null
  accepted_at: string | null
  quote_amount: number | null
  contractor_name: string
  contractor_phone: string
}

type Communication = {
  id: string
  created_at: string
  type: string
  direction: string
  subject: string | null
  body: string | null
  status: string
  external_id: string | null
  error: string | null
}

const ASSIGNMENT_COLORS: Record<string, string> = {
  offered:  'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-700',
  expired:  'bg-gray-100 text-gray-500',
}

const COMM_STATUS_COLORS: Record<string, string> = {
  sent:    'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  failed:  'bg-red-100 text-red-700',
}

function serviceLabel(s: string) {
  if (s === 'junk-removal') return 'Junk Removal'
  if (s === 'landscaping') return 'Landscaping'
  return s
}

function fmtDate(d: string) {
  return new Date(d + 'Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDatetime(d: string) {
  return new Date(d + 'Z').toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

function fmtDollars(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function subjectLabel(s: string | null): string {
  const map: Record<string, string> = {
    initial_customer: 'Initial greeting',
    brandon_alert:    'Brandon alert',
    followup_1:       '24-hour follow-up',
    followup_2:       '3-day follow-up',
    followup_3:       '7-day follow-up',
    review_request:   'Review request',
    stale:            'Marked stale',
  }
  return s ? (map[s] ?? s) : '—'
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(id) as Lead | undefined
  if (!lead) notFound()

  const photos: string[] = (() => {
    try { return JSON.parse(lead.photos || '[]') } catch { return [] }
  })()

  const matches = matchContractors(lead.service, lead.zip)

  const leadSource = lead.source_id
    ? (db.prepare('SELECT name, channel FROM lead_sources WHERE id=?').get(lead.source_id) as
        | { name: string; channel: string }
        | undefined)
    : undefined

  // Prettify the niche slug (e.g. "rental-property-cleanout" → "Rental Property Cleanout").
  const nicheLabel = lead.niche
    ? lead.niche.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null
  const cityLabel = lead.city
    ? lead.city.replace(/-([a-z]{2})$/i, (_, s) => `, ${s.toUpperCase()}`).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null
  const trafficSource = leadSource
    ? `${leadSource.name} (${leadSource.channel})`
    : lead.utm_source ?? null
  const hasAttribution = Boolean(
    lead.source_page || lead.niche || lead.city || lead.utm_source || lead.utm_campaign || lead.referrer_url,
  )

  const assignments = db.prepare(`
    SELECT a.*, c.name as contractor_name, c.phone as contractor_phone
    FROM assignments a
    JOIN contractors c ON c.id = a.contractor_id
    WHERE a.lead_id = ?
    ORDER BY a.offered_at DESC
  `).all(id) as Assignment[]

  const communications = db.prepare(`
    SELECT id, created_at, type, direction, subject, body, status, external_id, error
    FROM communications
    WHERE lead_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(id) as Communication[]

  const assignedContractorIds = new Set(
    assignments.filter((a) => ['offered', 'accepted'].includes(a.status)).map((a) => a.contractor_id)
  )

  const FOLLOWUP_STEPS_DUE = lead.followup_count < 3 ? 3 - lead.followup_count : 0

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <Link href="/admin/leads" className="text-sm text-gray-500 hover:text-gray-700">
            ← Leads
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{lead.name}</h1>
          <p className="text-sm text-gray-500">{serviceLabel(lead.service)} · {fmtDate(lead.created_at)}</p>
        </div>

        {/* Lead details */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Lead Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium">
                <a href={`tel:${lead.phone}`} className="hover:text-green-600">{lead.phone}</a>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium">{lead.email}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-gray-500">Address</dt>
              <dd className="font-medium">{lead.address}</dd>
            </div>
            {lead.details && (
              <div className="col-span-2">
                <dt className="text-gray-500">Details</dt>
                <dd className="font-medium">{lead.details}</dd>
              </div>
            )}
            <div>
              <dt className="text-gray-500">Internal Estimate</dt>
              <dd className="font-medium">
                {lead.estimate_low && lead.estimate_high
                  ? `$${lead.estimate_low.toLocaleString()} – $${lead.estimate_high.toLocaleString()}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd>
                <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full uppercase">
                  {lead.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Last Contacted</dt>
              <dd className="font-medium">
                {lead.last_contacted_at ? fmtDatetime(lead.last_contacted_at) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Next Follow-Up</dt>
              <dd className={`font-medium ${lead.next_followup_at ? 'text-orange-600' : 'text-gray-400'}`}>
                {lead.next_followup_at
                  ? `${fmtDatetime(lead.next_followup_at)} (step ${lead.followup_count + 1}/3)`
                  : FOLLOWUP_STEPS_DUE === 0 ? 'Complete' : '—'}
              </dd>
            </div>
            {lead.review_send_at && (
              <div className="col-span-2">
                <dt className="text-gray-500">Review SMS Scheduled</dt>
                <dd className="font-medium text-green-700">{fmtDatetime(lead.review_send_at)}</dd>
              </div>
            )}
          </dl>

          {photos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Photos ({photos.length})</p>
              <div className="flex gap-2 flex-wrap">
                {photos.map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Attribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Attribution</h2>
          {!hasAttribution ? (
            <p className="text-sm text-gray-400">
              Direct / not tracked — no landing-page or campaign data on this lead.
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-gray-500">Niche / Service</dt>
                <dd className="font-medium">{nicheLabel ?? serviceLabel(lead.service)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">City</dt>
                <dd className="font-medium">{cityLabel ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Source Page</dt>
                <dd className="font-medium break-all">
                  {lead.source_page ? (
                    <a href={lead.source_page} target="_blank" rel="noopener noreferrer" className="hover:text-green-600">
                      {lead.source_page}
                    </a>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Traffic Source</dt>
                <dd className="font-medium">{trafficSource ?? 'Direct'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Medium</dt>
                <dd className="font-medium">{lead.utm_medium ?? '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-gray-500">Campaign</dt>
                <dd className="font-medium">{lead.utm_campaign ?? '—'}</dd>
              </div>
              {(lead.utm_term || lead.utm_content) && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Term / Content</dt>
                  <dd className="font-medium">
                    {[lead.utm_term, lead.utm_content].filter(Boolean).join(' · ') || '—'}
                  </dd>
                </div>
              )}
              {lead.referrer_url && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Referrer</dt>
                  <dd className="font-medium break-all">{lead.referrer_url}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Notes</h2>
          <form
            action={async (formData: FormData) => {
              'use server'
              const notes = formData.get('notes') as string
              await saveNotes(id, notes)
            }}
          >
            <textarea
              name="notes"
              rows={3}
              defaultValue={lead.notes ?? ''}
              placeholder="Add internal notes…"
              className="w-full text-sm rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
            />
            <button
              type="submit"
              className="mt-2 text-xs bg-gray-900 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Save Notes
            </button>
          </form>
        </div>

        {/* Matched contractors */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">
            Matched Contractors
            {lead.zip ? (
              <span className="ml-2 font-normal text-gray-400">ZIP {lead.zip}</span>
            ) : (
              <span className="ml-2 font-normal text-amber-600 text-xs">No ZIP on file — showing all active for this service</span>
            )}
          </h2>

          {matches.length === 0 ? (
            <p className="text-sm text-gray-400 mt-3">
              No active contractors found for {serviceLabel(lead.service)}
              {lead.zip ? ` in ZIP ${lead.zip}` : ''}.{' '}
              <Link href="/admin/contractors/new" className="underline hover:text-gray-600">Add one</Link>.
            </p>
          ) : (
            <table className="min-w-full text-sm mt-3">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="pb-2 pr-4">Rank</th>
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Phone</th>
                  <th className="pb-2 pr-4">ZIPs</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {matches.map((m) => {
                  const alreadyAssigned = assignedContractorIds.has(m.id)
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-500 tabular-nums">{m.priority_rank}</td>
                      <td className="py-2 pr-4 font-medium text-gray-900 whitespace-nowrap">{m.name}</td>
                      <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                        <a href={`tel:${m.phone}`} className="hover:text-green-600">{m.phone}</a>
                      </td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">{m.covered_zips.join(', ')}</td>
                      <td className="py-2">
                        {alreadyAssigned ? (
                          <span className="text-xs text-gray-400">Offered</span>
                        ) : (
                          <form action={assignContractor}>
                            <input type="hidden" name="lead_id" value={lead.id} />
                            <input type="hidden" name="contractor_id" value={m.id} />
                            <button
                              type="submit"
                              className="text-xs bg-gray-900 text-white px-3 py-1 rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              Assign
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Assignment history */}
        {assignments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Assignment History</h2>
            <div className="space-y-4">
              {assignments.map((a) => (
                <div key={a.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{a.contractor_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        <a href={`tel:${a.contractor_phone}`} className="hover:text-green-600">{a.contractor_phone}</a>
                        {' · '}Offered {fmtDate(a.offered_at)}
                      </p>
                      {a.accepted_at && (
                        <p className="text-xs text-green-600 mt-0.5">Accepted {fmtDate(a.accepted_at)}</p>
                      )}
                      {a.quote_amount && (
                        <p className="text-xs text-gray-700 mt-0.5 font-medium">
                          Quote: {fmtDollars(a.quote_amount)}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ASSIGNMENT_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {a.status}
                    </span>
                  </div>

                  <form action={updateAssignment} className="mt-3 pt-3 border-t border-gray-50 flex items-end gap-3 flex-wrap">
                    <input type="hidden" name="assignment_id" value={a.id} />
                    <input type="hidden" name="lead_id" value={lead.id} />

                    <label className="block">
                      <span className="text-xs text-gray-500">Status</span>
                      <select
                        name="status"
                        defaultValue={a.status}
                        className="mt-0.5 block text-xs rounded border border-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      >
                        <option value="offered">offered</option>
                        <option value="accepted">accepted</option>
                        <option value="declined">declined</option>
                        <option value="expired">expired</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-xs text-gray-500">Contractor Quote ($)</span>
                      <input
                        name="quote_amount"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={a.quote_amount ? (a.quote_amount / 100).toFixed(2) : ''}
                        placeholder="0.00"
                        className="mt-0.5 block w-28 text-xs rounded border border-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400"
                      />
                    </label>

                    <button
                      type="submit"
                      className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Update
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Communications log */}
        {communications.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Communications Log</h2>
            <div className="space-y-2">
              {communications.map((c) => (
                <div key={c.id} className="flex items-start gap-3 text-xs py-2 border-b border-gray-50 last:border-0">
                  <div className="w-32 shrink-0 text-gray-400 pt-0.5">{fmtDatetime(c.created_at)}</div>
                  <div className="w-16 shrink-0">
                    <span className="uppercase font-medium text-gray-500">{c.type}</span>
                    <span className="block text-gray-400">{c.direction}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700">{subjectLabel(c.subject)}</p>
                    {c.body && (
                      <p className="text-gray-500 mt-0.5 line-clamp-2">{c.body}</p>
                    )}
                    {c.error && (
                      <p className="text-red-500 mt-0.5">{c.error}</p>
                    )}
                  </div>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded font-medium ${COMM_STATUS_COLORS[c.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
