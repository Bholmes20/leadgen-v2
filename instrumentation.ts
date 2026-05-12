export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.AD_GEN_SCHEDULER !== "true") return;

  const INTERVAL_HOURS = parseFloat(process.env.AD_GEN_INTERVAL_HOURS ?? "8");
  const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;
  const ADS_PER_TICK = parseInt(process.env.AD_GEN_PER_TICK ?? "1");

  const { generateAndSendAds } = await import("./lib/adgen/sender");

  console.log(
    `[ad-gen] Scheduler started — ${ADS_PER_TICK} ad(s) every ${INTERVAL_HOURS}h`
  );

  setInterval(() => {
    generateAndSendAds(ADS_PER_TICK).catch((err) =>
      console.error("[ad-gen] Scheduled generation failed:", err)
    );
  }, INTERVAL_MS);
}
