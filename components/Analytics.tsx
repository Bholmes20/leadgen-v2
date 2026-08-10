"use client";

import Script from "next/script";
import {
  GA4_ID,
  GOOGLE_ADS_ID,
  META_PIXEL_ID,
} from "@/lib/analytics";

// Injects gtag (GA4 and/or Google Ads) and the Meta Pixel base scripts — but only for
// vendors whose IDs are set. With no env IDs configured this renders nothing, so the
// site ships tracking-ready but dormant until you provide measurement IDs and rebuild.
export default function Analytics() {
  const gtagId = GA4_ID || GOOGLE_ADS_ID;

  return (
    <>
      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {[
              "window.dataLayer = window.dataLayer || [];",
              "function gtag(){dataLayer.push(arguments);}",
              "gtag('js', new Date());",
              GA4_ID ? `gtag('config', '${GA4_ID}');` : "",
              GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : "",
            ]
              .filter(Boolean)
              .join("\n")}
          </Script>
        </>
      )}

      {META_PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {[
            "!function(f,b,e,v,n,t,s)",
            "{if(f.fbq)return;n=f.fbq=function(){n.callMethod?",
            "n.callMethod.apply(n,arguments):n.queue.push(arguments)};",
            "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';",
            "n.queue=[];t=b.createElement(e);t.async=!0;",
            "t.src=v;s=b.getElementsByTagName(e)[0];",
            "s.parentNode.insertBefore(t,s)}(window,document,'script',",
            "'https://connect.facebook.net/en_US/fbevents.js');",
            `fbq('init', '${META_PIXEL_ID}');`,
            "fbq('track', 'PageView');",
          ].join("")}
        </Script>
      )}
    </>
  );
}
