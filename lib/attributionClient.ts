// Client-side attribution capture: reads the current URL / referrer and persists a
// merged attribution object in sessionStorage so it survives the navigation from an
// SEO landing page to /leads/new. All functions are SSR-safe (guard `window`).

import {
  type Attribution,
  ATTRIBUTION_STORAGE_KEY,
  parseUtmParams,
  mergeAttribution,
  sanitizeAttribution,
} from "./attribution";

export function getStoredAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeAttribution(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return {};
  }
}

function writeStored(a: Attribution): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* storage unavailable (private mode / disabled) — attribution is best-effort */
  }
}

/**
 * Capture attribution from the current page and merge it into sessionStorage.
 *
 * `pageAttr` carries page-level context (niche/city/service/source_page) from an SEO
 * landing page. On the lead form we call this with no args so it only picks up any
 * utm params or referrer present on /leads/new directly, without overwriting the SEO
 * page's niche/city/source_page already stored.
 */
export function captureAttribution(pageAttr: Attribution = {}): Attribution {
  if (typeof window === "undefined") return {};
  const loc = window.location;

  const incoming: Attribution = {
    ...parseUtmParams(loc.search),
    ...pageAttr,
  };

  // Only record an *external* referrer (ignore internal navigation).
  try {
    const ref = document.referrer;
    if (ref && new URL(ref).host !== loc.host) incoming.referrer = ref;
  } catch {
    /* malformed referrer — ignore */
  }

  const merged = mergeAttribution(getStoredAttribution(), incoming);
  writeStored(merged);
  return merged;
}
