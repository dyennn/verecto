import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Sparkles, MessageCircle } from "lucide-react";

const steps = [
  {
    icon: BookOpen,
    title: "Log your reads",
    description:
      "Search any book, track your progress, and tag your mood when you finish.",
  },
  {
    icon: Sparkles,
    title: "Get AI insights",
    description:
      "Generate rich discussion guides with themes, character analysis, and reflection questions.",
  },
  {
    icon: MessageCircle,
    title: "Go deeper",
    description:
      "Discover connections between your reads and build a personal taste profile over time.",
  },
];

const features = [
  "Spoiler-safe discussion guides tailored to your progress",
  "Mood tracking: loved it, it was fine, or DNF",
  "Reading streaks and personal stats",
  "Connections to your past reads powered by AI",
  "Works with any book via Open Library",
  "Free to use with no account limits",
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-[family-name:var(--font-serif)] text-2xl font-bold tracking-tight">
          Verecto
        </span>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pt-24 pb-20 text-center">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-[var(--muted-foreground)]">
          AI-Powered Reading Companion
        </p>
        <h1 className="font-[family-name:var(--font-serif)] text-5xl font-bold leading-tight tracking-tight sm:text-7xl">
          Both sides of
          <br />
          <span className="text-[var(--primary)]">every story.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-[var(--muted-foreground)]">
          Log your reads, track your moods, and unlock AI-generated discussion
          guides that help you go deeper into every book — no book club required.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/signup">
            <Button size="lg" className="text-base">
              Start reading smarter
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="text-base">
              Sign in
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        <h2 className="mb-12 text-center font-[family-name:var(--font-serif)] text-3xl font-semibold sm:text-4xl">
          How it works
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="group rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 transition-colors hover:border-[var(--primary)]/40"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-[family-name:var(--font-serif)] text-xl font-semibold">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        <h2 className="mb-12 text-center font-[family-name:var(--font-serif)] text-3xl font-semibold sm:text-4xl">
          Everything you need
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg p-4"
            >
              <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--primary)]" />
              <p className="text-[var(--muted-foreground)]">{feature}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-2xl px-6 py-20 text-center">
        <h2 className="font-[family-name:var(--font-serif)] text-3xl font-semibold sm:text-4xl">
          Ready to read differently?
        </h2>
        <p className="mt-4 text-[var(--muted-foreground)]">
          Join Verecto and turn every book into a conversation.
        </p>
        <Link href="/signup">
          <Button size="lg" className="mt-8 text-base">
            Create your free account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
        <p>Verecto — Both sides of every story.</p>
      </footer>
    </div>
  );
}
