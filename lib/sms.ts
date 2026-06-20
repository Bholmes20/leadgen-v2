import db from './db'
import { v4 as uuidv4 } from 'uuid'

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER

export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return null
}

export async function sendSMS({
  to,
  body,
  leadId,
  subject,
}: {
  to: string
  body: string
  leadId?: string
  subject?: string
}): Promise<void> {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    console.warn('sms: Twilio credentials not set — skipping')
    return
  }

  const normalized = normalizePhone(to)
  if (!normalized) {
    console.warn(`sms: invalid phone: ${to}`)
    return
  }

  const commId = leadId ? uuidv4() : null

  if (commId && leadId) {
    db.prepare(`
      INSERT INTO communications (id, lead_id, type, direction, subject, body, status)
      VALUES (?, ?, 'sms', 'outbound', ?, ?, 'pending')
    `).run(commId, leadId, subject ?? 'sms', body)
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`
    const auth = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64')

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: FROM_NUMBER, To: normalized, Body: body }).toString(),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '(unreadable)')
      throw new Error(`Twilio ${res.status}: ${text}`)
    }

    const data = (await res.json()) as { sid: string }

    if (commId) {
      db.prepare(`
        UPDATE communications SET status='sent', external_id=? WHERE id=?
      `).run(data.sid, commId)
    }
  } catch (err) {
    if (commId) {
      db.prepare(`
        UPDATE communications SET status='failed', error=? WHERE id=?
      `).run(String(err), commId)
    }
    throw err
  }
}
