import {
  BellRing,
  CalendarCheck,
  MessageCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: CalendarCheck,
    title: "Weekly schedules, handled",
    description:
      "Set the days and time once. Events are created for you, every week.",
  },
  {
    icon: Users,
    title: "RSVPs that stay in sync",
    description:
      "Count people in from the web or add regulars by hand. Everyone sees the live headcount.",
  },
  {
    icon: MessageCircle,
    title: "RSVP from WhatsApp",
    description:
      "Get a nudge before each minyan and tap a button to count yourself in.",
  },
  {
    icon: BellRing,
    title: "Quorum alerts",
    description:
      "The moment the tenth person joins, everyone knows: the minyan is on.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="container flex h-16 items-center justify-between">
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

      <main className="flex-1">
        <section className="container flex flex-col items-center gap-6 py-24 text-center">
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
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/login">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/my">My minyans</Link>
            </Button>
          </div>
        </section>

        <section className="container grid gap-4 pb-24 sm:grid-cols-2">
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
      </main>

      <footer className="border-t py-6">
        <div className="container text-muted-foreground text-sm">
          Built for the community, by the community.
        </div>
      </footer>
    </div>
  );
}
