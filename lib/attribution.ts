// Lead-source attribution — shared, pure helpers (safe on client and server; no DOM
// access here so these can be unit-tested and imported anywhere). DOM/sessionStorage
// wrappers live in lib/attributionClient.ts.

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;
export type UtmKey = (typeof UTM_KEYS)[number];

export interface Attribution {
  niche?: string;
  city?: string;
  service?: string; // leadService derived from the niche — used only to prefill the form
  source_page?: string; // pathname of the SEO landing page that drove the visit
  referrer?: string; // external document.referrer (first-touch)
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

export const ATTRIBUTION_STORAGE_KEY = "esee_attr";

// Everything we persist in sessionStorage (includes `service` for form prefill).
export const ATTRIBUTION_FIELDS = [
  "niche",
  "city",
  "service",
  "source_page",
  "referrer",
  ...UTM_KEYS,
] as const;

// What actually gets submitted with the lead + read by the API. Excludes `service`
// (the lead form already has a real `service` field the user picks / we prefill).
export const SUBMITTED_ATTRIBUTION_FIELDS = [
  "niche",
  "city",
  "source_page",
  "referrer",
  ...UTM_KEYS,
] as const;

const MAX_LEN = 512;

function clean(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, MAX_LEN);
}

/** Parse utm_* params from a query string (e.g. window.location.search). Never throws. */
export function parseUtmParams(search: string): Attribution {
  const out: Attribution = {};
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return out;
  }
  for (const k of UTM_KEYS) {
    const v = clean(params.get(k));
    if (v) out[k] = v;
  }
  return out;
}

/**
 * Merge previously-stored attribution with a fresh capture.
 * - niche / city / service / source_page: LAST-touch (the page that drove the visitor
 *   to convert is the most relevant "which page generated it").
 * - referrer + utm_*: FIRST-touch (keep the original campaign/referrer that started
 *   the session; internal navigation without UTMs must not wipe them).
 */
export function mergeAttribution(stored: Attribution, incoming: Attribution): Attribution {
  const out: Attribution = { ...stored };
  for (const k of ["niche", "city", "service", "source_page"] as const) {
    const v = clean(incoming[k]);
    if (v) out[k] = v;
  }
  for (const k of ["referrer", ...UTM_KEYS] as const) {
    if (!clean(out[k])) {
      const v = clean(incoming[k]);
      if (v) out[k] = v;
    }
  }
  return out;
}

/** Normalize an arbitrary object (parsed storage / form data) into clean Attribution. */
export function sanitizeAttribution(raw: Record<string, unknown>): Attribution {
  const out: Attribution = {};
  for (const k of ATTRIBUTION_FIELDS) {
    const v = clean(raw[k]);
    if (v) out[k] = v;
  }
  return out;
}

/** Attribution → flat string map for FormData.append (submitted fields only, skips empties). */
export function attributionToFields(a: Attribution): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of SUBMITTED_ATTRIBUTION_FIELDS) {
    const v = clean(a[k]);
    if (v) out[k] = v;
  }
  return out;
}
