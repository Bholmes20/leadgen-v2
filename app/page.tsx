import Link from "next/link";

const BUSINESS_PHONE = process.env.BUSINESS_PHONE ?? "706-828-1733";
const BUSINESS_NAME = "Esee Property Services";

const SERVICE_AREAS = [
  { city: "Augusta", state: "GA" },
  { city: "Evans", state: "GA" },
  { city: "Grovetown", state: "GA" },
  { city: "Martinez", state: "GA" },
  { city: "North Augusta", state: "SC" },
  { city: "Aiken", state: "SC" },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">

      {/* Phone header — above the fold, visible on every device */}
      <div className="bg-green-700 text-white text-center py-2 px-4 text-sm font-medium">
        Call or text for a free quote:{" "}
        <a
          href={`tel:${BUSINESS_PHONE.replace(/\D/g, "")}`}
          className="font-bold underline hover:text-green-100"
          aria-label={`Call ${BUSINESS_NAME}`}
        >
          {BUSINESS_PHONE}
        </a>
        {" "}· Serving Augusta, GA &amp; surrounding areas
      </div>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center bg-white">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 max-w-2xl">
          Junk Removal &amp; Landscaping in Augusta, GA
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl">
          Fast, affordable service for the Augusta metro area — Evans, Grovetown,
          Martinez, North Augusta, and Aiken. Get a free quote in under 2 minutes.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/leads/new"
            className="inline-block bg-green-600 text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-green-700 transition-colors"
          >
            Get a Free Quote
          </Link>
          <a
            href={`tel:${BUSINESS_PHONE.replace(/\D/g, "")}`}
            className="inline-block border-2 border-green-600 text-green-700 text-lg font-semibold px-8 py-4 rounded-full hover:bg-green-50 transition-colors"
          >
            Call {BUSINESS_PHONE}
          </a>
        </div>
      </section>

      {/* Services */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Our Services
          </h2>
          <div className="grid sm:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-4xl mb-4">🚛</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Junk Removal</h3>
              <p className="text-gray-500 mb-4">
                Full-service haul away for furniture, appliances, yard waste,
                and more. We load it, we haul it, you forget it.
              </p>
              <div className="flex flex-col gap-1">
                <Link
                  href="/junk-removal-augusta-ga"
                  className="text-green-600 font-medium text-sm hover:underline"
                >
                  Junk removal in Augusta, GA →
                </Link>
                <Link
                  href="/leads/new"
                  className="text-gray-400 text-sm hover:underline"
                >
                  Get a free quote →
                </Link>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <div className="text-4xl mb-4">🌿</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Landscaping</h3>
              <p className="text-gray-500 mb-4">
                Lawn care, cleanup, trimming, and seasonal maintenance. Keep
                your yard looking great year-round.
              </p>
              <Link
                href="/leads/new"
                className="text-green-600 font-medium text-sm hover:underline"
              >
                Get a landscaping quote →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Service area */}
      <section className="bg-white py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Serving the Augusta, GA Metro Area
          </h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">
            We provide junk removal and landscaping services throughout the
            CSRA — same-day service often available.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left max-w-lg mx-auto">
            {SERVICE_AREAS.map(({ city, state }) => (
              <li key={city} className="flex items-center gap-2 text-gray-700">
                <span className="text-green-500 font-bold" aria-hidden="true">✓</span>
                <span>
                  {city},{" "}
                  <abbr title={state === "GA" ? "Georgia" : "South Carolina"}>
                    {state}
                  </abbr>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">
          Ready to get started?
        </h2>
        <p className="text-green-100 mb-6">
          Submit your request in under 2 minutes. Upload photos and we&apos;ll
          get back to you fast.
        </p>
        <Link
          href="/leads/new"
          className="inline-block bg-white text-green-700 font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors"
        >
          Request a Quote
        </Link>
      </section>

      {/* Footer with NAP */}
      <footer className="bg-white border-t border-gray-100 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <div className="text-center sm:text-left">
            <p className="font-semibold text-gray-600">{BUSINESS_NAME}</p>
            <p>Augusta, GA &amp; surrounding CSRA</p>
            <a
              href={`tel:${BUSINESS_PHONE.replace(/\D/g, "")}`}
              className="hover:text-green-600 transition-colors"
            >
              {BUSINESS_PHONE}
            </a>
          </div>
          <div className="text-center sm:text-right">
            <p>&copy; {new Date().getFullYear()} {BUSINESS_NAME}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
