import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://leads.eseeent.com";
const BUSINESS_NAME = "Esee Property Services";
const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? "706-828-1733";
const PAGE_TITLE = "Junk Removal in Augusta, GA";
const PAGE_URL = `${SITE_URL}/junk-removal-augusta-ga`;

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description:
    "Need junk removed in Augusta, GA? Esee Property Services connects you with local haulers serving Summerville, Harrisburg, South Augusta, and the CSRA. Request a free quote online — fair pricing, fast response.",
  alternates: {
    canonical: "/junk-removal-augusta-ga",
  },
  openGraph: {
    title: `${PAGE_TITLE} | ${BUSINESS_NAME}`,
    description:
      "Need junk removed in Augusta, GA? Esee Property Services connects you with local haulers serving Summerville, Harrisburg, South Augusta, and the CSRA. Request a free quote online.",
    url: "/junk-removal-augusta-ga",
    type: "website",
  },
};

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: PAGE_TITLE,
  description:
    "Esee Property Services connects Augusta, GA residents with local junk haulers for furniture removal, appliance haul-away, garage cleanouts, and more.",
  provider: {
    "@type": "LocalBusiness",
    name: BUSINESS_NAME,
    url: SITE_URL,
  },
  areaServed: {
    "@type": "City",
    name: "Augusta",
    addressRegion: "GA",
  },
  serviceType: "Junk Removal",
  offers: {
    "@type": "Offer",
    priceRange: "$150-$450",
    priceCurrency: "USD",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I get a junk removal quote in Augusta, GA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Submit a request online with a description of what needs to be removed and your location. Include photos for a faster, more accurate quote. A local provider will respond — same-day quote response is available for many Augusta-area requests.",
      },
    },
    {
      "@type": "Question",
      name: "How much does junk removal cost in Augusta, GA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most residential junk removal jobs in Augusta range from $150 to $450 depending on load size, item type, access, and disposal needs. Pricing is confirmed before any work begins.",
      },
    },
    {
      "@type": "Question",
      name: "What items are accepted for junk removal in Augusta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Commonly accepted items include furniture, mattresses, appliances, garage debris, yard waste, boxes, and household clutter. Hazardous materials, paint, chemicals, fuel, medical waste, and asbestos are not accepted.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to be home for junk removal pickup in Augusta?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "In most cases, yes. Someone should be available at the time of pickup to confirm the items and scope. Your provider will coordinate the timing directly with you after the quote is accepted.",
      },
    },
    {
      "@type": "Question",
      name: "How quickly can I get junk removed in Augusta, GA?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Many requests receive a same-day quote response. Actual pickup scheduling depends on provider availability in your area. Submit your request online for the fastest response.",
      },
    },
    {
      "@type": "Question",
      name: "Do you serve areas outside Augusta city limits?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. In addition to Augusta, Esee Property Services connects requests from Evans, Grovetown, Martinez, North Augusta SC, and Aiken SC.",
      },
    },
  ],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: PAGE_TITLE,
      item: PAGE_URL,
    },
  ],
};

const WHAT_WE_HAUL = [
  "Furniture — sofas, sectionals, chairs, dining tables, bed frames, dressers, armoires",
  "Mattresses and box springs",
  "Appliances — refrigerators, washers, dryers, dishwashers, stoves, microwaves",
  "Garage junk — tools, shelving, storage bins, scrap metal, miscellaneous debris",
  "Yard debris — brush piles, branches, bagged leaves, wood scraps",
  "Boxes and household clutter — attic, basement, or spare room cleanouts",
  "Small to mid-sized residential cleanouts — single rooms, sheds, storage areas",
  "Office furniture — desks, chairs, filing cabinets, cubicle components",
];

const WHAT_NOT_ACCEPTED = [
  "Hazardous waste or household chemicals",
  "Paint, stain, varnish, or solvents (liquid or dried)",
  "Fuel, motor oil, or flammable materials",
  "Medical or biohazardous waste",
  "Asbestos-containing materials",
  "Anything requiring specialized disposal permits",
];

