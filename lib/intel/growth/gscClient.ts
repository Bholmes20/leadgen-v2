// Real Google Search Console client — zero external dependencies.
//
// Node 22 gives us global fetch + crypto (RS256), so we implement the
// service-account OAuth2 flow and the Search Console REST call directly:
//   1. build a service-account JWT (RS256, read-only scope)
//   2. exchange it for a short-lived access token
//   3. call searchAnalytics.query and page through the rows
//
// SECURITY: least-privilege READ-ONLY scope (webmasters.readonly). Credentials
// are read from env only, never logged, never returned in errors, never stored,
// never rendered. Error messages carry HTTP status codes only — no bodies, no
// tokens, no key material. Until credentials exist this module is never called
// (the adapter reports NOT_CONNECTED).

import crypto from "node:crypto";
import fs from "node:fs";
import type { SearchAnalyticsQuery, SearchAnalyticsRow } from "./adapters";

const GSC_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const GSC_API = "https://www.googleapis.com/webmasters/v3";
const MAX_ROW_LIMIT = 25000;

export interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/**
 * Load the service account from GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON or base64)
 * or GOOGLE_SERVICE_ACCOUNT_JSON_PATH. Returns null when not configured or
 * invalid — the caller then reports NOT_CONNECTED. Never logs contents.
 */
export function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const path = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH;

  let text: string | null = null;
  if (raw && raw.trim().length > 0) {
    text = raw.trim();
    if (!text.startsWith("{")) {
      // Support base64-encoded JSON (common for single-line env vars).
      try {
        const decoded = Buffer.from(text, "base64").toString("utf8");
        if (decoded.trim().startsWith("{")) text = decoded;
      } catch {
        /* leave as-is; JSON.parse will fail below */
      }
    }
  } else if (path && path.trim().length > 0) {
    try {
      text = fs.readFileSync(path.trim(), "utf8");
    } catch {
      return null;
    }
  }
  if (!text) return null;

  try {
    const obj = JSON.parse(text) as { client_email?: unknown; private_key?: unknown };
    if (typeof obj.client_email === "string" && typeof obj.private_key === "string") {
      // Normalize escaped newlines that survive single-line env storage.
      return { client_email: obj.client_email, private_key: obj.private_key.replace(/\\n/g, "\n") };
    }
  } catch {
    /* invalid JSON → treated as not configured */
  }
  return null;
}

/** True when a usable GSC service account is configured. */
export function hasGscCredentials(): boolean {
  return loadServiceAccount() !== null;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(sa: ServiceAccount, nowSec: number): Promise<string> {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: sa.client_email, scope: GSC_SCOPE, aud: TOKEN_URL, iat: nowSec, exp: nowSec + 3600 }),
  );
  const signingInput = `${header}.${claims}`;
  let signature: string;
  try {
    signature = base64url(crypto.createSign("RSA-SHA256").update(signingInput).sign(sa.private_key));
  } catch {
    // A malformed private key must not leak into logs/errors.
    throw new Error("GSC token signing failed (invalid service-account key)");
  }
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`GSC token exchange failed (HTTP ${res.status})`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error("GSC token exchange returned no access_token");
  return json.access_token;
}

/**
 * Fetch Search Analytics rows for a property over a date range, paging through
 * all results. Returns [] only when the API genuinely returns no rows. Throws a
 * sanitized error on failure. `nowSec` is injectable for deterministic tests.
 */
export async function fetchSearchAnalytics(
  property: string,
  q: SearchAnalyticsQuery,
  nowSec?: number,
): Promise<SearchAnalyticsRow[]> {
  const sa = loadServiceAccount();
  if (!sa) throw new Error("GSC service account not configured");

  const token = await getAccessToken(sa, nowSec ?? Math.floor(Date.now() / 1000));
  const dims = q.dimensions ?? ["date", "page", "query"];
  const rowLimit = Math.min(q.rowLimit ?? MAX_ROW_LIMIT, MAX_ROW_LIMIT);
  const endpoint = `${GSC_API}/sites/${encodeURIComponent(property)}/searchAnalytics/query`;

  const out: SearchAnalyticsRow[] = [];
  let startRow = 0;
  // Guard bounds the pagination loop (25k * 40 = 1M rows worst case).
  for (let page = 0; page < 40; page++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate: q.startDate, endDate: q.endDate, dimensions: dims, rowLimit, startRow }),
    });
    if (!res.ok) throw new Error(`GSC searchAnalytics query failed (HTTP ${res.status})`);
    const json = (await res.json()) as {
      rows?: Array<{ keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }>;
    };
    const rows = json.rows ?? [];
    for (const r of rows) {
      const keyed: Record<string, string> = {};
      (r.keys ?? []).forEach((v, i) => {
        if (dims[i]) keyed[dims[i]] = v;
      });
      out.push({
        date: keyed.date ?? q.endDate,
        page: keyed.page ?? null,
        query: keyed.query ?? null,
        country: keyed.country ?? null,
        device: keyed.device ?? null,
        clicks: r.clicks ?? null,
        impressions: r.impressions ?? null,
        ctr: r.ctr ?? null,
        position: r.position ?? null,
      });
    }
    if (rows.length < rowLimit) break;
    startRow += rowLimit;
  }
  return out;
}
