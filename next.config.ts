import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "puppeteer-core"],
  // Opt-in build output dir. Unset → Next uses the default ".next" (production
  // behavior is unchanged). Set NEXT_BUILD_DIR to build/test without clobbering a
  // running production server's ".next".
  ...(process.env.NEXT_BUILD_DIR ? { distDir: process.env.NEXT_BUILD_DIR } : {}),
};

export default nextConfig;
