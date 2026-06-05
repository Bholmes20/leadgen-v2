import { v4 as uuidv4 } from "uuid";
import type { Service, AdFormat, Tone, DiscordChannel, GeneratedAd } from "./types";
import {
  HEADLINES,
  BODIES,
  CTAS,
  LOCATIONS,
  URGENCY_PHRASES,
  SOCIAL_PROOF,
  GRAPHIC_COPY,
  GRAPHIC_LOCATION_LINES,
} from "./content";
import type { GraphicCopy } from "./types";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const SERVICE_CHANNEL: Record<Service, DiscordChannel> = {
  "junk-removal": "junk-removal-ads",
  landscaping: "landscaping-ads",
  "seasonal-cleanup": "seasonal-promos",
  "yard-cleanup": "landscaping-ads",
  "leaf-removal": "seasonal-promos",
};

const ALL_SERVICES: Service[] = [
  "junk-removal",
  "landscaping",
  "seasonal-cleanup",
  "yard-cleanup",
  "leaf-removal",
];

const ALL_FORMATS: AdFormat[] = [
  "facebook",
  "craigslist",
  "nextdoor",
  "promo-blurb",
  "headline",
  "cta",
];

const ALL_TONES: Tone[] = [
  "friendly",
  "urgent",
  "professional",
  "casual",
  "neighborhood",
];

function assembleFullText(ad: Omit<GeneratedAd, "fullText">): string {
  const formatLabels: Record<AdFormat, string> = {
    facebook: "📘 **FACEBOOK POST**",
    craigslist: "📋 **CRAIGSLIST AD**",
    nextdoor: "🏘️ **NEXTDOOR POST**",
    "promo-blurb": "📣 **PROMO BLURB**",
    headline: "🗣️ **HEADLINE**",
    cta: "🔥 **CTA**",
  };

  const serviceLabels: Record<Service, string> = {
    "junk-removal": "Junk Removal",
    landscaping: "Landscaping",
    "seasonal-cleanup": "Seasonal Cleanup",
    "yard-cleanup": "Yard Cleanup",
    "leaf-removal": "Leaf Removal",
  };

  const toneLabel = ad.tone.charAt(0).toUpperCase() + ad.tone.slice(1);
  const location = pick(LOCATIONS);

  let text = `${formatLabels[ad.format]}\n`;
  text += `**Service:** ${serviceLabels[ad.service]} | **Tone:** ${toneLabel} | **Location:** ${location}\n\n`;
  text += `**${ad.headline}**\n\n`;

  if (ad.body) {
    text += `${ad.body}\n\n`;
  }

  text += `👉 ${ad.cta}`;

  // Occasionally append urgency or social proof
  if (Math.random() < 0.4) {
    text += `\n\n⚡ ${pick(URGENCY_PHRASES)}`;
  }
  if (Math.random() < 0.3) {
    text += `\n✅ ${pick(SOCIAL_PROOF)}`;
  }

  return text;
}

export function generateAd(options?: {
  service?: Service;
  format?: AdFormat;
  tone?: Tone;
}): GeneratedAd {
  const service = options?.service ?? pick(ALL_SERVICES);
  const format = options?.format ?? pick(ALL_FORMATS);
  const tone = options?.tone ?? pick(ALL_TONES);

  const headline = pick(HEADLINES[service]);
  const bodyPool = BODIES[service][format];
  const body = bodyPool?.length ? pick(bodyPool) : "";
  const cta = pick(CTAS[tone]);
  const channel = SERVICE_CHANNEL[service];

  const graphicCopy: GraphicCopy | undefined =
    format === "facebook" ? pick(GRAPHIC_COPY[service]) : undefined;

  const partial: Omit<GeneratedAd, "fullText"> = {
    id: uuidv4(),
    service,
    format,
    tone,
    headline,
    body,
    cta,
    channel,
    generatedAt: new Date().toISOString(),
    graphicCopy,
  };

  return { ...partial, fullText: assembleFullText(partial) };
}

export function generateBatch(
  count: number,
  options?: { service?: Service; format?: AdFormat; tone?: Tone }
): GeneratedAd[] {
  return Array.from({ length: count }, () => generateAd(options));
}
