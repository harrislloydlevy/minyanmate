import { describe, expect, it } from "vitest";
import {
  defaultMessageChannel,
  defaultMessageDeliveryMode,
  isMessageChannel,
  isMessageDeliveryMode,
  isMessageKind,
  isMessageSender,
  isMessageStatus,
} from "./messaging";

describe("message channel defaults", () => {
  it("uses the console in development", () => {
    expect(defaultMessageChannel({ APP_ENV: "development" })).toBe("console");
    expect(defaultMessageChannel({})).toBe("console");
  });

  it("uses WhatsApp in production", () => {
    expect(defaultMessageChannel({ APP_ENV: "production" })).toBe("whatsapp");
    expect(defaultMessageChannel({ NODE_ENV: "production" })).toBe("whatsapp");
  });

  it("honours an explicit MESSAGING_CHANNEL", () => {
    expect(defaultMessageChannel({ APP_ENV: "production", MESSAGING_CHANNEL: "sms" })).toBe("sms");
    expect(defaultMessageChannel({ APP_ENV: "development", MESSAGING_CHANNEL: "email" })).toBe(
      "email",
    );
  });

  it("ignores an unknown MESSAGING_CHANNEL", () => {
    expect(defaultMessageChannel({ APP_ENV: "development", MESSAGING_CHANNEL: "carrier-pigeon" })).toBe(
      "console",
    );
  });
});

describe("message delivery mode defaults", () => {
  it("defaults to automatic dispatch", () => {
    expect(defaultMessageDeliveryMode({})).toBe("auto");
    expect(defaultMessageDeliveryMode({ MESSAGING_DELIVERY_MODE: "auto" })).toBe("auto");
  });

  it("can hold messages as manual requests", () => {
    expect(defaultMessageDeliveryMode({ MESSAGING_DELIVERY_MODE: "manual" })).toBe("manual");
    expect(defaultMessageDeliveryMode({ MESSAGING_DELIVERY_MODE: " MANUAL " })).toBe("manual");
  });
});

describe("message value guards", () => {
  it("recognises known values", () => {
    expect(isMessageChannel("whatsapp")).toBe(true);
    expect(isMessageKind("quorum_reached")).toBe(true);
    expect(isMessageStatus("requested")).toBe(true);
    expect(isMessageDeliveryMode("manual")).toBe(true);
    expect(isMessageSender("worker")).toBe(true);
  });

  it("rejects unknown values", () => {
    expect(isMessageChannel("fax")).toBe(false);
    expect(isMessageKind("marketing")).toBe(false);
    expect(isMessageStatus("delivered")).toBe(false);
    expect(isMessageDeliveryMode("later")).toBe(false);
    expect(isMessageSender("robot")).toBe(false);
    expect(isMessageChannel(null)).toBe(false);
  });
});
