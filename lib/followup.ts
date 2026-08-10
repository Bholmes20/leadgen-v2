const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? '706-828-1733'

export type FollowUpStep = {
  count: number
  subject: string
  message: (firstName: string, service: string) => string
  nextOffsetDays: number
  isStale?: true
}

export const FOLLOWUP_STEPS: FollowUpStep[] = [
  {
    count: 0,
    subject: 'followup_1',
    message: (firstName, service) =>
      `Hi ${firstName}, still need ${service}? We have openings this week. Call or text ${BUSINESS_PHONE} to lock in your free estimate. - Esee Property Services`,
    nextOffsetDays: 2,
  },
  {
    count: 1,
    subject: 'followup_2',
    message: (firstName, service) =>
      `Hi ${firstName}, we'd still love to handle your ${service}. Spots fill fast. Call or text ${BUSINESS_PHONE} for a free estimate. - Esee Property Services`,
    nextOffsetDays: 4,
  },
  {
    count: 2,
    subject: 'followup_3',
    message: (firstName, service) =>
      `Hi ${firstName}, last chance - closing your ${service} request soon. Still need it? Reply or call ${BUSINESS_PHONE}. - Esee Property Services`,
    nextOffsetDays: 7,
  },
  {
    count: 3,
    subject: 'stale',
    message: () => '',
    nextOffsetDays: 0,
    isStale: true,
  },
]

export function buildInitialCustomerSMS(firstName: string, service: string): string {
  return `Hi ${firstName}! Got your ${service} request. We'll call today to set up your free estimate. Reply with photos if you have them. - Esee Property Services`
}

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === '1') return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return raw
}

export function buildBrandonAlertSMS(
  name: string,
  phone: string,
  service: string,
  address: string,
  estimateLow?: number,
  estimateHigh?: number,
): string {
  const svc = service === 'junk-removal' ? 'Junk Removal' : 'Landscaping'
  const estLine = estimateLow && estimateHigh ? `\nEst: $${estimateLow}-$${estimateHigh}` : ''
  return `New ${svc} Lead\n${name} | ${formatPhone(phone)}\n${address}${estLine}`
}

export function buildReviewSMS(firstName: string, reviewLink: string): string {
  return `Hi ${firstName}, hope the job turned out great! Mind leaving us a Google review? Takes 30 sec: ${reviewLink} - Esee Property Services`
}

export function futureISO(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ')
}

export function serviceLabel(s: string): string {
  if (s === 'junk-removal') return 'junk removal'
  return s
}
