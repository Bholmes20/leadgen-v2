import puppeteer from "puppeteer-core";
import path from "path";
import fs from "fs";
import type { Service } from "../adgen/types";
import { GRAPHIC_LOCATION_LINES } from "../adgen/content";

const CHROME = "/usr/bin/google-chrome";
const TEMPLATES_DIR = path.join(process.cwd(), "lib", "graphics", "templates");
const OUT_DIR = path.join(process.cwd(), "data", "graphics");

// Services without a dedicated template fall back to the nearest visual match
const TEMPLATE_FOR: Record<Service, string> = {
  "junk-removal":    "junk-removal.html",
  landscaping:       "landscaping.html",
  "seasonal-cleanup":"landscaping.html",
  "yard-cleanup":    "landscaping.html",
  "leaf-removal":    "landscaping.html",
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface GraphicSlots {
  hook: string;
  valueProp: string;
  ctaBadge: string;
  locations: string;
}

export async function renderGraphic(
  service: Service,
  slots: Omit<GraphicSlots, "locations">,
  postId: string
): Promise<string> {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const templateFile = TEMPLATE_FOR[service];
  const templatePath = path.join(TEMPLATES_DIR, templateFile);
  const html = fs.readFileSync(templatePath, "utf-8");
  const outPath = path.join(OUT_DIR, `${postId}.png`);

  const fullSlots: GraphicSlots = {
    ...slots,
    locations: pick(GRAPHIC_LOCATION_LINES),
  };

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
    defaultViewport: { width: 1080, height: 1080, deviceScaleFactor: 1 },
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 15000 });
    // Wait for Google Fonts to finish loading before screenshot
    await page.waitForNetworkIdle({ timeout: 8000 }).catch(() => {
      // Font load timeout is non-fatal — fallback fonts will be used
    });

    await page.evaluate((s: GraphicSlots) => {
      (document.getElementById("hook") as HTMLElement).textContent = s.hook;
      (document.getElementById("value-prop") as HTMLElement).textContent = s.valueProp;
      (document.getElementById("cta-text") as HTMLElement).textContent = s.ctaBadge;
      (document.getElementById("locations") as HTMLElement).textContent = s.locations;
    }, fullSlots);

    await page.screenshot({ path: outPath, type: "png" });
    console.log(`[graphics] Rendered ${path.basename(outPath)}`);
    return outPath;
  } finally {
    await browser.close();
  }
}
