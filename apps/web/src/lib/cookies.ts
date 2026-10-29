/**
 * Read a cookie value from document.cookie.
 * Returns null if the cookie is not set.
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? "") : null;
}

/**
 * Write a cookie from the browser. Mirrors the attributes used by the server
 * when it sets guest identity cookies.
 */
export function setCookie(name: string, value: string, maxAgeSeconds = 60 * 60 * 24 * 30): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(
    value,
  )}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}
