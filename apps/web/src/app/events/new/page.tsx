import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { EventForm } from "./event-form";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "New event",
};

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-svh flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      <main className="container flex flex-1 items-start justify-center py-10">
        <EventForm />
      </main>
    </div>
  );
}