const FAQS = [
  {
    q: "How do I get a junk removal quote in Augusta, GA?",
    a: 'Submit a request through our online form. Include a brief description of what needs to be removed and, if possible, a few photos. You\'ll receive a quote response from a local provider — same-day quote response is available for many Augusta-area requests.',
  },
  {
    q: "How much does junk removal cost in Augusta?",
    a: "Most residential junk removal in Augusta runs $150–$450 depending on the volume of items, weight, access difficulty, and disposal costs. A single large appliance or sofa is typically at the lower end. A garage full of mixed debris will be quoted at the higher end. You'll get exact pricing before committing.",
  },
  {
    q: "What items can be hauled?",
    a: "Furniture, mattresses, appliances, garage clutter, yard debris, boxes, household junk, and small to mid-sized residential cleanouts are commonly accepted. Items like hazardous waste, paint, chemicals, and asbestos are not accepted. See the full list above or note any unusual items in your quote request.",
  },
  {
    q: "Do I need to be home for the pickup?",
    a: "In most cases, yes — someone should be available to confirm the items and the quoted scope before the haul begins. Your provider will coordinate directly with you on timing.",
  },
  {
    q: "How quickly can I get junk removed in Augusta?",
    a: "Availability varies by provider and schedule. Many requests receive a same-day quote response. Actual pickup scheduling depends on provider availability and your location within the service area.",
  },
  {
    q: "Do you serve all of Augusta, GA?",
    a: "Yes. We route requests from across Augusta — Summerville, Harrisburg, South Augusta, downtown, Barton Chapel Road, and West Augusta. We also serve Evans, Grovetown, Martinez, North Augusta SC, and Aiken SC.",
  },
];

const SERVICE_AREAS = [
  {
    area: "Summerville and west Augusta",
    detail: "Older homes with attics, basements, and decades of accumulated storage.",
  },
  {
    area: "Harrisburg",
    detail: "Post-renovation debris, estate cleanouts, and in-between-tenant hauls.",
  },
  {
    area: "SRP Park area and downtown Augusta corridor",
    detail: "Residential and commercial requests in the urban core.",
  },
  {
    area: "Barton Chapel Road area and south Augusta",
    detail: "Larger properties with garages, sheds, and outbuildings.",
  },
  {
    area: "North Augusta, SC and Aiken, SC",
    detail: "Full CSRA coverage across the state line.",
  },
];

