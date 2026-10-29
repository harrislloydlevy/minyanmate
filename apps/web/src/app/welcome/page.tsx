import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SiteLogo } from "@/components/site-logo";
import { auth } from "@/lib/auth";
import { needsName, safeNextPath } from "@/lib/display-name";
import { NameForm } from "./name-form";

export const metadata: Metadata = {
  title: "Welcome",
};

export const dynamic = "force-dynamic";

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const destination = safeNextPath(next);
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  if (!needsName(session.user.name, session.user.phoneNumber)) {
    redirect(destination);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <SiteLogo />
      <NameForm next={destination} />
    </div>
  );
}
