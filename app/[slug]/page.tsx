import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveSlug, getAllStaticSlugs } from "@/lib/seo";
import { BUSINESS_NAME } from "@/lib/site";
import LandingPage from "@/components/seo/LandingPage";
import NicheHub from "@/components/seo/NicheHub";
import CityHub from "@/components/seo/CityHub";

// The flat [slug] segment resolves to one of three published things: a niche×city
// landing page, a niche hub, or a city hub. Only registry-approved slugs are generated;
// anything else 404s (dynamicParams = false), so no thin/unpublished pages can appear.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllStaticSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) return {};

  const canonical = `/${slug}`;
  let title: string;
  let description: string;

  if (resolved.kind === "page") {
    const { niche, city } = resolved.page;
    title = niche.metaTitle(city.name, city.state);
    description = niche.metaDescription(city.name, city.state);
  } else if (resolved.kind === "niche") {
    const { niche } = resolved.hub;
    title = `${niche.label} — Augusta, GA & the CSRA`;
    description = `${niche.blurb} Serving the Augusta, GA area and the CSRA — request a free quote and we'll match you with a local provider.`;
  } else {
    const { city } = resolved.hub;
    title = `Property Cleanout & Removal Services in ${city.name}, ${city.state}`;
    description = `${city.blurb} Connect with a local provider — see the property services available in ${city.name}, ${city.state}.`;
  }

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${BUSINESS_NAME}`,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${BUSINESS_NAME}`,
      description,
    },
  };
}

export default async function SlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = resolveSlug(slug);
  if (!resolved) notFound();

  if (resolved.kind === "page") return <LandingPage page={resolved.page} />;
  if (resolved.kind === "niche") return <NicheHub hub={resolved.hub} />;
  return <CityHub hub={resolved.hub} />;
}
