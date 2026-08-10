import Link from "next/link";
import { getNicheHubs, getCityHubs } from "@/lib/seo";

const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? "706-828-1733";
const BUSINESS_NAME = "Esee Property Services";

// Emoji per niche hub — light visual cue, not keyword text.
const NICHE_ICON: Record<string, string> = {
  "rental-property-cleanout": "🏠",
  "tenant-trash-out": "🗑️",
  "renovation-debris-removal": "🔨",
  "carpet-removal": "🧵",
  "overgrown-property-cleanup": "🌿",
  "playset-outdoor-structure-removal": "🛝",
};

export default function Home() {
  const telHref = `tel:${BUSINESS_PHONE.replace(/\D/g, "")}`;
  const niches = getNicheHubs();
  const cities = getCityHubs();

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
        · Serving Augusta, GA &amp; the CSRA
      </div>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center bg-white">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 max-w-2xl">
          Property Cleanouts &amp; Junk Removal in Augusta, GA
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl">
          {BUSINESS_NAME} connects you with local providers for rental cleanouts,
          debris removal, and more across the Augusta metro and the CSRA. Get a free
          quote in under 2 minutes.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/leads/new"
            className="inline-block bg-green-600 text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-green-700 transition-colors"
          >
            Get a Free Quote
          </Link>
          <a
            href={telHref}
            className="inline-block border-2 border-green-600 text-green-700 text-lg font-semibold px-8 py-4 rounded-full hover:bg-green-50 transition-colors"
          >
            Call {BUSINESS_PHONE}
          </a>
        </div>
      </section>

      {/* Specialized services → niche hubs */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Specialized Property Services
          </h2>
          <p className="text-gray-500 text-center max-w-xl mx-auto mb-10">
            Tell us about your job and we&apos;ll match you with an available local
            provider. Explore the services we cover:
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
            Serving the Augusta, GA Metro &amp; the CSRA
          </h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">
            We connect property owners across the CSRA with local providers. Choose your
            area to see what&apos;s available near you:
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
          Submit your request in under 2 minutes. Upload photos and a local provider will
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
              <p>Augusta, GA &amp; the surrounding CSRA</p>
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
            {BUSINESS_NAME} is a local service-matching platform. We connect your request
            with a local provider who performs the work and confirms pricing before it begins.
          </p>
        </div>
      </footer>
    </main>
  );
}
