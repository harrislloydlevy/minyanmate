import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
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

      <main className="container flex-1 py-10">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Welcome{session.user.name ? `, ${session.user.name}` : ""}</CardTitle>
            <CardDescription>
              Signed in as {session.user.phoneNumber ?? session.user.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Minyan discovery, scheduling, and WhatsApp notifications are coming
            in the next milestones.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
