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
