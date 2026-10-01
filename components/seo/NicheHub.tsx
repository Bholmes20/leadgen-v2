import Link from "next/link";
import type { NicheHub as NicheHubData } from "@/lib/seo";
import {
  buildNicheHubServiceSchema,
  buildFaqSchema,
  buildBreadcrumbSchema,
} from "@/lib/seo/schema";
import { SITE_URL, SERVICE_DISCLOSURE } from "@/lib/site";
import AttributionTracker from "@/components/AttributionTracker";
import { JsonLd, PhoneBar, Breadcrumb, LeadCtaBand, SiteFooter } from "./chrome";

export default function NicheHub({ hub }: { hub: NicheHubData }) {
  const { niche, pages } = hub;

  const howItWorks = [
    {
      n: "1",
      title: "Submit your request",
      body: "Tell us what you need and where the job is. A few photos help us size it and quote it accurately.",
    },
    {
      n: "2",
      title: "We confirm scope and price",
      body: "We review your request and send you a quote. The work is done by ESEE directly or by an approved local service partner.",
    },
    {
      n: "3",
      title: "Confirm the quote and schedule",
      body: "Once you approve the quote, we schedule the work and handle it from there. Nothing starts until you approve it.",
    },
  ];

  const disclaimer = SERVICE_DISCLOSURE;

  return (
    <main>
      <AttributionTracker niche={niche.slug} service={niche.leadService} sourcePage={`/${niche.slug}`} />
      <JsonLd data={buildNicheHubServiceSchema(hub)} />
      <JsonLd data={buildFaqSchema(niche.faqs)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: niche.label, url: `${SITE_URL}/${niche.slug}` },
        ])}
      />

      <PhoneBar />
      <Breadcrumb items={[{ name: "Home", href: "/" }, { name: niche.label }]} />

      {/* Hero */}
      <section className="bg-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
            {`${niche.label} in the Augusta, GA Area`}
          </h1>
          <p className="text-lg text-gray-600 mb-8">{niche.hubIntro}</p>
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

      {/* Is this the right service? */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Is this the right service for your job?</h2>
          <p className="text-gray-600 mb-8">{niche.blurb}</p>
          <div className="grid sm:grid-cols-2 gap-12">
            <div>
              <h3 className="font-bold text-gray-900 mb-4">Typically included</h3>
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
              <h3 className="font-bold text-gray-900 mb-4">Usually not accepted</h3>
              <ul className="space-y-3">
                {niche.whatWeDont.map((item) => (
                  <li key={item} className="flex gap-2 text-gray-700">
                    <span className="text-red-400 font-bold flex-shrink-0 mt-0.5">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">How It Works</h2>
          <ol className="space-y-6">
            {howItWorks.map(({ n, title, body }) => (
              <li key={n} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white font-bold flex items-center justify-center text-sm">
                  {n}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{title}</p>
                  <p className="text-gray-600">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How pricing works */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How pricing works</h2>
          <p className="text-lg text-gray-700">
            {`Every ${niche.shortLabel} job is quoted individually, based on what the job involves. We confirm scope and price with you before any work begins — sending a few photos with your request is the fastest way to get an accurate quote.`}
          </p>
        </div>
      </section>

      {/* Where we offer this — only published cities */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {`Where we offer ${niche.label.toLowerCase()}`}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pages.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/${p.slug}`}
                  className="flex items-center gap-2 text-green-600 font-medium hover:underline"
                >
                  <span className="text-green-500" aria-hidden="true">→</span>
                  {`${p.city.name}, ${p.city.state}`}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-gray-500">
            Don&apos;t see your town? We serve the wider CSRA — request a quote and we&apos;ll let
            you know if we cover your area.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <dl className="space-y-8">
            {niche.faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-gray-200 pb-8 last:border-0 last:pb-0">
                <dt className="font-semibold text-gray-900 mb-2">{q}</dt>
                <dd className="text-gray-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <LeadCtaBand
        heading={`Need ${niche.label.toLowerCase()}?`}
        sub="Request a free quote online and we'll get back to you with pricing and next steps."
      />

      <SiteFooter disclaimer={disclaimer} />
    </main>
  );
}
