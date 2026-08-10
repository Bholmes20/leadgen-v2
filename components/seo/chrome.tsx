import Link from "next/link";
import { BUSINESS_PHONE } from "@/lib/site";

// Shared presentational chrome for the SEO factory (landing pages + hubs). Server
// components — no client JS. Keeps the pages consistent and DRY without a redesign.

export const telHref = `tel:${BUSINESS_PHONE.replace(/\D/g, "")}`;

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function PhoneBar({ area }: { area?: string }) {
  return (
    <div className="bg-green-700 text-white text-center py-2 px-4 text-sm font-medium">
      Call or text for a free quote:{" "}
      <a href={telHref} className="font-bold underline hover:text-green-100">
        {BUSINESS_PHONE}
      </a>
      {` · Serving ${area ?? "Augusta, GA & surrounding areas"}`}
    </div>
  );
}

export type Crumb = { name: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="bg-gray-50 border-b border-gray-100 py-2 px-6 text-sm text-gray-500"
    >
      <ol className="max-w-4xl mx-auto flex flex-wrap items-center gap-2">
        {items.map((c, i) => (
          <li key={c.name} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true">›</span>}
            {c.href ? (
              <Link href={c.href} className="hover:text-green-600 transition-colors">
                {c.name}
              </Link>
            ) : (
              <span className="text-gray-800 font-medium" aria-current="page">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function LeadCtaBand({ heading, sub }: { heading: string; sub: string }) {
  return (
    <section className="bg-green-600 px-6 py-16 text-center">
      <h2 className="text-2xl font-bold text-white mb-4">{heading}</h2>
      <p className="text-green-100 mb-8 max-w-xl mx-auto">{sub}</p>
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
  );
}

export function SiteFooter({
  disclaimer,
  links,
}: {
  disclaimer: string;
  links?: Crumb[];
}) {
  return (
    <div className="bg-white border-t border-gray-100 px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-green-600 transition-colors">
            ← Back to Home
          </Link>
          {(links ?? []).map((l) => (
            <span key={l.name} className="flex items-center gap-4">
              <span aria-hidden="true">·</span>
              <Link
                href={l.href ?? "/leads/new"}
                className="hover:text-green-600 transition-colors"
              >
                {l.name}
              </Link>
            </span>
          ))}
          <span aria-hidden="true">·</span>
          <Link href="/leads/new" className="hover:text-green-600 transition-colors">
            Request a Quote
          </Link>
        </div>
        <p className="text-xs text-gray-400">{disclaimer}</p>
      </div>
    </div>
  );
}
