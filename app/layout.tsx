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
    default: `${BUSINESS_NAME} | Property Cleanouts & Junk Removal | Augusta, GA`,
    template: `%s | ${BUSINESS_NAME}`,
  },
  description:
    "Esee Property Services connects property owners across the Augusta, GA / CSRA area with local providers for rental cleanouts, junk & debris removal, carpet removal, overgrown-lot cleanup, and more. Get a free quote.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: BUSINESS_NAME,
    title: `${BUSINESS_NAME} | Local Property Cleanout & Removal Services | Augusta, GA`,
    description:
      "A local service-matching platform for the Augusta, GA area — we connect you with local providers for cleanouts, junk removal, and property services. Free quotes.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${BUSINESS_NAME} — Property Cleanout & Removal Services in the Augusta, GA area`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS_NAME} | Property Cleanout & Removal | Augusta, GA`,
    description:
      "We connect Augusta-area property owners with local providers for cleanouts, junk removal, and more. Free quotes.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

// Site-wide identity: an Organization (service-matching platform), not a LocalBusiness
// that performs the work. Built from the registry in lib/seo/schema.ts.
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
