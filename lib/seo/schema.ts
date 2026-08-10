import type { Faq, ResolvedPage } from "./types";
import type { NicheHub } from "./pages";
import { CITIES } from "./cities";
import { SITE_URL, BUSINESS_NAME, BUSINESS_PHONE } from "../site";

// JSON-LD builders for the SEO factory.
//
// Business-identity model: ESEE is a lead-generation / service-matching platform, not
// the entity that physically performs each cleanup. So the site-wide identity is an
// Organization (not LocalBusiness — which implies a physical business performing the
// work), and every Service names that Organization as the provider of the *matching*
// service, with a description that states plainly that work is done by local providers.
// We make no claims about addresses, geo, ratings, certifications, or contractors.

export function pageUrl(slug: string): string {
  return `${SITE_URL}/${slug}`;
}

/** The seven CSRA markets as schema.org City areaServed entries. */
const AREA_SERVED = CITIES.map((c) => ({
  "@type": "City",
  name: c.name,
  addressRegion: c.state,
}));

/** ESEE as an Organization (service-matching platform). Used site-wide in the layout. */
export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS_NAME,
    url: SITE_URL,
    description:
      "A local service-matching platform that connects property owners and managers across the Augusta, GA / CSRA area with local providers for junk removal, cleanouts, debris removal, and related property services.",
    areaServed: AREA_SERVED,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: BUSINESS_PHONE,
      contactType: "customer service",
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
  const { niche, city, pricing } = page;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: niche.h1(city.name, city.state),
    description: `${niche.metaDescription(city.name, city.state)} ${BUSINESS_NAME} connects your request with a local provider serving ${city.name}, ${city.state}.`,
    serviceType: niche.serviceType,
    areaServed: { "@type": "City", name: city.name, addressRegion: city.state },
    provider: orgProvider(),
    offers: {
      "@type": "Offer",
      priceRange: `$${pricing.low}-$${pricing.high}`,
      priceCurrency: "USD",
    },
  };
}

/** Service schema for a niche hub — areaServed spans every published city for the niche. */
export function buildNicheHubServiceSchema(hub: NicheHub) {
  const { niche, cities, pages } = hub;
  const low = Math.min(...pages.map((p) => p.pricing.low));
  const high = Math.max(...pages.map((p) => p.pricing.high));
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: niche.label,
    description: `${niche.blurb} ${BUSINESS_NAME} connects your request with a local provider in the areas we serve.`,
    serviceType: niche.serviceType,
    areaServed: cities.map((c) => ({ "@type": "City", name: c.name, addressRegion: c.state })),
    provider: orgProvider(),
    offers: {
      "@type": "Offer",
      priceRange: `$${low}-$${high}`,
      priceCurrency: "USD",
    },
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
