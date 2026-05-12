'use client'

import { useTransition } from 'react'
import { updateLeadStatus } from './actions'

const STATUSES = ['NEW', 'REVIEWED', 'SENT', 'QUOTED', 'BOOKED', 'COMPLETED', 'LOST']

const COLOR: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  REVIEWED: 'bg-yellow-100 text-yellow-800',
  SENT: 'bg-orange-100 text-orange-800',
  QUOTED: 'bg-purple-100 text-purple-800',
  BOOKED: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-700',
  LOST: 'bg-red-100 text-red-700',
}

export function StatusSelect({ id, current }: { id: string; current: string }) {
  const [isPending, startTransition] = useTransition()
  const normalized = current.toUpperCase()

  return (
    <select
      defaultValue={normalized}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value
        startTransition(() => updateLeadStatus(id, next))
      }}
      className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 disabled:opacity-50 ${COLOR[normalized] ?? 'bg-gray-100 text-gray-700'}`}
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  )
}
