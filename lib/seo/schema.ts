import type { Faq, ResolvedPage } from "./types";
import type { NicheHub } from "./pages";
import { CITIES } from "./cities";
import { SITE_URL, BUSINESS_NAME } from "../site";

// JSON-LD builders for the SEO factory.
//
// Business-identity model: ESEE is the customer-facing property services company and
// manages each job from quote to completion — the work is performed by ESEE directly
// or by an approved local service partner. The site-wide identity is an Organization
// (not LocalBusiness, which would imply a single physical storefront), and every
// Service names that Organization as the provider. We make no claims about addresses,
// geo, ratings, certifications, prices, or turnaround times.

export function pageUrl(slug: string): string {
  return `${SITE_URL}/${slug}`;
}

/** The seven CSRA markets as schema.org City areaServed entries. */
const AREA_SERVED = CITIES.map((c) => ({
  "@type": "City",
  name: c.name,
  addressRegion: c.state,
}));

/** ESEE as an Organization (property services company). Used site-wide in the layout. */
export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS_NAME,
    url: SITE_URL,
    description:
      "A property services company serving the Augusta, GA / CSRA area — rental cleanouts, junk and debris removal, carpet removal, overgrown-lot cleanup, and related property services. We manage each job from quote to completion; the work is done by ESEE directly or by an approved local service partner.",
    areaServed: AREA_SERVED,
    // Public contact routes through the online quote request — we intentionally do not
    // expose a phone number in structured data. `url` points to the request form.
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      url: `${SITE_URL}/leads/new`,
      areaServed: ["US-GA", "US-SC"],
    },
  };
}

/** The Organization as a schema.org provider reference (embedded in Service nodes). */
function orgProvider() {
  return {
    "@type": "Organization",
    name: BUSINESS_NAME,
    url: SITE_URL,
  };
}

export function buildServiceSchema(page: ResolvedPage) {
  const { niche, city } = page;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: niche.h1(city.name, city.state),
    description: `${niche.metaDescription(city.name, city.state)} ${BUSINESS_NAME} manages the job from quote to completion in ${city.name}, ${city.state} — done by ESEE directly or by an approved local service partner.`,
    serviceType: niche.serviceType,
    areaServed: { "@type": "City", name: city.name, addressRegion: city.state },
    provider: orgProvider(),
  };
}

/** Service schema for a niche hub — areaServed spans every published city for the niche. */
export function buildNicheHubServiceSchema(hub: NicheHub) {
  const { niche, cities } = hub;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: niche.label,
    description: `${niche.blurb} ${BUSINESS_NAME} manages the job from quote to completion in the areas we serve — done by ESEE directly or by an approved local service partner.`,
    serviceType: niche.serviceType,
    areaServed: cities.map((c) => ({ "@type": "City", name: c.name, addressRegion: c.state })),
    provider: orgProvider(),
  };
}

export function buildFaqSchema(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Generic breadcrumb builder from an ordered list of {name, url}. */
export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
