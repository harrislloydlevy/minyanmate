import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "My minyans",
};

export const dynamic = "force-dynamic";

export default async function MyPage() {
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
          <SignOutButton />
        </div>
      </header>

      <main className="container flex-1 space-y-6 py-10">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Welcome{session.user.name ? `, ${session.user.name}` : ""}</CardTitle>
            <CardDescription>
              Signed in as {session.user.phoneNumber ?? session.user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button asChild className="w-full">
              <Link href="/events/new">
                <CalendarPlus className="size-4" />
                New event
              </Link>
            </Button>
            <p className="text-muted-foreground text-xs">
              Minyan discovery, recurring schedules, and WhatsApp notifications
              are coming in the next milestones.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
