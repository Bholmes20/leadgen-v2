import Link from "next/link";
import { getNicheHubs, getCityHubs } from "@/lib/seo";
import { SERVICE_DISCLOSURE } from "@/lib/site";

const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? "706-828-1733";
const BUSINESS_NAME = "Esee Property Services";

// Emoji per niche hub — light visual cue, not keyword text.
const NICHE_ICON: Record<string, string> = {
  "mattress-removal": "🛏️",
  "furniture-removal": "🛋️",
  "appliance-removal": "🧺",
  "bulk-item-pickup": "📦",
  "rental-property-cleanout": "🏠",
  "tenant-trash-out": "🗑️",
  "renovation-debris-removal": "🔨",
  "carpet-removal": "🧵",
  "overgrown-property-cleanup": "🌿",
  "playset-outdoor-structure-removal": "🛝",
};

// The high-intent Grovetown pickup searches we want to capture, each pointed at the
// most specific published page (the Grovetown demand pages, plus the carpet hub, which
// has no Grovetown page of its own yet). Curated order, not registry-driven.
const POPULAR_GROVETOWN_PICKUPS: { icon: string; label: string; href: string }[] = [
  { icon: "🛏️", label: "Mattress & box spring pickup", href: "/mattress-removal-grovetown-ga" },
  { icon: "🛋️", label: "Couch, sofa & furniture pickup", href: "/furniture-removal-grovetown-ga" },
  { icon: "🧺", label: "Washer & dryer removal", href: "/appliance-removal-grovetown-ga" },
  { icon: "🔌", label: "Large appliance pickup", href: "/appliance-removal-grovetown-ga" },
  { icon: "📦", label: "Bulk item pickup", href: "/bulk-item-pickup-grovetown-ga" },
  { icon: "🏠", label: "Rental cleanouts", href: "/rental-property-cleanout-grovetown-ga" },
  { icon: "🗑️", label: "Tenant trash-outs", href: "/tenant-trash-out-grovetown-ga" },
  { icon: "🧵", label: "Carpet & padding removal", href: "/carpet-removal" },
];

// Home market: Grovetown leads the service-area list; everything else keeps its order.
const HOME_CITY_SLUG = "grovetown-ga";

export default function Home() {
  const telHref = `tel:${BUSINESS_PHONE.replace(/\D/g, "")}`;
  const niches = getNicheHubs();
  const cities = [...getCityHubs()].sort((a, b) =>
    a.slug === HOME_CITY_SLUG ? -1 : b.slug === HOME_CITY_SLUG ? 1 : 0,
  );

  return (
    <main className="min-h-screen flex flex-col">
      {/* Phone header */}
      <div className="bg-green-700 text-white text-center py-2 px-4 text-sm font-medium">
        Call or text for a free quote:{" "}
        <a
          href={telHref}
          className="font-bold underline hover:text-green-100"
          aria-label={`Call ${BUSINESS_NAME}`}
        >
          {BUSINESS_PHONE}
        </a>{" "}
        · Serving Grovetown, GA &amp; the greater Augusta / CSRA area
      </div>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center bg-white">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 max-w-2xl">
          Grovetown Pickup, Cleanouts &amp; Junk Removal
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl">
          {BUSINESS_NAME} helps Grovetown landlords, renters, homeowners, and
          Fort Eisenhower-area movers get unwanted items cleared out fast. Request
          curbside pickup, cleanout help, or carpet removal and get a quote from photos.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/leads/new"
            className="inline-block bg-green-600 text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-green-700 transition-colors"
          >
            Request Pickup
          </Link>
          <a
            href={telHref}
            className="inline-block border-2 border-green-600 text-green-700 text-lg font-semibold px-8 py-4 rounded-full hover:bg-green-50 transition-colors"
          >
            Call {BUSINESS_PHONE}
          </a>
        </div>
      </section>

      {/* Popular Grovetown pickups — high-intent demand capture */}
      <section className="bg-white py-16 px-6 border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Popular Grovetown Pickups
          </h2>
          <p className="text-gray-500 text-center max-w-xl mx-auto mb-10">
            The pickups Grovetown and Fort Eisenhower-area movers ask for most — from
            PCS move-outs and rental turnovers to clearing out a single heavy item.
            Pick what fits and request a quote from photos.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {POPULAR_GROVETOWN_PICKUPS.map(({ icon, label, href }) => (
              <li key={label}>
                <Link
                  href={href}
                  className="flex h-full items-center gap-3 bg-gray-50 rounded-xl border border-gray-100 p-4 text-gray-900 hover:border-green-300 hover:bg-white hover:shadow-sm transition-all"
                >
                  <span className="text-2xl" aria-hidden="true">{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-10 text-center">
            <Link
              href="/leads/new"
              className="inline-block bg-green-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-green-700 transition-colors"
            >
              Request a Pickup Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Specialized services → niche hubs */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Specialized Property Services
          </h2>
          <p className="text-gray-500 text-center max-w-xl mx-auto mb-10">
            From curbside pickup and bulk-item, mattress, and furniture hauling to
            full rental cleanouts, tenant trash-outs, and carpet removal — tell us
            about your job and we&apos;ll get back to you with a free quote. Explore
            the services we cover:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {niches.map(({ niche }) => (
              <Link
                key={niche.slug}
                href={`/${niche.slug}`}
                className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-green-300 hover:shadow transition-all"
              >
                <div className="text-3xl mb-3" aria-hidden="true">
                  {NICHE_ICON[niche.slug] ?? "📦"}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{niche.label}</h3>
                <p className="text-gray-500 text-sm mb-3">{niche.blurb}</p>
                <span className="text-green-600 font-medium text-sm">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Service areas → city hubs */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Serving Grovetown &amp; the Augusta, GA Metro / CSRA
          </h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">
            Based in Grovetown and serving property owners across the greater Augusta
            area and the CSRA. Choose your area to see what we cover near you:
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left max-w-lg mx-auto">
            {cities.map(({ city }) => (
              <li key={city.slug}>
                <Link
                  href={`/${city.slug}`}
                  className="flex items-center gap-2 text-gray-700 hover:text-green-600 transition-colors"
                >
                  <span className="text-green-500 font-bold" aria-hidden="true">✓</span>
                  <span>
                    {city.name},{" "}
                    <abbr title={city.state === "GA" ? "Georgia" : "South Carolina"}>
                      {city.state}
                    </abbr>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to get started?</h2>
        <p className="text-green-100 mb-6">
          Submit your request in under 2 minutes. Upload photos and we&apos;ll
          get back to you with pricing.
        </p>
        <Link
          href="/leads/new"
          className="inline-block bg-white text-green-700 font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors"
        >
          Request a Quote
        </Link>
      </section>

      {/* Footer with NAP + transparency */}
      <footer className="bg-white border-t border-gray-100 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col gap-4 text-sm text-gray-400">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <p className="font-semibold text-gray-600">{BUSINESS_NAME}</p>
              <p>Grovetown, GA &amp; the greater Augusta / CSRA area</p>
              <a href={telHref} className="hover:text-green-600 transition-colors">
                {BUSINESS_PHONE}
              </a>
            </div>
            <div className="text-center sm:text-right">
              <Link href="/junk-removal-augusta-ga" className="hover:text-green-600 transition-colors">
                Junk removal in Augusta
              </Link>
              <p className="mt-1">
                &copy; {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center sm:text-left">
            {SERVICE_DISCLOSURE}
          </p>
        </div>
      </footer>
    </main>
  );
}
