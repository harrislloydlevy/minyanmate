import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Inbox } from "lucide-react";
import {
  MESSAGE_CHANNELS,
  MESSAGE_DELIVERY_MODES,
  MESSAGE_KINDS,
  MESSAGE_STATUSES,
  isMessageChannel,
  isMessageDeliveryMode,
  isMessageKind,
  isMessageStatus,
} from "@minyanmate/core";
import { listOutboxMessages, type OutboxFilters } from "@minyanmate/db";
import { ManualDeliveryForm } from "@/components/manual-delivery-form";
import { SiteLogo } from "@/components/site-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { displayName } from "@/lib/display-name";
import { canViewMessageLog, isProduction } from "@/lib/message-log-access";

export const metadata: Metadata = {
  title: "Message log",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  status?: string;
  channel?: string;
  kind?: string;
  mode?: string;
  q?: string;
}>;

const STATUS_STYLES: Record<string, string> = {
  requested: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  queued: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  sent: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-destructive/10 text-destructive",
  skipped: "bg-muted text-muted-foreground",
};

const CHANNEL_STYLES: Record<string, string> = {
  whatsapp: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  sms: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  email: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  console: "bg-slate-500/10 text-slate-700 dark:text-slate-400",
};

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return value.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function prettyPayload(payload: string | null): string | null {
  if (!payload) return null;
  try {
    return JSON.stringify(JSON.parse(payload) as unknown, null, 2);
  } catch {
    return payload;
  }
}

