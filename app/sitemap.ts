import type { MetadataRoute } from "next";
import { getPublishedPages, getNicheHubs, getCityHubs } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

// Registry-driven: the 15 approved niche×city pages, the niche hubs, and the city hubs
// all come straight from the publication allow-list, so unpublished combinations can
// never appear and future approved pages enter the sitemap automatically. Admin/API
// routes are excluded (they are not registry entries and are blocked in robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/leads/new`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    // Existing legitimate legacy page — kept live.
    { url: `${SITE_URL}/junk-removal-augusta-ga`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const nicheHubEntries: MetadataRoute.Sitemap = getNicheHubs().map((h) => ({
    url: `${SITE_URL}/${h.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const cityHubEntries: MetadataRoute.Sitemap = getCityHubs().map((h) => ({
    url: `${SITE_URL}/${h.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const pageEntries: MetadataRoute.Sitemap = getPublishedPages().map((p) => ({
    url: `${SITE_URL}/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticEntries, ...nicheHubEntries, ...cityHubEntries, ...pageEntries];
}
