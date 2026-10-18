import Link from "next/link";
import { ChefHat, Bowl, Pot } from "@/components/FoodArt";

export function LandingHero() {
  return (
    <div className="space-y-6">
      {/* Hero */}
      <section
        className="card p-6 sm:p-8 text-center"
        style={{
          borderWidth: 2,
          borderColor: "color-mix(in srgb, var(--crust) 30%, var(--border))",
          boxShadow:
            "0 2px 0 color-mix(in srgb, var(--crust) 40%, transparent), 0 10px 30px -8px color-mix(in srgb, var(--crust) 25%, transparent)",
        }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[color:var(--husky-purple)]/10 text-[color:var(--husky-purple)] text-xs font-semibold uppercase tracking-wider mb-3">
          <ChefHat size={14} /> UW dorms
        </div>
        <h1 className="display text-3xl sm:text-4xl font-bold leading-tight">
          Potlucks, pizza nights, and dorm life, together.
        </h1>
        <p className="mt-3 text-base text-[color:var(--muted)] max-w-xl mx-auto">
          The social event planner for UW dorms. Plan, join, and delegate the dishes so you can escape the dining hall together. Built for huskies, by huskies.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-base font-bold px-6 py-3 rounded-full bg-[color:var(--crust)] text-white uppercase tracking-wide shadow-[0_4px_0_rgba(0,0,0,0.35)] hover:shadow-[0_5px_0_rgba(0,0,0,0.35)] hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.35)] transition-all"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center text-base font-semibold px-6 py-3 rounded-full border-2 border-[color:var(--husky-purple)] text-[color:var(--husky-purple)] hover:bg-[color:var(--husky-purple)] hover:text-white transition-colors"
          >
            Create an account
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-3">
        <h2 className="display text-lg font-semibold text-center">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Step
            Icon={ChefHat}
            iconColor="var(--husky-purple)"
            title="Hosts post events"
            body="Pizza nights, study breaks, cookouts, whatever your floor wants to do."
          />
          <Step
            Icon={Bowl}
            iconColor="var(--tomato)"
            title="Floormates RSVP"
            body="Yes, maybe, or can't make it. Capacity caps keep lounges happy."
          />
          <Step
            Icon={Pot}
            iconColor="var(--herb)"
            title="Share the bring-list"
            body="Everyone adds what they'll bring. No doubles. No surprises."
          />
        </div>
      </section>

      {/* Features strip */}
      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <Feature label="Dorm &amp; floor scoped" />
          <Feature label="Dietary tags built in" />
          <Feature label="Live calendar view" />
          <Feature label="Profiles &amp; friends" />
          <Feature label="Host moderation" />
        </div>
      </section>
    </div>
  );
}

function Step({
  Icon,
  iconColor,
  title,
  body,
}: {
  Icon: (p: { size?: number; style?: React.CSSProperties }) => React.ReactNode;
  iconColor: string;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-4 space-y-2">
      <div
        className="inline-flex items-center justify-center w-10 h-10 rounded-xl"
        style={{
          background: `color-mix(in srgb, ${iconColor} 15%, transparent)`,
          color: iconColor,
        }}
      >
        <Icon size={22} />
      </div>
      <h3 className="font-semibold display">{title}</h3>
      <p className="text-sm text-[color:var(--muted)] leading-snug">{body}</p>
    </div>
  );
}

function Feature({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1.5 rounded-full bg-[color:var(--cream)] border border-[color:var(--border)] font-medium"
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}
