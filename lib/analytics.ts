// Conversion tracking — dormant until measurement IDs are provided via env vars.
// NEXT_PUBLIC_* values are inlined at build time; when unset, everything here is a
// no-op (no scripts load, trackLead does nothing), so production behavior is unchanged
// until you add real IDs and rebuild.

export const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
export const GOOGLE_ADS_LEAD_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL;
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

/** True when at least one tracking vendor is configured. */
export const analyticsEnabled = Boolean(GA4_ID || GOOGLE_ADS_ID || META_PIXEL_ID);

type GtagFn = (...args: unknown[]) => void;
type FbqFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GtagFn;
    fbq?: FbqFn;
  }
}

export interface LeadEvent {
  leadId: string; // used as the vendor dedup id (transaction_id / eventID)
  service?: string;
  niche?: string;
  city?: string;
  value?: number;
  currency?: string;
}

/**
 * Fire a lead conversion across whichever vendors are configured. Call this exactly
 * once per successful submission — `leadId` is passed as transaction_id (GA4/Ads) and
 * eventID (Meta) so even if it somehow reached a vendor twice, the vendor deduplicates.
 * Safe no-op when nothing is configured or when called on the server.
 */
export function trackLead(e: LeadEvent): void {
  if (typeof window === "undefined") return;
  const currency = e.currency ?? "USD";

  // GA4 — generate_lead
  if (GA4_ID && typeof window.gtag === "function") {
    window.gtag("event", "generate_lead", {
      transaction_id: e.leadId,
      value: e.value,
      currency,
      service: e.service,
      niche: e.niche,
      city: e.city,
      send_to: GA4_ID,
    });
  }

  // Google Ads — conversion (requires both the account ID and a conversion label)
  if (GOOGLE_ADS_ID && GOOGLE_ADS_LEAD_LABEL && typeof window.gtag === "function") {
    window.gtag("event", "conversion", {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LEAD_LABEL}`,
      transaction_id: e.leadId,
      value: e.value,
      currency,
    });
  }

  // Meta Pixel — Lead
  if (META_PIXEL_ID && typeof window.fbq === "function") {
    window.fbq(
      "track",
      "Lead",
      { content_category: e.niche, content_name: e.city, value: e.value, currency },
      { eventID: e.leadId },
    );
  }
}
