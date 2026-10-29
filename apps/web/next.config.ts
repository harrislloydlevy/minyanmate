import type { NextConfig } from "next";

// Hostnames allowed to make dev requests (e.g. a tunnel or private hostname).
// Kept in the environment so private domains are not committed to source.
const configuredDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// In development, accept any hostname. This covers localhost, LAN IPs, mDNS
// names, and tunnels without keeping an allow-list in sync with the machine.
// Next matches wildcards segment-by-segment, so cover the common host depths.
const anyDevOrigin =
  process.env.NODE_ENV === "development"
    ? [
        ...Array.from({ length: 7 }, (_, index) =>
          Array(index + 2)
            .fill("*")
            .join("."),
        ),
        // Next compares exact origins too; wildcards above only cover dotted hosts.
        "localhost",
        "[::1]",
        "::1",
      ]
    : [];

const nextConfig: NextConfig = {
  // Workspace packages export TypeScript directly
  transpilePackages: ["@minyanmate/core", "@minyanmate/db", "@minyanmate/whatsapp"],
  // better-sqlite3 is a native module; keep it out of the bundler
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: [...anyDevOrigin, ...configuredDevOrigins],
  devIndicators: {
    buildActivity: false,
  },
};

export default nextConfig;
