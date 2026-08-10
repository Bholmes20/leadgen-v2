// Central site identity. Existing pages (app/layout.tsx, app/page.tsx,
// app/junk-removal-augusta-ga) still use their own local literals; new SEO-factory
// code imports these so the values stay in one place going forward.

export const SITE_URL = "https://leads.eseeent.com";
export const BUSINESS_NAME = "Esee Property Services";
export const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? "706-828-1733";
