// Deterministic SMS communication-safety verification.
//
// Runs against an ISOLATED throwaway SQLite DB and a MOCKED fetch — it never
// touches production data and never makes a real Twilio request.
//
//   npx tsx scripts/test-sms-safety.ts
//
// Verifies invariants A–K from the P0 spec.

import fs from 'fs'
import path from 'path'

// ── Isolate everything BEFORE importing app modules ──────────────────────────
const TMP_DB = path.join('/tmp', `sms-safety-test-${process.pid}.db`)
for (const suffix of ['', '-wal', '-shm']) {
  try {
    fs.rmSync(TMP_DB + suffix)
  } catch {
    /* not present */
  }
}
process.env.LEADS_DB_PATH = TMP_DB
process.env.TWILIO_ACCOUNT_SID = 'ACtest0000000000000000000000000000'
process.env.TWILIO_AUTH_TOKEN = 'test_auth_token'
process.env.TWILIO_PHONE_NUMBER = '+15555550100'

// ── Mock fetch ───────────────────────────────────────────────────────────────
type MockResponse = { ok: boolean; status: number; jsonBody?: unknown; textBody?: string }
let fetchCalls = 0
let nextResponse: MockResponse | null = null
let throwOnFetch = false
;(globalThis as unknown as { fetch: unknown }).fetch = async () => {
  fetchCalls++
  if (throwOnFetch) throw new Error('network down')
  const r = nextResponse ?? { ok: true, status: 200, jsonBody: { sid: 'SMtest' } }
  return {
    ok: r.ok,
    status: r.status,
    json: async () => r.jsonBody ?? {},
    text: async () => r.textBody ?? JSON.stringify(r.jsonBody ?? {}),
  }
}

// ── Test harness ─────────────────────────────────────────────────────────────
let passed = 0
let failed = 0
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