function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export default async function MessageLogPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  if (!(await canViewMessageLog(session.user.id))) {
    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex h-16 items-center justify-between">
          <SiteLogo />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-start justify-center py-10">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Not available</CardTitle>
              <CardDescription>
                The message log is restricted to administrators in production.
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

  const params = await searchParams;
  const filters: OutboxFilters = {
    status: isMessageStatus(params.status) ? params.status : undefined,
    channel: isMessageChannel(params.channel) ? params.channel : undefined,
    kind: isMessageKind(params.kind) ? params.kind : undefined,
    deliveryMode: isMessageDeliveryMode(params.mode) ? params.mode : undefined,
    q: params.q?.trim() || undefined,
    limit: 100,
  };

  const rows = await listOutboxMessages(db, filters);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between">
        <SiteLogo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link href="/my">
              <ArrowLeft className="size-4" />
              My minyans
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 space-y-6 py-10">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Inbox className="size-6" />
            Message log
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Message requests and their delivery results. Requested and sent details are kept
            separately so you can see exactly what was asked for versus what happened.{" "}
            {isProduction() ? "Admin view." : "Development mode — sends go to the console."}
          </p>
        </div>

        <Card>
          <CardContent className="pt-0">
            <form method="get" className="flex flex-wrap items-end gap-3 py-1">
              <label className="flex flex-col gap-1 text-xs font-medium">
                Status
                <select
                  name="status"
                  defaultValue={filters.status ?? ""}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                  <option value="">Any</option>
                  {MESSAGE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium">
                Mode
                <select
                  name="mode"
                  defaultValue={filters.deliveryMode ?? ""}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                  <option value="">Any</option>
                  {MESSAGE_DELIVERY_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium">
                Channel
                <select
                  name="channel"
                  defaultValue={filters.channel ?? ""}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                  <option value="">Any</option>
                  {MESSAGE_CHANNELS.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-xs font-medium">
                Kind
                <select
                  name="kind"
                  defaultValue={filters.kind ?? ""}
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                  <option value="">Any</option>
                  {MESSAGE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-52 flex-1 flex-col gap-1 text-xs font-medium">
                Search
                <input
                  name="q"
                  defaultValue={filters.q ?? ""}
                  placeholder="Name, phone, body or event"
                  className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                />
              </label>

              <Button type="submit">Filter</Button>
              <Button asChild type="button" variant="outline">
                <Link href="/messages">Reset</Link>
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-muted-foreground text-sm">
          {rows.length === 0
            ? "No messages match these filters."
            : `Showing ${rows.length} message${rows.length === 1 ? "" : "s"} (newest first, max 100).`}
        </div>

        <div className="flex flex-col gap-3">
          {rows.map((row) => {
            const payload = prettyPayload(row.payload);
            const hasName = Boolean(row.recipientName || row.userName);
            const recipientLabel = hasName
              ? displayName(row.recipientName ?? row.userName)
              : "Unknown recipient";

            return (
              <Card key={row.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        {recipientLabel}
                        {row.recipient && (
                          <span className="text-muted-foreground ml-2 font-normal">
                            {row.recipient}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {row.subject ?? row.kind} · requested{" "}
                        {formatDate(row.requestedAt ?? row.createdAt)}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip className={STATUS_STYLES[row.status]}>{row.status}</Chip>
                      <Chip className={CHANNEL_STYLES[row.channel]}>{row.channel}</Chip>
                      <Chip className="bg-muted text-muted-foreground">{row.deliveryMode}</Chip>
                      <Chip className="bg-muted text-muted-foreground">{row.kind}</Chip>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0 text-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold tracking-wide uppercase">Requested</h3>
                      <div className="text-muted-foreground grid gap-1 text-xs">
                        <span>At: {formatDate(row.requestedAt ?? row.createdAt)}</span>
                        <span>Channel: {row.channel}</span>
                        <span>Recipient: {row.recipient ?? "—"}</span>
                        <span>Mode: {row.deliveryMode}</span>
                      </div>
                      {row.body ? (
                        <pre className="bg-muted/40 overflow-x-auto rounded-md border p-3 text-xs whitespace-pre-wrap">
                          {row.body}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground text-xs">No requested body.</p>
                      )}
                    </section>

                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold tracking-wide uppercase">Delivery</h3>
                      {row.status === "sent" ? (
                        <>
                          <div className="text-muted-foreground grid gap-1 text-xs">
                            <span>Sent: {formatDate(row.sentAt)}</span>
                            <span>Channel: {row.sentChannel ?? row.channel}</span>
                            <span>
                              Recipient: {row.sentRecipient ?? row.recipient ?? "—"}
                            </span>
                            <span>Technique: {row.technique ?? "—"}</span>
                            <span>Sent by: {row.sentBy ?? "—"}</span>
                            <span>Provider: {row.provider ?? "—"}</span>
                            <span>Provider id: {row.providerMessageId ?? "—"}</span>
                            <span>
                              Attempts: {row.attempts}/{row.maxAttempts}
                            </span>
                          </div>
                          {row.sentBody && row.sentBody !== row.body ? (
                            <pre className="bg-muted/40 overflow-x-auto rounded-md border p-3 text-xs whitespace-pre-wrap">
                              {row.sentBody}
                            </pre>
                          ) : row.sentBody ? (
                            <p className="text-muted-foreground text-xs">
                              Sent body matches the request.
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <div className="text-muted-foreground grid gap-1 text-xs">
                          <span>Not sent yet (status: {row.status}).</span>
                          <span>
                            Attempts: {row.attempts}/{row.maxAttempts}
                          </span>
                        </div>
                      )}
                      {row.error && <p className="text-destructive text-xs">{row.error}</p>}
                    </section>
                  </div>

                  {row.eventId && (
                    <div className="text-muted-foreground text-xs">
                      Event:{" "}
                      <Link
                        href={`/events/${row.eventId}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {row.eventTitle ?? "View event"}
                      </Link>
                    </div>
                  )}

                  {(row.status === "requested" || row.status === "failed") && (
                    <details className="rounded-md border p-3 text-xs">
                      <summary className="cursor-pointer font-medium">
                        Record a manual send
                      </summary>
                      <p className="text-muted-foreground mt-1 mb-3">
                        This fills in the delivery side without sending anything. Use it to try
                        different channels, bodies or techniques.
                      </p>
                      <ManualDeliveryForm
                        messageId={row.id}
                        defaultChannel={row.channel}
                        defaultRecipient={row.recipient}
                        defaultBody={row.body}
                      />
                    </details>
                  )}

                  {payload && (
                    <details className="text-xs">
                      <summary className="text-muted-foreground cursor-pointer">
                        Payload and audit ids
                      </summary>
                      <pre className="bg-muted/40 mt-2 overflow-x-auto rounded-md border p-3 whitespace-pre-wrap">
                        {payload}
                      </pre>
                      <p className="text-muted-foreground mt-1">
                        id: {row.id}
                        {row.batchId ? ` · batch: ${row.batchId}` : ""}
                        {row.dedupeKey ? ` · dedupe: ${row.dedupeKey}` : ""}
                      </p>
                    </details>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
