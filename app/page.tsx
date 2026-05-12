import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center bg-white">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 max-w-2xl">
          Local Services, Done Right
        </h1>
        <p className="mt-4 text-lg text-gray-500 max-w-xl">
          Fast, affordable junk removal and landscaping. Get a free quote today — no hassle, no obligation.
        </p>
        <Link
          href="/leads/new"
          className="mt-8 inline-block bg-green-600 text-white text-lg font-semibold px-8 py-4 rounded-full hover:bg-green-700 transition-colors"
        >
          Get a Free Quote
        </Link>
      </section>

      {/* Services */}
      <section className="bg-gray-50 py-16 px-6">
        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-4xl mb-4">🚛</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Junk Removal</h2>
            <p className="text-gray-500">
              Full-service haul away for furniture, appliances, yard waste, and more.
              We load it, we haul it, you forget it.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-4xl mb-4">🌿</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Landscaping</h2>
            <p className="text-gray-500">
              Lawn care, cleanup, trimming, and seasonal maintenance.
              Keep your yard looking great year-round.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 py-16 px-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to get started?</h2>
        <p className="text-green-100 mb-6">
          Submit your request in under 2 minutes. Upload photos and we{"'"}ll get back to you fast.
        </p>
        <Link
          href="/leads/new"
          className="inline-block bg-white text-green-700 font-semibold px-8 py-3 rounded-full hover:bg-green-50 transition-colors"
        >
          Request a Quote
        </Link>
      </section>

      <footer className="text-center py-6 text-sm text-gray-400 bg-white border-t border-gray-100">
        &copy; {new Date().getFullYear()} Local Pro Services. All rights reserved.
      </footer>
    </main>
  );
}
