// Real Google Analytics 4 (GA4) Data API client — zero external dependencies.
//
// Mirrors gscClient.ts: Node 22's global fetch + crypto (RS256) let us implement
// the service-account OAuth2 flow and the GA4 Data API `runReport` call directly:
//   1. build a service-account JWT (RS256, analytics READ-ONLY scope)
//   2. exchange it for a short-lived access token
//   3. call properties/{id}:runReport and page through the rows
//
// SECURITY: least-privilege READ-ONLY scope (analytics.readonly). Credentials are
// read from env only (via the shared loadServiceAccount), never logged, never
// returned in errors, never stored. Error messages carry HTTP status codes only —
// no bodies, no tokens, no key material. Until credentials + a property exist this
// module is never called (the adapter reports NOT_CONNECTED).

import crypto from "node:crypto";
import { loadServiceAccount, type ServiceAccount } from "./gscClient";
import type { Ga4Query, Ga4PageRow } from "./adapters";

const GA4_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA4_API = "https://analyticsdata.googleapis.com/v1beta";
// The dimensions/metrics we ingest. Metrics are all universally-supported core
// metrics (no deprecated `conversions`/`keyEvents` — CRM leads are the
// authoritative conversion signal, and the downstream only consumes sessions).
const GA4_METRICS = ["sessions", "totalUsers", "screenPageViews", "engagementRate"] as const;
const MAX_PAGE_LIMIT = 100000; // GA4 Data API allows up to 250k rows/request.

/** Normalize `GA4_PROPERTY_ID` ("properties/123" or "123") to a bare numeric id. */
export function normalizePropertyId(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.trim().replace(/^properties\//, "").trim();
  return /^\d+$/.test(digits) ? digits : null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccount, nowSec: number): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: sa.client_email, scope: GA4_SCOPE, aud: TOKEN_URL, iat: nowSec, exp: nowSec + 3600 }),
  );
  const signingInput = `${header}.${claims}`;
  let signature: string;
  try {
    signature = base64url(crypto.createSign("RSA-SHA256").update(signingInput).sign(sa.private_key));
  } catch {
    // A malformed private key must not leak into logs/errors.
    throw new Error("GA4 token signing failed (invalid service-account key)");
  }
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`GA4 token exchange failed (HTTP ${res.status})`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("GA4 token exchange returned no access_token");
  return json.access_token;
}

/**
 * Fetch per-page aggregate metrics for a GA4 property over a date range (one row
 * per pagePath, summed across the window). Returns [] only when the API genuinely
 * returns no rows. Throws a sanitized error on failure. `nowSec` is injectable for
 * deterministic tests.
 */
export async function fetchPageMetrics(
  propertyId: string,
  q: Ga4Query,
  nowSec?: number,
): Promise<Ga4PageRow[]> {
  const sa = loadServiceAccount();
  if (!sa) throw new Error("GA4 service account not configured");
  const prop = normalizePropertyId(propertyId);
  if (!prop) throw new Error("GA4 property id is not a valid numeric id");

  const token = await getAccessToken(sa, nowSec ?? Math.floor(Date.now() / 1000));
  const endpoint = `${GA4_API}/properties/${prop}:runReport`;
  const limit = Math.min(q.rowLimit ?? MAX_PAGE_LIMIT, MAX_PAGE_LIMIT);

  const out: Ga4PageRow[] = [];
  let offset = 0;
  // Guard bounds the pagination loop (100k * 40 = 4M rows worst case).
  for (let page = 0; page < 40; page++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: q.startDate, endDate: q.endDate }],
        dimensions: [{ name: "pagePath" }],
        metrics: GA4_METRICS.map((name) => ({ name })),
        limit,
        offset,
        keepEmptyRows: false,
        returnPropertyQuota: false,
      }),
    });
    if (!res.ok) throw new Error(`GA4 runReport query failed (HTTP ${res.status})`);
    const json = (await res.json()) as {
      rowCount?: number;
      rows?: Array<{ dimensionValues?: Array<{ value?: string }>; metricValues?: Array<{ value?: string }> }>;
    };
    const rows = json.rows ?? [];
    for (const r of rows) {
      const pagePath = r.dimensionValues?.[0]?.value ?? null;
      const m = r.metricValues ?? [];
      out.push({
        pagePath,
        sessions: num(m[0]?.value),
        totalUsers: num(m[1]?.value),
        screenPageViews: num(m[2]?.value),
        engagementRate: num(m[3]?.value),
      });
    }
    offset += limit;
    if (rows.length < limit || offset >= (json.rowCount ?? 0)) break;
  }
  return out;
}

function num(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
