import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseWebhook, verifyWebhookSignature, verifyWebhookSubscription } from "./index";

const APP_SECRET = "test-app-secret";

describe("verifyWebhookSignature", () => {
  const body = JSON.stringify({ object: "whatsapp_business_account" });
  const sign = (payload: string) =>
    `sha256=${createHmac("sha256", APP_SECRET).update(payload, "utf8").digest("hex")}`;

  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(APP_SECRET, body, sign(body))).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(APP_SECRET, body + " ", sign(body))).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyWebhookSignature(APP_SECRET, body, null)).toBe(false);
    expect(verifyWebhookSignature(APP_SECRET, body, "sha256=deadbeef")).toBe(false);
    expect(verifyWebhookSignature(APP_SECRET, body, "not-a-signature")).toBe(false);
  });
});

describe("verifyWebhookSubscription", () => {
  it("echoes the challenge on a valid token", () => {
    expect(
      verifyWebhookSubscription(
        { "hub.mode": "subscribe", "hub.verify_token": "tok", "hub.challenge": "12345" },
        "tok",
      ),
    ).toBe("12345");
  });

  it("rejects a wrong token", () => {
    expect(
      verifyWebhookSubscription(
        { "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "12345" },
        "tok",
      ),
    ).toBeNull();
  });
});

describe("parseWebhook", () => {
  it("extracts text and button replies", () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "1",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                contacts: [{ wa_id: "972501234567" }],
                messages: [
                  { from: "972501234567", id: "wamid.A", timestamp: "1234", text: { body: "in" } },
                  {
                    from: "972501234567",
                    id: "wamid.B",
                    timestamp: "1235",
                    interactive: { button_reply: { id: "rsvp_in:event1" } },
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const messages = parseWebhook(payload);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ from: "972501234567", text: "in" });
    expect(messages[1]).toMatchObject({ buttonPayload: "rsvp_in:event1" });
  });

  it("returns nothing for status updates", () => {
    const payload = {
      entry: [{ changes: [{ value: { statuses: [{ id: "wamid.A", status: "delivered" }] } }] }],
    };
    expect(parseWebhook(payload)).toHaveLength(0);
  });
});