export default function JunkRemovalAugustaPage() {
  const telHref = `tel:${BUSINESS_PHONE.replace(/\D/g, "")}`;

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(serviceSchema).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c"),
        }}
      />

      {/* Phone bar */}
      <div className="bg-green-700 text-white text-center py-2 px-4 text-sm font-medium">
        Call or text for a free quote:{" "}
        <a href={telHref} className="font-bold underline hover:text-green-100">
          {BUSINESS_PHONE}
        </a>
        {" · Serving Augusta, GA & surrounding areas"}
      </div>

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="bg-gray-50 border-b border-gray-100 py-2 px-6 text-sm text-gray-500"
      >
        <ol className="max-w-4xl mx-auto flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-green-600 transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-gray-800 font-medium" aria-current="page">
            {PAGE_TITLE}
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-white px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Junk Removal in Augusta, GA
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Whether you&apos;re clearing out a garage off Barton Chapel Road, hauling
            old furniture from a Summerville rental, or doing a full cleanout near
            the SRP Park area, Esee Property Services connects Augusta residents
            and property owners with local junk haulers who get the job done.
          </p>
          <p className="text-lg text-gray-600 mb-8">
            You submit your request online — ideally with a few photos — and we
            match you with an available local provider who serves your area. No
            waiting on hold. No back-and-forth. Just a straightforward process
            that gets you from &quot;I need this gone&quot; to done.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/leads/new"
              className="inline-block bg-green-600 text-white text-base font-semibold px-8 py-3 rounded-full hover:bg-green-700 transition-colors text-center"
            >
              Request a Free Quote
            </Link>
            <a
              href={telHref}
              className="inline-block border-2 border-green-600 text-green-700 text-base font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors text-center"
            >
              Call {BUSINESS_PHONE}
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            How It Works
          </h2>
          <ol className="space-y-6">
            {[
              {
                n: "1",
                title: "Submit your request",
                body: "Use our online quote form to describe what needs to go and where you're located. Photos make it easier to get an accurate quote quickly.",
              },
              {
                n: "2",
                title: "We match you with a local provider",
                body: "Based on your location, item type, and load size, we connect your request with an available hauler in the Augusta metro area.",
              },
              {
                n: "3",
                title: "Confirm and schedule",
                body: "Once you've reviewed the quote, your provider coordinates the pickup. Same-day quote response is available for many Augusta-area requests.",
              },
            ].map(({ n, title, body }) => (
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
          <div className="mt-8">
            <Link
              href="/leads/new"
              className="inline-block bg-green-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-green-700 transition-colors"
            >
              Request a Free Junk Removal Quote
            </Link>
          </div>
        </div>
      </section>

      {/* What we haul / what we don't */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto grid sm:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              What Can Be Hauled
            </h2>
            <ul className="space-y-3">
              {WHAT_WE_HAUL.map((item) => (
                <li key={item} className="flex gap-2 text-gray-700">
                  <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-500">
              Unsure about a specific item? Note it in your quote request and a
              provider will advise you directly.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              What May Not Be Accepted
            </h2>
            <ul className="space-y-3">
              {WHAT_NOT_ACCEPTED.map((item) => (
                <li key={item} className="flex gap-2 text-gray-700">
                  <span className="text-red-400 font-bold flex-shrink-0 mt-0.5">
                    ✕
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-gray-500">
              If you have questions about a specific item, mention it in your
              quote request.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Junk Removal Pricing in Augusta, GA
          </h2>
          <div className="bg-white border border-gray-200 rounded-2xl p-8">
            <p className="text-lg text-gray-700 mb-4">
              Most Augusta residential junk removal jobs range from{" "}
              <strong>$150–$450</strong> depending on load size, item type,
              access difficulty, and disposal needs.
            </p>
            <ul className="space-y-2 text-gray-600 text-sm mb-6">
              <li>
                · Single piece of furniture from a ground-floor room — lower
                end of the range
              </li>
              <li>
                · Full garage cleanout with mixed debris and appliances —
                quoted accordingly
              </li>
              <li>
                · Multi-trip hauls or specialty items — confirmed in your quote
              </li>
            </ul>
            <p className="text-gray-700 mb-6">
              Pricing is confirmed before any work begins — no surprises at
              pickup. Including photos with your request is the fastest way to
              get an accurate quote.
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

      {/* Service areas */}
      <section className="bg-white px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Serving Augusta and the Surrounding CSRA
          </h2>
          <p className="text-gray-600 mb-8">
            We route junk removal requests from across Augusta and the broader
            metro area:
          </p>
          <ul className="space-y-4 mb-6">
            {SERVICE_AREAS.map(({ area, detail }) => (
              <li key={area} className="flex gap-3">
                <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">
                  ✓
                </span>
                <p className="text-gray-700">
                  <strong>{area}</strong> — {detail}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-gray-600">
            We also serve{" "}
            <Link href="/" className="text-green-600 hover:underline">
              Evans, Grovetown, and Martinez
            </Link>
            .
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 px-6 py-16 border-t border-gray-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Frequently Asked Questions
          </h2>
          <dl className="space-y-8">
            {FAQS.map(({ q, a }) => (
              <div
                key={q}
                className="border-b border-gray-200 pb-8 last:border-0 last:pb-0"
              >
                <dt className="font-semibold text-gray-900 mb-2">{q}</dt>
                <dd className="text-gray-600">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Ready to clear it out?
        </h2>
        <p className="text-green-100 mb-8 max-w-xl mx-auto">
          Send a few pictures and request a free quote online. You&apos;ll hear
          back from a local Augusta-area provider with pricing and next steps.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/leads/new"
            className="inline-block bg-white text-green-700 font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors"
          >
            Request a Free Quote
          </Link>
          <a
            href={telHref}
            className="inline-block border-2 border-white text-white font-semibold px-8 py-3 rounded-full hover:bg-green-700 transition-colors"
          >
            Call {BUSINESS_PHONE}
          </a>
        </div>
      </section>

      {/* Footer nav */}
      <div className="bg-white border-t border-gray-100 px-6 py-6">
        <div className="max-w-3xl mx-auto flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-green-600 transition-colors">
            ← Back to Home
          </Link>
          <span aria-hidden="true">·</span>
          <Link
            href="/leads/new"
            className="hover:text-green-600 transition-colors"
          >
            Request a Quote
          </Link>
          <span aria-hidden="true">·</span>
          {/* Link activates once /landscaping-augusta-ga is built */}
          <span className="text-gray-400">Landscaping in Augusta, GA</span>
        </div>
      </div>
    </main>
  );
}
