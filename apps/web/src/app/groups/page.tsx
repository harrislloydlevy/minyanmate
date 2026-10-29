import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Settings, UsersRound } from "lucide-react";
import { LeaveGroup } from "@/components/leave-group";
import { SiteLogo } from "@/components/site-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/app/my/sign-out-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getGroupDirectory, type GroupDirectoryRole } from "@/lib/group-directory";

export const metadata: Metadata = {
  title: "My groups",
};

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<GroupDirectoryRole, string> = {
  owner: "Owner",
  organiser: "Organiser",
  member: "Member",
};

const ROLE_CLASS: Record<GroupDirectoryRole, string> = {
  owner: "bg-primary/10 text-primary",
  organiser: "bg-primary/10 text-primary",
  member: "text-muted-foreground",
};

function groupColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

function groupInitial(name: string): string {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

export default async function GroupsDashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const entries = await getGroupDirectory(db, session.user.id);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between">
        <SiteLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      <main className="flex-1 space-y-8 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My groups</h1>
            <p className="text-muted-foreground text-sm">Every group you own or belong to.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/my">
                <UsersRound className="size-4" />
                My minyans
              </Link>
            </Button>
            <Button asChild>
              <Link href="/groups/new">
                <UsersRound className="size-4" />
                New group
              </Link>
            </Button>
          </div>
        </div>

        {entries.length === 0 && (
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>No groups yet</CardTitle>
              <CardDescription>
                Create a group or join one with an invite link to see it here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild>
                <Link href="/groups/new">
                  <UsersRound className="size-4" />
                  New group
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/my">My minyans</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {entries.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map(({ group, role, memberCount, canManage }) => (
              <Card key={group.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/groups/${group.slug}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: groupColor(group.name) }}
                        aria-hidden="true"
                      >
                        {groupInitial(group.name)}
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{group.name}</CardTitle>
                        {group.defaultLocation && (
                          <CardDescription className="truncate text-xs">
                            {group.defaultLocation}
                          </CardDescription>
                        )}
                      </div>
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${ROLE_CLASS[role]}`}>
                      {ROLE_LABEL[role]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="text-muted-foreground flex items-center gap-2 text-sm">
                    <UsersRound className="size-4" />
                    {memberCount} {memberCount === 1 ? "member" : "members"}
                  </p>
                  <div className="mt-auto flex flex-col gap-2 pt-1">
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/groups/${group.slug}`}>
                        {canManage && <Settings className="size-4" />}
                        {canManage ? "Manage group" : "View group"}
                      </Link>
                    </Button>
                    {role !== "owner" && (
                      <LeaveGroup slug={group.slug} name={group.name} redirectTo="/groups" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
