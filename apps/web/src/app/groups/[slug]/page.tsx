import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { MapPin, StickyNote, UsersRound } from "lucide-react";
import { groups, users } from "@minyanmate/db/schema";
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
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Group details",
};

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAuthenticated = !!session;

  const { slug } = await params;

  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      slug: groups.slug,
      typeTag: groups.typeTag,
      defaultLocation: groups.defaultLocation,
      description: groups.description,
      ownerId: groups.ownerId,
    })
    .from(groups)
    .where(eq(groups.slug, slug))
    .limit(1);

  if (!group) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="container flex h-16 items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            Minyan<span className="text-primary">Mate</span>
          </Link>
          <ThemeToggle />
        </header>
        <main className="container flex flex-1 items-start justify-center py-10">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Group not found</CardTitle>
              <CardDescription>
                This group may have been deleted or never existed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/my">Back to my minyans</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const [owner] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, group.ownerId))
    .limit(1);

  const typeLabel = group.typeTag === "pickup" ? "Pickup" : "Minyan";
  const isOwner = isAuthenticated && group.ownerId === session.user.id;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="container flex flex-1 items-start justify-center py-10">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <CardTitle className="text-xl">{group.name}</CardTitle>
                <CardDescription>{typeLabel} group</CardDescription>
              </div>
              {isOwner && (
                <span className="text-muted-foreground text-xs">You own this group</span>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-3">
                <UsersRound className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                <div>
                  <dt className="text-muted-foreground text-xs">Organiser</dt>
                  <dd>{owner?.name || "Unknown"}</dd>
                </div>
              </div>

              {group.defaultLocation && (
                <div className="flex items-start gap-3">
                  <MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Default location</dt>
                    <dd>{group.defaultLocation}</dd>
                  </div>
                </div>
              )}

              {group.description && (
                <div className="flex items-start gap-3">
                  <StickyNote className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div>
                    <dt className="text-muted-foreground text-xs">Description</dt>
                    <dd>{group.description}</dd>
                  </div>
                </div>
              )}
            </dl>

            <Button asChild variant="outline" className="w-full">
              <Link href="/my">Back to my minyans</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
