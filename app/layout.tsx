import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

const SITE_URL = "https://leads.eseeent.com";
const BUSINESS_NAME = "Esee Property Services";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BUSINESS_NAME} | Junk Removal & Landscaping | Augusta GA`,
    template: `%s | ${BUSINESS_NAME}`,
  },
  description:
    "Esee Property Services offers fast, affordable junk removal and landscaping in Augusta, Evans, Grovetown, Martinez, North Augusta, and Aiken. Get a free quote today.",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: BUSINESS_NAME,
    title: `${BUSINESS_NAME} | Junk Removal & Landscaping | Augusta GA`,
    description:
      "Fast, affordable junk removal and landscaping serving the Augusta, GA metro area. Free quotes — same-day service available.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: `${BUSINESS_NAME} — Junk Removal & Landscaping in Augusta GA`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BUSINESS_NAME} | Junk Removal & Landscaping | Augusta GA`,
    description:
      "Fast, affordable junk removal and landscaping in Augusta, GA. Free quotes — same-day service.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: BUSINESS_NAME,
  description:
    "Fast, affordable junk removal and landscaping serving Augusta, GA and surrounding CSRA communities.",
  url: SITE_URL,
  telephone: process.env.BUSINESS_PHONE ?? "",
  priceRange: "$$",
  areaServed: [
    { "@type": "City", name: "Augusta", addressRegion: "GA" },
    { "@type": "City", name: "Evans", addressRegion: "GA" },
    { "@type": "City", name: "Grovetown", addressRegion: "GA" },
    { "@type": "City", name: "Martinez", addressRegion: "GA" },
    { "@type": "City", name: "North Augusta", addressRegion: "SC" },
    { "@type": "City", name: "Aiken", addressRegion: "SC" },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Property Services",
    itemListElement: [
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Junk Removal" },
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Landscaping" },
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Yard Cleanup" },
      },
      {
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: "Property Cleanup" },
      },
    ],
  },
};

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
            __html: JSON.stringify(localBusinessSchema).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
