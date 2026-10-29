import type { NextConfig } from "next";

// Hostnames allowed to make dev requests (e.g. a tunnel or private hostname).
// Kept in the environment so private domains are not committed to source.
const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Workspace packages export TypeScript directly
  transpilePackages: ["@minyanmate/core", "@minyanmate/db", "@minyanmate/whatsapp"],
  // better-sqlite3 is a native module; keep it out of the bundler
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins,
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
