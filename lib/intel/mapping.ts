// Lead ↔ page ↔ market ↔ niche mapping (P1B).
//
// Two registries have to reconcile:
//   • intel_markets / intel_niches — the research universe (lib/intel)
//   • lib/seo CITIES / NICHES        — the published landing-page factory
//
// They are linked by slug: intel_markets.seo_city_slug matches a lib/seo city
// slug exactly; an intel niche maps to a lib/seo niche only when their slugs are
// identical. Leads carry the lib/seo slugs (leads.city, leads.niche) plus a
// source_page path.
//
// CRITICAL: nothing is forced. When a lead's city/niche/page can't be resolved to
// an intel row it is reported as UNMAPPED / UNATTRIBUTED and stays visible — never
// silently discarded, never guessed.

import { listMarkets } from "./markets";
import { listNiches } from "./niches";
import { resolveSlug } from "../seo/pages";
import type { Market, Niche } from "./types";

/** Bucket labels for leads with no usable attribution. */
export const UNATTRIBUTED = "(unattributed)";
export const UNMAPPED = "(unmapped)";

/** Strip a stored source_page path down to a bare, comparable slug. */
export function normalizeSlug(path: string | null | undefined): string | null {
  if (!path) return null;
  const s = path.trim().replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
  return s.length ? s : null;
}

/** Index intel markets by their linked SEO city slug (one lookup, reusable). */
export function marketBySeoSlug(): Map<string, Market> {
  const map = new Map<string, Market>();
  for (const m of listMarkets()) {
    if (m.seo_city_slug) map.set(m.seo_city_slug.toLowerCase(), m);
  }
  return map;
}

/** Index intel niches by slug. */
export function nicheBySlug(): Map<string, Niche> {
  const map = new Map<string, Niche>();
  for (const n of listNiches()) map.set(n.slug.toLowerCase(), n);
  return map;
}

export interface MarketRef {
  citySlug: string | null;
  market: Market | null;
  mapped: boolean;
}

export interface NicheRef {
  nicheSlug: string | null;
  niche: Niche | null;
  mapped: boolean;
}

/** Resolve a lib/seo city slug to an intel market row (or UNMAPPED). */
export function resolveMarket(citySlug: string | null | undefined, index?: Map<string, Market>): MarketRef {
  const slug = normalizeSlug(citySlug);
  if (!slug) return { citySlug: null, market: null, mapped: false };
  const idx = index ?? marketBySeoSlug();
  const market = idx.get(slug) ?? null;
  return { citySlug: slug, market, mapped: market != null };
}

/** Resolve a lib/seo niche slug to an intel niche row (or UNMAPPED). */
export function resolveNiche(nicheSlug: string | null | undefined, index?: Map<string, Niche>): NicheRef {
  const slug = normalizeSlug(nicheSlug);
  if (!slug) return { nicheSlug: null, niche: null, mapped: false };
  const idx = index ?? nicheBySlug();
  const niche = idx.get(slug) ?? null;
  return { nicheSlug: slug, niche, mapped: niche != null };
}

export interface LeadAttribution {
  city?: string | null;
  niche?: string | null;
  source_page?: string | null;
}

export interface MappedLead {
  citySlug: string | null; // normalized lib/seo city slug, or null
  nicheSlug: string | null; // normalized lib/seo niche slug, or null
  pageSlug: string | null; // normalized source_page slug, or null
  pageKind: "page" | "niche" | "city" | null; // classification from the SEO registry
  market: Market | null;
  niche: Niche | null;
  marketMapped: boolean; // city slug resolved to an intel market
  nicheMapped: boolean; // niche slug resolved to an intel niche
  attributed: boolean; // has any usable attribution at all
}

/**
 * Map one lead's raw attribution fields to canonical identities. Reusable across
 * city × niche × page — no Augusta-specific logic. Everything unresolved is
 * surfaced (attributed=false / market=null / *_mapped=false), never dropped.
 */
export function mapLead(
  a: LeadAttribution,
  markets?: Map<string, Market>,
  niches?: Map<string, Niche>,
): MappedLead {
  const citySlug = normalizeSlug(a.city);
  const nicheSlug = normalizeSlug(a.niche);
  const pageSlug = normalizeSlug(a.source_page);

  const m = resolveMarket(citySlug, markets);
  const n = resolveNiche(nicheSlug, niches);

  let pageKind: MappedLead["pageKind"] = null;
  if (pageSlug) {
    const resolved = resolveSlug(pageSlug);
    pageKind = resolved ? resolved.kind : null;
  }

  return {
    citySlug,
    nicheSlug,
    pageSlug,
    pageKind,
    market: m.market,
    niche: n.niche,
    marketMapped: m.mapped,
    nicheMapped: n.mapped,
    attributed: Boolean(pageSlug || citySlug || nicheSlug),
  };
}
