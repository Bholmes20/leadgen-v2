// Central site identity. Existing pages (app/layout.tsx, app/page.tsx,
// app/junk-removal-augusta-ga) still use their own local literals; new SEO-factory
// code imports these so the values stay in one place going forward.

export const SITE_URL = "https://leads.eseeent.com";
export const BUSINESS_NAME = "Esee Property Services";
export const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? "706-828-1733";

// Standard disclosure. ESEE is the customer-facing property services company and
// manages every job end to end; the work itself is performed by ESEE directly or by
// an approved local service partner. Use this verbatim wherever we explain who does
// the work (footers, schema, email). Keep it in one place so the wording stays exact.
export const SERVICE_DISCLOSURE =
  "Esee Property Services manages your job from quote to completion. Depending on the job and location, the work is done by ESEE directly or by an approved local service partner. We confirm scope and price with you before any work begins.";
