const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

/**
 * Names are user-facing. Phone numbers are identity data, never a display
 * name. Treat a value made only of digits/phone punctuation as a placeholder.
 */
export function isPhoneLikeName(name: string | null | undefined): boolean {
  const value = name?.trim() ?? "";
  if (!value || /\p{L}/u.test(value)) return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= MIN_PHONE_DIGITS && digits.length <= MAX_PHONE_DIGITS;
}

/** True when the account still needs the person to choose a display name. */
export function needsName(name: string | null | undefined, phoneNumber?: string | null): boolean {
  const value = name?.trim() ?? "";
  if (!value) return true;
  if (isPhoneLikeName(value)) return true;

  if (phoneNumber) {
    const digits = value.replace(/\D/g, "");
    const phoneDigits = phoneNumber.replace(/\D/g, "");
    if (digits.length >= MIN_PHONE_DIGITS && digits === phoneDigits) return true;
  }

  return false;
}

/** A safe fallback so a phone number can never leak into a name slot. */
export function displayName(name: string | null | undefined, fallback = "Member"): string {
  return needsName(name) ? fallback : (name?.trim() ?? fallback);
}

/** Only allow same-app redirects (no open redirects). */
export function safeNextPath(next: string | null | undefined, fallback = "/my"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}
