import Link from "next/link";
import type { ResolvedPage } from "@/lib/seo";
import { getNearbyPages, getPagesForCity } from "@/lib/seo";
import {
  buildServiceSchema,
  buildFaqSchema,
  buildBreadcrumbSchema,
  pageUrl,
} from "@/lib/seo/schema";
import { SITE_URL, SERVICE_DISCLOSURE } from "@/lib/site";
import AttributionTracker from "@/components/AttributionTracker";
import { JsonLd, PromoBar, Breadcrumb, LeadCtaBand, SiteFooter } from "./chrome";

export default function LandingPage({ page }: { page: ResolvedPage }) {
  const { niche, city, content, pricing, faqs } = page;
  const title = niche.h1(city.name, city.state);
  const cityLabel = `${city.name}, ${city.state}`;

  const nearby = getNearbyPages(page); // same niche, nearby markets
  const otherInCity = getPagesForCity(city.slug).filter((p) => p.slug !== page.slug);

  const howItWorks = [
    {
      n: "1",
      title: "Submit your request",
      body: `Use our quick online form to tell us what you need in ${city.name} and where. Photos help us size the job and get you an accurate quote faster.`,
    },
    {
      n: "2",
      title: "We confirm scope and price",
      body: `We review your ${niche.shortLabel} request for ${city.name} and the surrounding ${city.county} area and send you a quote. The work is done by ESEE directly or by an approved local service partner.`,
    },
    {
      n: "3",
      title: "Confirm the quote and schedule",
      body: "Once you approve the quote, we schedule the work and handle it from there. Scope and price are confirmed with you before any work begins.",
    },
  ];

  const disclaimer = SERVICE_DISCLOSURE;
  const heroSubmitCopy = `You submit your request online — ideally with a few photos — and we get back to you with a quote for ${city.name}. We handle the job from quote to completion.`;

  return (
    <main>
      <AttributionTracker
        niche={niche.slug}
        city={city.slug}
        service={niche.leadService}
        sourcePage={`/${page.slug}`}
      />
      <JsonLd data={buildServiceSchema(page)} />
      <JsonLd data={buildFaqSchema(faqs)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: niche.label, url: `${SITE_URL}/${niche.slug}` },
          { name: cityLabel, url: pageUrl(page.slug) },
        ])}
      />

      <PromoBar area={`${cityLabel} & surrounding areas`} />
      <Breadcrumb
        items={[
          { name: "Home", href: "/" },
          { name: niche.label, href: `/${niche.slug}` },
          { name: cityLabel },
        ]}
      />

      {/* Hero */}
      <section className="bg-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
            {title}
          </h1>
          <p className="text-lg text-gray-600 mb-4">{content.intro}</p>
          <p className="text-lg text-gray-600 mb-8">{heroSubmitCopy}</p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/leads/new"
              className="inline-block bg-green-600 text-white text-base font-semibold px-8 py-3 rounded-full hover:bg-green-700 transition-colors text-center"
            >
              Request a Pickup Quote
            </Link>
            <Link
              href="/leads/new"
              className="inline-block border-2 border-green-600 text-green-700 text-base font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors text-center"
            >
              Get a Quote From Photos
            </Link>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {`What ${niche.label} Involves`}
          </h2>
          <p className="text-gray-600">{niche.overview(city.name)}</p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">How It Works</h2>
          <ol className="space-y-6">
            {howItWorks.map(({ n, title: stepTitle, body }) => (
              <li key={n} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm">
                  {n}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{stepTitle}</p>
                  <p className="text-gray-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <Link
              href="/leads/new"
              className="inline-block bg-green-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-green-700 transition-colors"
            >
              Request a Free Quote
            </Link>
          </div>
        </div>
      </section>

      {/* What can be handled / what may not */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What Can Be Handled</h2>
            <ul className="space-y-3">
              {niche.whatWeTake.map((item) => (
                <li key={item} className="flex gap-2 text-gray-700">
                  <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">What May Not Be Accepted</h2>
            <ul className="space-y-3">
              {niche.whatWeDont.map((item) => (
                <li key={item} className="flex gap-2 text-gray-700">
                  <span className="text-red-400 font-bold flex-shrink-0 mt-0.5">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-500">
              Not sure about a specific item? Note it in your quote request and we&apos;ll
              advise you directly.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {`${niche.label} Pricing in ${cityLabel}`}
          </h2>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8">
            <p className="text-lg text-gray-700 mb-4">
              {`Every ${niche.shortLabel} job is quoted individually`}
              {pricing.note ? ` — ${pricing.note}` : "."}
            </p>
            <p className="text-gray-700 mb-6">
              We confirm scope and price with you before any work begins. Including
              photos with your request is the fastest way to get an accurate quote.
            </p>
            <Link
              href="/leads/new"
              className="inline-block bg-green-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-green-700 transition-colors"
            >
              Send Photos &amp; Request a Quote
            </Link>
          </div>
        </div>
      </section>

      {/* Service area */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {`Serving ${city.name} and ${city.county}`}
          </h2>
          <p className="text-gray-600 mb-8">{city.blurb}</p>
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

      {/* FAQ */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <dl className="space-y-8">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-gray-200 pb-8 last:border-0 last:pb-0">
                <dt className="font-semibold text-gray-900 mb-2">{q}</dt>
                <dd className="text-gray-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Related services & areas — varied, non-repetitive anchors */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-12">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {`More help in ${city.name}`}
            </h2>
            {otherInCity.length > 0 ? (
              <ul className="space-y-2">
                {otherInCity.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/${p.slug}`} className="text-green-600 font-medium hover:underline">
                      {p.niche.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">
                See{" "}
                <Link href={`/${city.slug}`} className="text-green-600 hover:underline">
                  all services in {city.name}
                </Link>
                .
              </p>
            )}
            <p className="mt-3 text-sm">
              <Link href={`/${city.slug}`} className="text-gray-500 hover:text-green-600">
                Browse everything we cover in {city.name} →
              </Link>
            </p>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {`${niche.label} elsewhere`}
            </h2>
            {nearby.length > 0 ? (
              <ul className="space-y-2">
                {nearby.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/${p.slug}`} className="text-green-600 font-medium hover:underline">
                      {`${p.city.name}, ${p.city.state}`}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">Available across the CSRA.</p>
            )}
            <p className="mt-3 text-sm">
              <Link href={`/${niche.slug}`} className="text-gray-500 hover:text-green-600">
                See all areas for this service →
              </Link>
            </p>
          </div>
        </div>
      </section>

      <LeadCtaBand
        heading={`Ready to get started in ${city.name}?`}
        sub="Send a few photos and request a free quote online. We'll get back to you with pricing and next steps."
      />

      <SiteFooter
        disclaimer={disclaimer}
        links={[{ name: niche.label, href: `/${niche.slug}` }]}
      />
    </main>
  );
}
