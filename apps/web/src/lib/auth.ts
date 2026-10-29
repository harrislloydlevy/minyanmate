import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import * as schema from "@minyanmate/db/schema";
import { db } from "./db";

const isProduction = process.env.APP_ENV === "production";

const authURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const authOrigin = (() => {
  try {
    return new URL(authURL).origin;
  } catch {
    return authURL;
  }
})();

// Extra origins (comma-separated) can be supplied without code changes, e.g.
// when the app is reached through a LAN address or tunnel.
const configuredOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const trustedOrigins = [
  authOrigin,
  ...configuredOrigins,
  // Local dev is commonly reached via localhost, 127.0.0.1, or a LAN IP on
  // varying ports. Keep these patterns out of production.
  ...(isProduction
    ? []
    : [
        "http://localhost:*",
        "http://127.0.0.1:*",
        "http://192.168.*:*",
        "http://10.*:*",
        "http://172.*:*",
      ]),
];

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-insecure-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  plugins: [
    phoneNumber({
      signUpOnVerification: {
        getTempEmail: (phone) => `${phone.replace(/[^+\d]/g, "")}@minyanmate.app`,
        getTempName: (phone) => phone,
      },
      sendOTP: async ({ phoneNumber: to, code }) => {
        if (!isProduction) {
          console.log(`[dev-otp] WhatsApp OTP for ${to}: ${code}`);
          return;
        }
        const { WhatsAppClient } = await import("@minyanmate/whatsapp");
        await WhatsAppClient.fromEnv().sendText(to, `Your MinyanMate verification code is: ${code}`);
      },
    }),
  ],
});
