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
      `Hi ${firstName}, just checking to see if you still need help with your ${service} project. Let us know if you have any questions. - Esee Property Services`,
    nextOffsetDays: 2,
  },
  {
    count: 1,
    subject: 'followup_2',
    message: (firstName) =>
      `Hi ${firstName}, we're following up on your quote request. If you still need help, we're happy to provide a free estimate. Reply or call us at ${BUSINESS_PHONE}. - Esee Property Services`,
    nextOffsetDays: 4,
  },
  {
    count: 2,
    subject: 'followup_3',
    message: (firstName) =>
      `Hi ${firstName}, before we close your request, we wanted to see if you still need service. We're here if you do! - Esee Property Services`,
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
  return `Hi ${firstName}, thanks for contacting Esee Property Services! We received your ${service} request and will contact you shortly. If you have photos of the project, feel free to reply with them for a faster quote.`
}

export function buildBrandonAlertSMS(name: string, phone: string, service: string, address: string): string {
  const svc = service === 'junk-removal' ? 'Junk Removal' : 'Landscaping'
  return `New ${svc} Lead\nName: ${name}\nPhone: ${phone}\nAddress: ${address}`
}

export function buildReviewSMS(firstName: string, reviewLink: string): string {
  return `Hi ${firstName}, thank you for choosing Esee Property Services! Reviews help small businesses like ours tremendously. Would you mind leaving us a quick Google review? ${reviewLink} Thanks!`
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
