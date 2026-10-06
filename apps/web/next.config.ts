import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages export TypeScript directly
  transpilePackages: ["@minyanmate/core", "@minyanmate/db", "@minyanmate/whatsapp"],
  // better-sqlite3 is a native module; keep it out of the bundler
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["minyanmate.tiyrah.duckdns.org"],
  devIndicators: {
    buildActivity: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.devServer = {
        ...config.devServer,
        client: {
          webSocketURL: "ws://minyanmate.tiyrah.duckdns.org:3100/_next/webpack-hmr",
        },
      };
    }
    return config;
  },
};

export default nextConfig;
