// Shared test fixtures. Import AFTER ./_setup so lib/db opens the temp DB.
// Inserts real-shaped (but non-PII) leads directly, exercising the same columns
// the production app writes.

import db from "../../lib/db";
import { v4 as uuidv4 } from "uuid";

export interface LeadFixture {
  service?: string;
  status?: string;
  city?: string | null;
  niche?: string | null;
  source_page?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  created_at?: string;
  last_contacted_at?: string | null;
}

let n = 0;

/** Insert one lead and return its id. */
export function insertLead(f: LeadFixture = {}): string {
  const id = uuidv4();
  n += 1;
  db.prepare(
    `INSERT INTO leads
       (id, created_at, service, name, email, phone, address, status,
        city, niche, source_page, utm_source, utm_medium, utm_campaign, last_contacted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    f.created_at ?? "2026-08-01 09:00:00",
    f.service ?? "junk-removal",
    `Test ${n}`,
    `test${n}@example.test`,
    `555-000-${String(n).padStart(4, "0")}`,
    `${n} Test St`,
    f.status ?? "NEW",
    f.city ?? null,
    f.niche ?? null,
    f.source_page ?? null,
    f.utm_source ?? null,
    f.utm_medium ?? null,
    f.utm_campaign ?? null,
    f.last_contacted_at ?? null,
  );
  return id;
}

/** Remove all leads (isolate a test that asserts on absolute totals). */
export function clearLeads(): void {
  db.prepare("DELETE FROM leads").run();
}
