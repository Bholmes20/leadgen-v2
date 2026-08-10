import type { City, Faq, LocalContent, Niche, ResolvedPage } from "./types";
import { NICHES } from "./niches";
import { CITIES } from "./cities";
import { LOCAL_CONTENT } from "./content";

// Publish gate: a local-content entry must have a real intro and at least one
// city-specific FAQ before its niche × city page goes live. Keeps the factory from
// shipping thin doorway pages.
const MIN_INTRO_CHARS = 80;

const nicheBySlug = new Map<string, Niche>(NICHES.map((n) => [n.slug, n]));
const cityBySlug = new Map<string, City>(CITIES.map((c) => [c.slug, c]));

/** Flat keyword slug: `${niche}-${city}` → e.g. "carpet-removal-augusta-ga". */
export function buildSlug(nicheSlug: string, citySlug: string): string {
  return `${nicheSlug}-${citySlug}`;
}

function isPublishable(content: LocalContent): boolean {
  return content.intro.trim().length >= MIN_INTRO_CHARS && content.localFaqs.length >= 1;
}

function resolve(content: LocalContent): ResolvedPage {
  const niche = nicheBySlug.get(content.niche);
  const city = cityBySlug.get(content.city);
  if (!niche) {
    throw new Error(`[lib/seo] content entry references unknown niche "${content.niche}"`);
  }
  if (!city) {
    throw new Error(`[lib/seo] content entry references unknown city "${content.city}"`);
  }
  const pricing = content.pricingOverride ?? niche.pricing;
  const faqs: Faq[] = [...niche.faqs, ...content.localFaqs];
  return { slug: buildSlug(niche.slug, city.slug), niche, city, content, pricing, faqs };
}

// Build + validate the published set once at module load. Bad slug references and
// duplicate niche×city combos are hard errors — they should fail the build, not
// silently drop a page.
const seen = new Set<string>();
const PAGES: ResolvedPage[] = [];
for (const content of LOCAL_CONTENT) {
  const key = `${content.niche}::${content.city}`;
  if (seen.has(key)) {
    throw new Error(`[lib/seo] duplicate content entry for ${key}`);
  }
  seen.add(key);

  const page = resolve(content); // throws on unknown niche/city slugs
  if (isPublishable(content)) {
    PAGES.push(page);
  }
}

const pageBySlug = new Map<string, ResolvedPage>(PAGES.map((p) => [p.slug, p]));

/** All published pages, in content-declaration order. */
export function getPublishedPages(): ResolvedPage[] {
  return PAGES;
}

/** Slugs for generateStaticParams(): `getPublishedSlugs().map((slug) => ({ slug }))`. */
export function getPublishedSlugs(): string[] {
  return PAGES.map((p) => p.slug);
}

/** Resolve a slug to its page, or null (→ notFound()) if not published. */
export function getPageBySlug(slug: string): ResolvedPage | null {
  return pageBySlug.get(slug) ?? null;
}

export function isPublishedSlug(slug: string): boolean {
  return pageBySlug.has(slug);
}

/** All published pages for one niche (for niche hub pages / internal linking). */
export function getPagesForNiche(nicheSlug: string): ResolvedPage[] {
  return PAGES.filter((p) => p.niche.slug === nicheSlug);
}

/** All published pages for one city (for city hub pages / internal linking). */
export function getPagesForCity(citySlug: string): ResolvedPage[] {
  return PAGES.filter((p) => p.city.slug === citySlug);
}

/**
 * Published pages for the same niche in the city's `nearby` markets — the internal
 * linking mesh ("Rental cleanout also in Evans, Martinez…"). Only returns combos
 * that are actually published.
 */
export function getNearbyPages(page: ResolvedPage): ResolvedPage[] {
  const nearby = new Set(page.city.nearby);
  return PAGES.filter((p) => p.niche.slug === page.niche.slug && nearby.has(p.city.slug));
}

// ─── Hub pages ───────────────────────────────────────────────────────────────
// A niche hub / city hub exists only when it has ≥1 published niche×city page, and
// only ever links to those published pages. This keeps hubs off the doorway path.

export interface NicheHub {
  slug: string; // niche slug, e.g. "carpet-removal"
  niche: Niche;
  pages: ResolvedPage[]; // published pages for this niche
  cities: City[]; // cities with a published page for this niche
}

export interface CityHub {
  slug: string; // city slug, e.g. "augusta-ga"
  city: City;
  pages: ResolvedPage[]; // published pages in this city
  niches: Niche[]; // niches with a published page in this city
}

const NICHE_HUBS: NicheHub[] = NICHES.map((niche) => {
  const pages = getPagesForNiche(niche.slug);
  return { slug: niche.slug, niche, pages, cities: pages.map((p) => p.city) };
}).filter((h) => h.pages.length > 0);

const CITY_HUBS: CityHub[] = CITIES.map((city) => {
  const pages = getPagesForCity(city.slug);
  return { slug: city.slug, city, pages, niches: pages.map((p) => p.niche) };
}).filter((h) => h.pages.length > 0);

const nicheHubBySlug = new Map(NICHE_HUBS.map((h) => [h.slug, h]));
const cityHubBySlug = new Map(CITY_HUBS.map((h) => [h.slug, h]));

export function getNicheHubs(): NicheHub[] {
  return NICHE_HUBS;
}
export function getCityHubs(): CityHub[] {
  return CITY_HUBS;
}
export function getNicheHubBySlug(slug: string): NicheHub | null {
  return nicheHubBySlug.get(slug) ?? null;
}
export function getCityHubBySlug(slug: string): CityHub | null {
  return cityHubBySlug.get(slug) ?? null;
}

// Discriminated resolution used by app/[slug]. Niche/city hub slugs and niche×city
// page slugs are disjoint, so lookup order doesn't affect correctness.
export type ResolvedSlug =
  | { kind: "page"; page: ResolvedPage }
  | { kind: "niche"; hub: NicheHub }
  | { kind: "city"; hub: CityHub };

export function resolveSlug(slug: string): ResolvedSlug | null {
  const nicheHub = getNicheHubBySlug(slug);
  if (nicheHub) return { kind: "niche", hub: nicheHub };
  const cityHub = getCityHubBySlug(slug);
  if (cityHub) return { kind: "city", hub: cityHub };
  const page = getPageBySlug(slug);
  if (page) return { kind: "page", page };
  return null;
}

/** Every statically-generated slug: niche×city pages + niche hubs + city hubs. */
export function getAllStaticSlugs(): string[] {
  return [
    ...PAGES.map((p) => p.slug),
    ...NICHE_HUBS.map((h) => h.slug),
    ...CITY_HUBS.map((h) => h.slug),
  ];
}
