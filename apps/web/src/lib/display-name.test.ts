import { describe, expect, it } from "vitest";
import { displayName, isPhoneLikeName, needsName, safeNextPath } from "./display-name";

describe("display names", () => {
  it("treats empty names as missing", () => {
    expect(needsName("")).toBe(true);
    expect(needsName("   ")).toBe(true);
    expect(needsName(null)).toBe(true);
    expect(displayName("")).toBe("Member");
  });

  it("detects phone-number placeholders", () => {
    expect(isPhoneLikeName("+972 50 123 4567")).toBe(true);
    expect(isPhoneLikeName("972-50-123-4567")).toBe(true);
    expect(isPhoneLikeName("5551234")).toBe(true);
    expect(isPhoneLikeName("Chaim 5551234")).toBe(false);
    expect(isPhoneLikeName("Chaim")).toBe(false);
    expect(isPhoneLikeName("חיים")).toBe(false);
    expect(isPhoneLikeName("123")).toBe(false);
  });

  it("never returns a phone number as a display name", () => {
    expect(displayName("+972 50 123 4567")).toBe("Member");
    expect(displayName("  Chaim  ")).toBe("Chaim");
    expect(displayName(null, "Someone")).toBe("Someone");
  });

  it("also catches an exact phone number passed separately", () => {
    expect(needsName("501234567", "+972 50 123 4567")).toBe(true);
    expect(needsName("Chaim", "+972 50 123 4567")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("allows same-app paths", () => {
    expect(safeNextPath("/my")).toBe("/my");
    expect(safeNextPath("/groups/family?join=abc")).toBe("/groups/family?join=abc");
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(safeNextPath("https://example.com")).toBe("/my");
    expect(safeNextPath("//example.com")).toBe("/my");
    expect(safeNextPath("/\\example.com")).toBe("/my");
    expect(safeNextPath("")).toBe("/my");
    expect(safeNextPath(null, "/groups")).toBe("/groups");
  });
});
