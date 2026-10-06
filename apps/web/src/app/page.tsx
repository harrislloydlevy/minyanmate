import {
  BellRing,
  CalendarCheck,
  Heart,
  MessageCircle,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import { sql } from "drizzle-orm";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";

const features = [
  {
    icon: CalendarCheck,
    title: "Weekly schedules, handled",
    description:
      "Set the days and time once. Events are created for you, every week — Shabbat, Yom Tov, and daily minyans.",
  },
  {
    icon: Users,
    title: "RSVPs that stay in sync",
    description:
      "Count people in from the web or add regulars by hand. Everyone sees the live headcount toward a minyan.",
  },
  {
    icon: MessageCircle,
    title: "RSVP from WhatsApp",
    description:
      "Get a nudge before each minyan and tap a button to count yourself in — no app download needed.",
  },
  {
    icon: BellRing,
    title: "Quorum alerts",
    description:
      "The moment the tenth person joins, everyone knows: the minyan is on. No more waiting and wondering.",
  },
];

const aims = [
  {
    icon: Heart,
    title: "Strengthen community bonds",
    description:
      "Make it easy for every member to stay connected and show up for one another in times of need — whether a minyan for a yahrzeit, a simcha, or a weekday mincha.",
  },
  {
    icon: Users,
    title: "Lighten the load for organisers",
    description:
      "Gabbaim and organisers spend enough time coordinating. MinyanMate handles the reminders, headcounts, and follow-ups so they can focus on the keviah.",
  },
  {
    icon: Star,
    title: "Encourage more minyanim",
    description:
      "When it is easier to organise and attend, more minyanim happen. MinyanMate helps communities grow their davening opportunities — from daily mincha to Shabbat shacharit.",
  },
];

export const dynamic = "force-dynamic";

export default async function Home() {
  let userCount = 0;
  try {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(sql`users`);
    userCount = result?.count ?? 0;
  } catch {
    // DB not available — page still renders
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Minyan<span className="text-primary">Mate</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </header>

      <main className="relative flex-1">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/images/minyan-kotel.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/35 to-background/60" />
        <div className="relative z-10">
        <section className="flex flex-col items-center gap-6 px-4 py-24 text-center sm:px-6 lg:px-8">
          <div className="text-primary mb-2 text-sm font-medium tracking-wide uppercase">
            בעזרת השם
          </div>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
            Never miss a{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              minyan
            </span>{" "}
            again
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg text-balance">
            MinyanMate tracks who&apos;s coming to your recurring minyans,
            alerts everyone the second quorum is reached, and lets people RSVP
            right from WhatsApp.
          </p>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="inline-block size-2 rounded-full bg-green-500" />
            {userCount > 0
              ? `${userCount} registered user${userCount === 1 ? "" : "s"}`
              : "Stack is live — database connected"}
          </div>

          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/login">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/my">My minyans</Link>
            </Button>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Our aims
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              MinyanMate was built to serve the klal — making it easier for
              communities to come together, support one another, and ensure that
              no one ever has to miss a minyan.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {aims.map((aim) => (
              <Card key={aim.title}>
                <CardHeader>
                  <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                    <aim.icon className="size-5" />
                  </div>
                  <CardTitle>{aim.title}</CardTitle>
                  <CardDescription>{aim.description}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-4 px-4 pb-24 sm:grid-cols-2 sm:px-6 lg:px-8">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                  <feature.icon className="size-5" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          ))}
        </section>
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="flex flex-col items-center gap-2 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <div className="flex items-center justify-between w-full">
            <span>Built for the community, by the community.</span>
            <a
              href="https://github.com/harrislloydlevy/minyanmate"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>
          <span className="text-xs">
            Background: &quot;Minyan at the Kotel&quot; by Steven DuBois, CC BY-SA 2.0
          </span>
        </div>
      </footer>
    </div>
  );
}
