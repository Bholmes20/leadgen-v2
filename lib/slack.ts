// Slack quote-review alert. Every pickup request fires one of these to Brandon/admin
// so a quote can go out fast after reviewing photos. Set SLACK_WEBHOOK_URL (a Slack
// Incoming Webhook) to enable; with no webhook configured it no-ops (same best-effort
// pattern as lib/discord.ts) and never blocks a lead submission.

import { SITE_URL } from "./site";

export const SLACK_ALERT_TITLE = "New Grovetown Pickup Request — Quote Needed";

export interface SlackQuoteAlertInput {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  zip: string | null;
  itemTypeLabel: string;
  pickupLocationLabel: string;
  preferredTiming: string;
  details: string;
  /** Stored photo paths (e.g. "/uploads/abc.jpg"); absolutized for the alert. */
  photoPaths: string[];
}

function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function adminLeadUrl(id: string): string {
  return `${SITE_URL}/admin/leads/${id}`;
}

/**
 * Build the Slack webhook payload. Pure + deterministic so it can be unit-tested.
 * `text` is a complete plain-text fallback that also carries every field (used by
 * notifications and by the tests); `blocks` is the rich rendering.
 */
export function buildSlackQuotePayload(input: SlackQuoteAlertInput): {
  text: string;
  blocks: unknown[];
} {
  const adminUrl = adminLeadUrl(input.id);
  const photoLines =
    input.photoPaths.length > 0
      ? input.photoPaths.map((p, i) => `Photo ${i + 1}: ${absoluteUrl(p)}`)
      : ["No photos uploaded"];
  const addressLine = [input.address, input.zip].filter(Boolean).join(" ");

  const textLines = [
    `*${SLACK_ALERT_TITLE}*`,
    `Name: ${input.name}`,
    `Phone: ${input.phone}`,
    `Email: ${input.email}`,
    `Address: ${addressLine}`,
    `Service: ${input.itemTypeLabel}`,
    `Pickup location: ${input.pickupLocationLabel}`,
    `Preferred timing: ${input.preferredTiming}`,
    `Details: ${input.details || "None provided"}`,
    ...photoLines,
    `Review & quote: ${adminUrl}`,
  ];
  const text = textLines.join("\n");

  const blocks: unknown[] = [
    { type: "header", text: { type: "plain_text", text: SLACK_ALERT_TITLE, emoji: true } },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Name:*\n${input.name}` },
        { type: "mrkdwn", text: `*Phone:*\n${input.phone}` },
        { type: "mrkdwn", text: `*Email:*\n${input.email}` },
        { type: "mrkdwn", text: `*Address:*\n${addressLine || "—"}` },
        { type: "mrkdwn", text: `*Service:*\n${input.itemTypeLabel}` },
        { type: "mrkdwn", text: `*Pickup location:*\n${input.pickupLocationLabel}` },
        { type: "mrkdwn", text: `*Preferred timing:*\n${input.preferredTiming}` },
      ],
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Details:*\n${input.details || "None provided"}` },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Photos:*\n${photoLines.join("\n")}` },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Review & Send Quote", emoji: true },
          url: adminUrl,
          style: "primary",
        },
      ],
    },
  ];

  return { text, blocks };
}

export async function sendSlackQuoteAlert(input: SlackQuoteAlertInput): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("SLACK_WEBHOOK_URL not set — skipping Slack quote alert");
    return;
  }

  const payload = buildSlackQuotePayload(input);
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    console.error("Slack webhook failed:", res.status, await res.text().catch(() => "(unreadable)"));
  }
}
