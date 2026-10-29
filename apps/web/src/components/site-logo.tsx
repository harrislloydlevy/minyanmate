import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * The "MinyanMate" wordmark used in page headers. Links to the signed-in
 * user's minyans when authenticated, or to the login page otherwise.
 */
export async function SiteLogo() {
  let signedIn = false;
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    signedIn = Boolean(session);
  } catch {
    // Session lookup unavailable — fall back to the login page.
  }

  return (
    <Link
      href={signedIn ? "/my" : "/login"}
      className="text-lg font-bold tracking-tight"
    >
      Minyan<span className="text-primary">Mate</span>
    </Link>
  );
}
