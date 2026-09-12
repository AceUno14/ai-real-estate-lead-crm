import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BellRing,
  Building2,
  ClipboardList,
  Gauge,
  Sparkles,
} from "lucide-react";

import { publicEnv } from "@/lib/env";
import { getSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "AI Real Estate Lead CRM",
  description:
    "Capture property inquiries, qualify them with AI, and always know which lead to contact first.",
};

const WORKFLOW_STEPS = [
  {
    icon: Building2,
    title: "Inquiry",
    description:
      "Visitors submit a workspace-specific property inquiry form.",
  },
  {
    icon: Sparkles,
    title: "AI qualification",
    description:
      "Each lead is scored, prioritized, and summarized automatically.",
  },
  {
    icon: Gauge,
    title: "Score + priority",
    description:
      "0–100 score with LOW to URGENT priority surfaces the best leads.",
  },
  {
    icon: ArrowRight,
    title: "Recommended next action",
    description:
      "The qualification suggests what to do with the lead next.",
  },
  {
    icon: ClipboardList,
    title: "Follow-up task",
    description:
      "High-value leads get an automatic follow-up task with a due date.",
  },
  {
    icon: BellRing,
    title: "Hot-lead email alert",
    description:
      "Responsible agents are emailed when an urgent opportunity arrives.",
  },
  {
    icon: Activity,
    title: "Human review",
    description:
      "A person reviews every AI draft before anything is ever sent.",
  },
] as const;

const FEATURES = [
  {
    title: "Workspace-specific lead capture",
    description:
      "Every workspace gets its own public inquiry URL; submissions land in the right place.",
  },
  {
    title: "AI qualification",
    description:
      "Score, priority, intent, and a draft reply for every lead — with human review.",
  },
  {
    title: "Contact-first lead ranking",
    description:
      "The dashboard ranks who to call first by AI score and priority.",
  },
  {
    title: "Follow-up tasks",
    description:
      "Create, complete, and reopen follow-ups tied to their leads.",
  },
  {
    title: "Email alerts",
    description:
      "High and urgent leads notify the responsible agent automatically.",
  },
  {
    title: "Notes and activity history",
    description:
      "Every status change, note, and automation is recorded per lead.",
  },
  {
    title: "Tenant-isolated workspaces",
    description:
      "Workspace data is isolated server-side, enforced on every query.",
  },
] as const;

/**
 * Marketing home page (UI Phase 4).
 *
 * Explains the product in under 10 seconds using only implemented features.
 * The primary CTA adapts to auth state server-side; the secondary CTA uses
 * the public (browser-safe) app URL — never a secret.
 */
export default async function HomePage() {
  const user = await getSessionUser();
  const dashboardHref = user ? "/dashboard" : "/sign-in";
  const dashboardLabel = user ? "Open dashboard" : "Sign in";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">
            {publicEnv.NEXT_PUBLIC_APP_NAME}
          </p>
          <nav className="flex shrink-0 items-center gap-3" aria-label="Main">
            <Link
              href="/lead"
              className="focus-light inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <span className="hidden sm:inline">Submit an inquiry</span>
              <span className="sm:hidden">Inquiry</span>
            </Link>
            <Link
              href={dashboardHref}
              className="focus-light inline-flex min-h-10 items-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-strong"
            >
              {dashboardLabel}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        aria-labelledby="hero-heading"
        className="border-b border-line bg-surface"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            AI-powered real estate lead operations
          </p>
          <h1
            id="hero-heading"
            className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
          >
            Know which lead to contact first.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">
            Capture inquiries, automatically qualify opportunities, prioritize
            high-intent leads, create follow-up tasks, and alert agents when a
            hot lead arrives.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={dashboardHref}
              className="focus-light inline-flex min-h-11 items-center gap-1.5 rounded-md bg-navy px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-strong"
            >
              {dashboardLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href="/lead"
              className="focus-light inline-flex min-h-11 items-center rounded-md border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
            >
              Submit a test inquiry
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted">
            Portfolio demo — sign up to create your own workspace, or submit an
            inquiry to see the capture flow.
          </p>
        </div>
      </section>

      {/* Workflow — the actual implemented chain */}
      <section
        aria-labelledby="workflow-heading"
        className="border-b border-line bg-background"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2
            id="workflow-heading"
            className="text-2xl font-semibold tracking-tight text-ink"
          >
            From inquiry to action
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            The pipeline is live in this application — each step below is
            implemented and running end to end.
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WORKFLOW_STEPS.map(
              ({ icon: Icon, title, description }, index) => (
                <li
                  key={title}
                  className="relative rounded-lg border border-line bg-surface p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      aria-hidden="true"
                      className="flex size-9 items-center justify-center rounded-md bg-navy-soft"
                    >
                      <Icon className="size-4.5 text-navy" />
                    </span>
                    <span
                      aria-hidden="true"
                      className="text-xs font-semibold tabular-nums text-faint"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="mt-3.5 text-sm font-semibold text-ink">
                    {title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    {description}
                  </p>
                </li>
              ),
            )}
          </ol>
        </div>
      </section>

      {/* Features — only what actually exists */}
      <section aria-labelledby="features-heading" className="bg-background">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <h2
            id="features-heading"
            className="text-2xl font-semibold tracking-tight text-ink"
          >
            Everything an agent needs, nothing they don&rsquo;t
          </h2>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, description }) => (
              <li
                key={title}
                className="rounded-lg border border-line bg-surface p-5 shadow-xs"
              >
                <p className="flex items-start gap-2.5 text-sm font-semibold text-ink">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3 text-success"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  {title}
                </p>
                <p className="mt-1.5 pl-8 text-sm leading-6 text-muted">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 sm:px-6">
          <p className="text-xs text-muted">
            {publicEnv.NEXT_PUBLIC_APP_NAME} — portfolio project. AI assists;
            a human always reviews before any reply is sent.
          </p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link
              href="/sign-up"
              className="focus-light text-navy underline-offset-2 hover:underline"
            >
              Create account
            </Link>
            <Link
              href="/sign-in"
              className="focus-light text-navy underline-offset-2 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
