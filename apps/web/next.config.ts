import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages export TypeScript directly
  transpilePackages: ["@minyanmate/core", "@minyanmate/db", "@minyanmate/whatsapp"],
  // better-sqlite3 is a native module; keep it out of the bundler
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
