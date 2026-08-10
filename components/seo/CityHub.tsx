import Link from "next/link";
import type { CityHub as CityHubData } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/seo/schema";
import { SITE_URL, BUSINESS_NAME } from "@/lib/site";
import AttributionTracker from "@/components/AttributionTracker";
import { JsonLd, PhoneBar, Breadcrumb, LeadCtaBand, SiteFooter } from "./chrome";

export default function CityHub({ hub }: { hub: CityHubData }) {
  const { city, pages } = hub;
  const cityLabel = `${city.name}, ${city.state}`;

  const disclaimer = `${BUSINESS_NAME} is a local service-matching platform serving ${cityLabel}. We connect your request with a local provider who does the work. The services listed here are the ones with a dedicated ${city.name} page today — request a quote for anything else and we'll let you know if a provider covers it.`;

  return (
    <main>
      <AttributionTracker city={city.slug} sourcePage={`/${city.slug}`} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: cityLabel, url: `${SITE_URL}/${city.slug}` },
        ])}
      />

      <PhoneBar area={`${cityLabel} & the CSRA`} />
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: cityLabel }]} />

      {/* Hero */}
      <section className="bg-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
            {`Property Cleanout & Removal Services in ${cityLabel}`}
          </h1>
          <p className="text-lg text-gray-600 mb-4">{city.blurb}</p>
          <p className="text-lg text-gray-600 mb-8">
            {`Tell us about your job in ${city.name} and we'll connect you with an available local
            provider. Below are the services we currently cover with a dedicated ${city.name} page.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/leads/new"
              className="inline-block bg-green-600 text-white text-base font-semibold px-8 py-3 rounded-full hover:bg-green-700 transition-colors text-center"
            >
              Request a Free Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Services available in this city — only published niche×city pages */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            {`Services available in ${city.name}`}
          </h2>
          <div className="space-y-5">
            {pages.map((p) => (
              <div
                key={p.slug}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-green-300 transition-colors"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  <Link href={`/${p.slug}`} className="hover:text-green-600">
                    {p.niche.label}
                  </Link>
                </h3>
                <p className="text-gray-600 text-sm mb-3">{p.niche.blurb}</p>
                <Link href={`/${p.slug}`} className="text-green-600 font-medium text-sm hover:underline">
                  {`${p.niche.label} in ${city.name} →`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Areas served */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {`Neighborhoods and areas we cover in ${city.name}`}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {city.areas.map((area) => (
              <li key={area} className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500 font-bold" aria-hidden="true">✓</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
          {city.zips.length > 0 && (
            <p className="text-sm text-gray-500">
              {`ZIP codes served include ${city.zips.join(", ")}.`}
            </p>
          )}
        </div>
      </section>

      <LeadCtaBand
        heading={`Serving ${city.name} and the surrounding area`}
        sub="Request a free quote online and we will connect you with an available local provider near you."
      />

      <SiteFooter disclaimer={disclaimer} />
    </main>
  );
}
