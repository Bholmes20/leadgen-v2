// Public API for the SEO page factory registry.
//
// Phase 2 (app/[slug]/page.tsx) will use:
//   - getPublishedSlugs()  → generateStaticParams()
//   - getPageBySlug(slug)  → page render + generateMetadata()
// Sitemap/hub pages will use getPublishedPages(), getPagesForNiche/City, getNearbyPages.

export * from "./types";
export { NICHES } from "./niches";
export { CITIES } from "./cities";
export { LOCAL_CONTENT } from "./content";
export {
  buildSlug,
  getPublishedPages,
  getPublishedSlugs,
  getPageBySlug,
  isPublishedSlug,
  getPagesForNiche,
  getPagesForCity,
  getNearbyPages,
  getNicheHubs,
  getCityHubs,
  getNicheHubBySlug,
  getCityHubBySlug,
  resolveSlug,
  getAllStaticSlugs,
  type NicheHub,
  type CityHub,
  type ResolvedSlug,
} from "./pages";