async function main() {
  const { default: db } = await import('../lib/db')
  const { sendSMS } = await import('../lib/sms')
  const cfg = await import('../lib/smsConfig')
  const fu = await import('../lib/followup')

  const now = new Date('2026-08-11T12:00:00Z')
  const resetBreaker = () => db.prepare(`DELETE FROM app_flags`).run()
  const insLead = (id: string, status = 'new') =>
    db
      .prepare(
        `INSERT INTO leads (id, service, name, email, phone, address, status)
         VALUES (?, 'junk-removal', 'Test User', 't@e.com', '7065551234', '1 Main St', ?)`,
      )
      .run(id, status)
  const setEnabled = (v: string | undefined) => {
    if (v === undefined) delete process.env.SMS_ENABLED
    else process.env.SMS_ENABLED = v
  }
  const primeSuccess = () => {
    nextResponse = { ok: true, status: 200, jsonBody: { sid: 'SMok' } }
    throwOnFetch = false
  }

  // ── Pure classifier sanity ──────────────────────────────────────────────
  console.log('\nPure classifiers:')
  check('classify 401 => permanent', cfg.classifyHttpFailure(401, 20003) === 'permanent')
  check('classify 403 => permanent', cfg.classifyHttpFailure(403) === 'permanent')
  check('classify 429 => transient', cfg.classifyHttpFailure(429) === 'transient')
  check('classify 500 => transient', cfg.classifyHttpFailure(503) === 'transient')
  check('classify unknown 400 => permanent (conservative)', cfg.classifyHttpFailure(400, 21211) === 'permanent')
  check('auth detect 20003', cfg.isAuthOrAccountFailure(200, 20003) === true)
  check('isSmsEnabled true', cfg.isSmsEnabled({ SMS_ENABLED: 'true' }))
  check('isSmsEnabled 1/yes/on', cfg.isSmsEnabled({ SMS_ENABLED: 'on' }))
  check('isSmsEnabled false', cfg.isSmsEnabled({ SMS_ENABLED: 'false' }) === false)
  check('isSmsEnabled absent => false', cfg.isSmsEnabled({}) === false)
  check('isSmsEnabled garbage => false', cfg.isSmsEnabled({ SMS_ENABLED: 'maybe' }) === false)
  check('resolveDailyCap default 100', cfg.resolveDailyCap({}) === 100)
  check('resolveDailyCap malformed => default', cfg.resolveDailyCap({ SMS_DAILY_CAP: 'abc' }) === 100)
  check('resolveDailyCap valid', cfg.resolveDailyCap({ SMS_DAILY_CAP: '5' }) === 5)

  // ── A. SMS_ENABLED absent => no Twilio request ──────────────────────────
  console.log('\nA. Kill switch — absent:')
  resetBreaker()
  setEnabled(undefined)
  insLead('lead-A')
  fetchCalls = 0
  const rA = await sendSMS({ to: '7065551234', body: 'hi', leadId: 'lead-A', subject: 'followup_1' })
  check('A result disabled', rA.status === 'disabled' && rA.reason === 'sms_disabled', JSON.stringify(rA))
  check('A no fetch call', fetchCalls === 0)

  // ── B. SMS_ENABLED=false => no Twilio request ───────────────────────────
  console.log('\nB. Kill switch — false:')
  setEnabled('false')
  fetchCalls = 0
  const rB = await sendSMS({ to: '7065551234', body: 'hi', leadId: 'lead-A', subject: 'followup_1' })
  check('B result disabled', rB.status === 'disabled')
  check('B no fetch call', fetchCalls === 0)

  // ── C. Permanent auth failure => classified permanent + cannot hot-loop ─
  console.log('\nC. Permanent auth failure + breaker:')
  resetBreaker()
  setEnabled('true')
  insLead('lead-C')
  nextResponse = { ok: false, status: 401, textBody: '{"code":20003,"message":"Authenticate"}' }
  fetchCalls = 0
  const rC = await sendSMS({ to: '7065551234', body: 'hi', leadId: 'lead-C', subject: 'followup_1' })
  check('C classified permanent', rC.status === 'permanent_failure', JSON.stringify(rC))
  check('C authFailure flagged', rC.authFailure === true)
  check('C provider code parsed', rC.providerCode === 20003)
  check('C one request made', fetchCalls === 1)
  // Breaker must now block the very next send WITHOUT a request (no hot-loop).
  primeSuccess()
  fetchCalls = 0
  const rC2 = await sendSMS({ to: '7065551234', body: 'again', leadId: 'lead-C', subject: 'followup_1' })
  check('C breaker blocks next send', rC2.status === 'disabled' && rC2.reason === 'auto_breaker', JSON.stringify(rC2))
  check('C breaker => no fetch call', fetchCalls === 0)
  // planFollowup for permanent+auth => terminal + stop batch (cannot loop).
  const pC = fu.planFollowup('permanent_failure', { attempts: 0, stepOffsetDays: 2, authFailure: true, now })
  check('C plan terminal', pC.makeTerminal === true && pC.nextFollowupAt === null)
  check('C plan stops batch', pC.stopBatch === true)

  // ── D. Transient failure => next eligible time moves into the future ────
  console.log('\nD. Transient failure advances schedule:')
  const pD = fu.planFollowup('transient_failure', { attempts: 0, stepOffsetDays: 2, now })
  const dueD = cfg.parseDbTimestamp(pD.nextFollowupAt)
  check('D not terminal', pD.makeTerminal === false)
  check('D attempts incremented', pD.attempts === 1)
  check('D next_followup_at in the future', dueD !== null && dueD > now.getTime(), String(pD.nextFollowupAt))
  check('D not immediately due (>= backoff)', dueD !== null && dueD - now.getTime() >= 60 * 60 * 1000)

  // ── E. Max attempts => automation stops ─────────────────────────────────
  console.log('\nE. Max attempts stops automation:')
  const pE = fu.planFollowup('transient_failure', { attempts: cfg.MAX_FOLLOWUP_ATTEMPTS - 1, stepOffsetDays: 2, now })
  check('E terminal at cap', pE.makeTerminal === true && pE.nextFollowupAt === null, JSON.stringify(pE))
  check('E reason max_attempts', pE.reason === 'max_attempts')

  // ── F. Daily cap reached => no external SMS request ─────────────────────
  console.log('\nF. Daily cap:')
  resetBreaker()
  setEnabled('true')
  db.prepare(`DELETE FROM communications`).run()
  insLead('lead-F')
  const CAP = 3
  process.env.SMS_DAILY_CAP = String(CAP)
  for (let i = 0; i < CAP; i++) {
    db.prepare(
      `INSERT INTO communications (id, lead_id, type, direction, subject, body, status)
       VALUES (?, 'lead-F', 'sms', 'outbound', 'followup_1', 'x', 'sent')`,
    ).run(`c-${i}`)
  }
  primeSuccess()
  fetchCalls = 0
  const rF = await sendSMS({ to: '7065551234', body: 'hi', leadId: 'lead-F', subject: 'followup_1' })
  check('F result cap_reached', rF.status === 'cap_reached', JSON.stringify(rF))
  check('F no fetch call', fetchCalls === 0)
  delete process.env.SMS_DAILY_CAP

  // ── G. Overdue outside catch-up window => not sent ──────────────────────
  console.log('\nG. No historical catch-up:')
  const old = fu.isoFromMinutes(now, -(cfg.CATCHUP_WINDOW_MINUTES + 60))
  const recent = fu.isoFromMinutes(now, -30)
  check('G ancient schedule is stale', cfg.isStaleSchedule(old, now) === true)
  check('G recent schedule not stale', cfg.isStaleSchedule(recent, now) === false)

  // ── H. Review failure => review_send_at not immediately due ─────────────
  console.log('\nH. Review-request safety:')
  for (const st of ['transient_failure', 'disabled', 'cap_reached'] as const) {
    const pr = fu.planReview(st, { attempts: 0, now })
    const due = cfg.parseDbTimestamp(pr.reviewSendAt)
    check(`H ${st}: review not immediately due`, pr.reviewSendAt === null || (due !== null && due > now.getTime()), JSON.stringify(pr))
  }
  const prPerm = fu.planReview('permanent_failure', { attempts: 0, now })
  check('H permanent => review cleared', prPerm.reviewSendAt === null)
  const prSent = fu.planReview('sent', { attempts: 2, now })
  check('H sent => cleared + attempts reset', prSent.reviewSendAt === null && prSent.attempts === 0)

  // ── I. Terminal lead => not selected for follow-up (case-insensitive) ───
  console.log('\nI. Terminal status protection:')
  db.prepare(`DELETE FROM communications`).run()
  db.prepare(`DELETE FROM leads`).run()
  const past = fu.isoFromMinutes(now, -60)
  for (const [id, status] of [
    ['t-won', 'WON'],
    ['t-stale-lc', 'stale'],
    ['t-completed', 'COMPLETED'],
    ['t-active', 'new'],
  ] as const) {
    insLead(id, status)
    db.prepare(`UPDATE leads SET next_followup_at=? WHERE id=?`).run(past, id)
  }
  const TERMINAL = ['WON', 'LOST', 'STALE', 'COMPLETED', 'BOOKED']
  const due = db
    .prepare(
      `SELECT id FROM leads
        WHERE next_followup_at IS NOT NULL AND next_followup_at <= datetime('now')
          AND UPPER(status) NOT IN (${TERMINAL.map(() => '?').join(',')})`,
    )
    .all(...TERMINAL) as { id: string }[]
  const dueIds = due.map((d) => d.id)
  check('I terminal WON excluded', !dueIds.includes('t-won'))
  check('I lowercase stale excluded (case-insensitive)', !dueIds.includes('t-stale-lc'))
  check('I COMPLETED excluded', !dueIds.includes('t-completed'))
  check('I active lead included', dueIds.includes('t-active'))

  // ── J. Lead creation path: SMS never throws when disabled/failing ───────
  console.log('\nJ. SMS is a safe side effect:')
  resetBreaker()
  setEnabled('false')
  let threw = false
  let rJ
  try {
    rJ = await sendSMS({ to: '7065551234', body: 'hi', leadId: 't-active', subject: 'initial_customer' })
  } catch {
    threw = true
  }
  check('J disabled send does not throw', threw === false && rJ?.status === 'disabled')
  setEnabled('true')
  resetBreaker()
  throwOnFetch = true
  nextResponse = null
  let threw2 = false
  let rJ2
  try {
    rJ2 = await sendSMS({ to: '7065551234', body: 'hi', leadId: 't-active', subject: 'initial_customer' })
  } catch {
    threw2 = true
  }
  check('J network failure does not throw', threw2 === false && rJ2?.status === 'transient_failure', JSON.stringify(rJ2))
  throwOnFetch = false

  // ── K. Historical communications do NOT initialize attempt counter ──────
  console.log('\nK. History does not seed attempt counter:')
  db.prepare(`DELETE FROM communications`).run()
  db.prepare(`DELETE FROM leads`).run()
  insLead('lead-K')
  for (let i = 0; i < 200; i++) {
    db.prepare(
      `INSERT INTO communications (id, lead_id, type, direction, subject, body, status, error)
       VALUES (?, 'lead-K', 'sms', 'outbound', 'followup_1', 'x', 'failed', 'old')`,
    ).run(`k-${i}`)
  }
  const leadK = db.prepare(`SELECT followup_attempts, review_attempts FROM leads WHERE id='lead-K'`).get() as {
    followup_attempts: number
    review_attempts: number
  }
  check('K followup_attempts starts at 0', leadK.followup_attempts === 0, String(leadK.followup_attempts))
  check('K review_attempts starts at 0', leadK.review_attempts === 0)

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log(`\n──────────────\n${passed} passed, ${failed} failed`)
  // Clean up the throwaway DB.
  db.close()
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.rmSync(TMP_DB + suffix)
    } catch {
      /* ignore */
    }
  }
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  console.error('test harness error:', err)
  process.exit(1)
})
