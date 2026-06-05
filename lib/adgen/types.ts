export type Service =
  | "junk-removal"
  | "landscaping"
  | "seasonal-cleanup"
  | "yard-cleanup"
  | "leaf-removal";

export type AdFormat =
  | "facebook"
  | "craigslist"
  | "nextdoor"
  | "promo-blurb"
  | "headline"
  | "cta";

export type Tone =
  | "friendly"
  | "urgent"
  | "professional"
  | "casual"
  | "neighborhood";

export type DiscordChannel =
  | "ad-content"
  | "junk-removal-ads"
  | "landscaping-ads"
  | "seasonal-promos";

export interface GraphicCopy {
  hook: string;
  valueProp: string;
  ctaBadge: string;
}

export interface GeneratedAd {
  id: string;
  service: Service;
  format: AdFormat;
  tone: Tone;
  headline: string;
  body: string;
  cta: string;
  fullText: string;
  channel: DiscordChannel;
  generatedAt: string;
  graphicCopy?: GraphicCopy;
}
