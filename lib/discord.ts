import type { GeneratedAd, DiscordChannel } from "./adgen/types";

const CHANNEL_WEBHOOK_ENV: Record<DiscordChannel, string> = {
  "ad-content": "DISCORD_WEBHOOK_AD_CONTENT",
  "junk-removal-ads": "DISCORD_WEBHOOK_JUNK_REMOVAL",
  "landscaping-ads": "DISCORD_WEBHOOK_LANDSCAPING",
  "seasonal-promos": "DISCORD_WEBHOOK_SEASONAL",
};

const AD_COLORS: Record<DiscordChannel, number> = {
  "ad-content": 0x9b59b6,
  "junk-removal-ads": 0xe67e22,
  "landscaping-ads": 0x2ecc71,
  "seasonal-promos": 0xe74c3c,
};

function resolveWebhook(channel: DiscordChannel): string | undefined {
  const specific = process.env[CHANNEL_WEBHOOK_ENV[channel]];
  if (specific) return specific;
  // Fall back to the general webhook
  return process.env.DISCORD_WEBHOOK_URL;
}

export async function sendAdToDiscord(ad: GeneratedAd): Promise<void> {
  const webhookUrl = resolveWebhook(ad.channel);
  if (!webhookUrl) {
    console.warn(
      `[ad-gen] No webhook configured for channel #${ad.channel} — skipping`
    );
    return;
  }

  const serviceLabels: Record<string, string> = {
    "junk-removal": "Junk Removal",
    landscaping: "Landscaping",
    "seasonal-cleanup": "Seasonal Cleanup",
    "yard-cleanup": "Yard Cleanup",
    "leaf-removal": "Leaf Removal",
  };

  const embed = {
    title: `Generated Ad — ${serviceLabels[ad.service] ?? ad.service}`,
    description: ad.fullText,
    color: AD_COLORS[ad.channel],
    fields: [
      { name: "Format", value: ad.format, inline: true },
      { name: "Tone", value: ad.tone, inline: true },
      { name: "Service", value: ad.service, inline: true },
    ],
    footer: { text: `Ad ID: ${ad.id} · Post to social manually` },
    timestamp: ad.generatedAt,
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    console.error(
      `[ad-gen] Discord webhook failed for #${ad.channel}:`,
      res.status,
      await res.text()
    );
  }
}

export async function sendSystemAlert(
  title: string,
  description: string,
  isError = false
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const embed = {
    title,
    description,
    color: isError ? 0xe74c3c : 0xe67e22,
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    console.error("[system-alert] Discord webhook failed:", res.status);
  }
}

export interface LeadNotification {
  id: string;
  service: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  details: string;
  photoCount: number;
  estimateLow: number;
  estimateHigh: number;
}

export async function sendDiscordAlert(lead: LeadNotification): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_URL not set — skipping alert");
    return;
  }

  const serviceLabel = lead.service === "junk-removal" ? "Junk Removal" : "Landscaping";
  const estimateRange = `$${lead.estimateLow}–$${lead.estimateHigh}`;

  const embed = {
    title: `New Lead: ${serviceLabel}`,
    color: lead.service === "junk-removal" ? 0xe67e22 : 0x2ecc71,
    fields: [
      { name: "Name", value: lead.name, inline: true },
      { name: "Phone", value: lead.phone, inline: true },
      { name: "Email", value: lead.email, inline: true },
      { name: "Address", value: lead.address, inline: false },
      { name: "Details", value: lead.details || "No details provided", inline: false },
      { name: "Photos", value: `${lead.photoCount} uploaded`, inline: true },
      { name: "Internal Estimate", value: estimateRange, inline: true },
    ],
    footer: { text: `Lead ID: ${lead.id}` },
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });

  if (!res.ok) {
    console.error("Discord webhook failed:", res.status, await res.text());
  }
}
