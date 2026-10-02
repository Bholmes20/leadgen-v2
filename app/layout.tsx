import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import AttributionTracker from "@/components/AttributionTracker";
import { buildOrganizationSchema } from "@/lib/seo/schema";

const geist = Geist({ subsets: ["latin"] });

const SITE_URL = "https://leads.eseeent.com";
const BUSINESS_NAME = "Esee Property Services";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BUSINESS_NAME} | Grovetown Pickup, Cleanouts & Junk Removal | GA`,
    template: `%s | ${BUSINESS_NAME}`,
  },
  description:
    "Esee Property Services helps Grovetown, GA landlords, renters, homeowners, and Fort Eisenhower-area movers clear out unwanted items — curbside pickup, bulk-item, mattress & furniture hauling, rental cleanouts, tenant trash-outs, and carpet removal. Serving Grovetown and the greater Augusta / CSRA area. Get a quote from photos.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: BUSINESS_NAME,
    title: `${BUSINESS_NAME} | Grovetown Pickup, Cleanouts & Junk Removal`,
    description:
      "Grovetown, GA pickup, cleanouts, and junk removal for landlords, renters, homeowners, and Fort Eisenhower-area movers — managed from quote to completion. Also serving the greater Augusta / CSRA area.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${BUSINESS_NAME} — Pickup, Cleanouts & Junk Removal in Grovetown, GA`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS_NAME} | Grovetown Pickup, Cleanouts & Junk Removal`,
    description:
      "Grovetown, GA pickup, cleanouts, and junk removal — managed from quote to completion. Also serving the greater Augusta / CSRA area.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// Site-wide identity: an Organization (property services company), not a LocalBusiness
// with a single storefront. Built from the registry in lib/seo/schema.ts.
const organizationSchema = buildOrganizationSchema();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geist.className} bg-gray-50 text-gray-900 min-h-screen`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema).replace(/</g, "\\u003c"),
          }}
        />
        {/* Global first-touch UTM/referrer capture (no source_page — never overwrites a
            landing page's context). Landing pages/hubs add their own page context. */}
        <AttributionTracker />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
