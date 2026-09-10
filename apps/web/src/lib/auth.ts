import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import * as schema from "@minyanmate/db/schema";
import { db } from "./db";

const isProduction = process.env.APP_ENV === "production";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-insecure-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
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
      sendOTP: async ({ phoneNumber: to, code }) => {
        if (!isProduction) {
          // Dev mode: no Meta credentials needed, the code lands in the web logs
          console.log(`[dev-otp] WhatsApp OTP for ${to}: ${code}`);
          return;
        }
        const { WhatsAppClient } = await import("@minyanmate/whatsapp");
        await WhatsAppClient.fromEnv().sendText(to, `Your MinyanMate verification code is: ${code}`);
      },
    }),
  ],
});
