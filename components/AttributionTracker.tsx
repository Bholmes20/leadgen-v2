"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attributionClient";

// Records attribution into sessionStorage so it survives the click through to
// /leads/new. Renders nothing.
//
// - Rendered site-wide in the layout with NO props: captures first-touch utm_*/referrer
//   on any entry page WITHOUT setting source_page (so it never overwrites a landing
//   page's context — e.g. it won't stamp source_page="/leads/new").
// - Rendered on SEO landing pages / hubs WITH props: supplies the last-touch
//   niche/city/service/source_page context.
export default function AttributionTracker({
  niche,
  city,
  service,
  sourcePage,
}: {
  niche?: string;
  city?: string;
  service?: string;
  sourcePage?: string;
}) {
  useEffect(() => {
    captureAttribution({ niche, city, service, source_page: sourcePage });
  }, [niche, city, service, sourcePage]);

  return null;
}
