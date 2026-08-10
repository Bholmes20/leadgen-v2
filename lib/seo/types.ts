// Shared types for the SEO page factory (niche × city landing pages).
// Phase 1: data model only. Consumed by app/[slug]/page.tsx in Phase 2 via
// getPublishedSlugs() (generateStaticParams) and getPageBySlug() (page + metadata).

export type StateCode = "GA" | "SC";

// Maps a niche to the existing CRM `leads.service` value so lead capture and
// contractor matching keep working once the form is wired up in Phase 3.
export type LeadService = "junk-removal" | "landscaping";

export interface Faq {
  q: string;
  a: string;
}

export interface PricingBand {
  low: number;
  high: number;
  unit?: string; // display unit, defaults to "job"
  note?: string;
}

// A service niche (e.g. "Rental Property Cleanout"). City-agnostic — city-specific
// copy lives in LocalContent. Metadata/H1 builders take the city so the same niche
// renders correctly on every market page.
export interface Niche {
  slug: string; // "rental-property-cleanout"
  label: string; // "Rental Property Cleanout"
  shortLabel: string; // lowercase, mid-sentence: "rental property cleanout"
  blurb: string; // one short sentence for homepage cards / hub summaries
  hubIntro: string; // 2-3 sentence intro for the niche hub page (city-agnostic, transparent)
  leadService: LeadService;
  serviceType: string; // schema.org Service.serviceType
  keywords: string[];
  pricing: PricingBand;
  whatWeTake: string[];
  whatWeDont: string[];
  faqs: Faq[]; // service-level FAQs, no city references
  h1: (cityName: string, state: StateCode) => string;
  metaTitle: (cityName: string, state: StateCode) => string;
  metaDescription: (cityName: string, state: StateCode) => string;
  overview: (cityName: string) => string; // "what this service is" explainer
}

// A target market.
export interface City {
  slug: string; // "augusta-ga"
  name: string; // "Augusta"
  state: StateCode;
  county: string; // "Richmond County"
  zips: string[];
  areas: string[]; // neighborhoods / landmarks for the service-area section
  nearby: string[]; // city slugs, for internal linking between market pages
  blurb: string; // one sentence describing the market
}

// Per-(niche, city) unique content. This is the publish gate: a niche × city page
// only ships when a LocalContent entry exists with a real local intro and at least
// one city-specific FAQ. This is how the factory avoids thin doorway pages.
export interface LocalContent {
  niche: string; // niche slug
  city: string; // city slug
  intro: string; // REQUIRED: unique, city-specific opening
  localFaqs: Faq[]; // REQUIRED: >= 1 city-specific FAQ
  localNote?: string; // optional extra local context block
  pricingOverride?: PricingBand;
}

// A fully-resolved, publishable page: niche + city + local content, with pricing and
// FAQs already merged. This is what Phase 2 renders.
export interface ResolvedPage {
  slug: string; // "rental-property-cleanout-augusta-ga"
  niche: Niche;
  city: City;
  content: LocalContent;
  pricing: PricingBand; // content.pricingOverride ?? niche.pricing
  faqs: Faq[]; // niche.faqs followed by content.localFaqs
}
