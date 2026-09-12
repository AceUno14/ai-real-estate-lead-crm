import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShieldCheck, Target, UserCheck } from "lucide-react";

import { organizationSlugSchema } from "@/domain/organization";
import { getOrganizationBySlug } from "@/server/db/organization";
import { LeadForm } from "../lead-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Property inquiry",
  description:
    "Tell us what you are looking for and a local real-estate agent will get back to you.",
};

const TRUST_POINTS = [
  {
    icon: Target,
    title: "Personalized property matching",
    description:
      "Tell us your goals and we use them to focus on properties that fit.",
  },
  {
    icon: UserCheck,
    title: "Reviewed by an agent",
    description:
      "A real person reads your requirements before anything happens next.",
  },
  {
    icon: ShieldCheck,
    title: "Simple, secure inquiry process",
    description:
      "Share only what is needed — your details go directly to the team.",
  },
] as const;

/**
 * Workspace-specific public lead form (D-027).
 *
 * The slug in the route selects the organization. It is validated and then
 * resolved to a trusted organization ID server-side; unknown or malformed
 * slugs return a 404 and never reach the submit action.
 */
export default async function PublicLeadWorkspacePage({
  params,
}: {
  params: Promise<{ organizationSlug: string }>;
}) {
  const { organizationSlug } = await params;

  const parsed = organizationSlugSchema.safeParse(organizationSlug);
  if (!parsed.success) {
    notFound();
  }

  const organization = await getOrganizationBySlug(parsed.data);
  if (!organization) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* LEFT — brokerage context, headline, trust points (desktop only) */}
      <aside className="hidden flex-col justify-between bg-sidebar px-10 py-10 lg:flex xl:px-14">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 text-white"
              aria-hidden="true"
            >
              <path d="M3 10.5 12 4l9 6.5" />
              <path d="M5 9.5V20h14V9.5" />
              <path d="M10 20v-5h4v5" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-text-strong">
              {organization.name}
            </p>
            <p className="text-[11px] leading-4 text-sidebar-text">
              Real estate
            </p>
          </div>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight text-sidebar-text-strong xl:text-4xl">
            Tell us what you&rsquo;re looking for.
          </h1>
          <p className="mt-4 text-base leading-7 text-sidebar-text">
            Share your property goals and an agent will review your
            requirements.
          </p>

          <ul className="mt-10 space-y-6">
            {TRUST_POINTS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-white/10">
                  <Icon className="size-4.5 text-sidebar-text-strong" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-medium text-sidebar-text-strong">
                    {title}
                  </p>
                  <p className="mt-0.5 text-sm leading-6 text-sidebar-text">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-sidebar-text">
          Prefer to talk first? Any agent reviewing your inquiry can reach you
          at the contact details you share.
        </p>
      </aside>

      {/* RIGHT — the form column */}
      <main className="flex flex-1 flex-col px-4 py-10 sm:px-6 lg:py-14">
        <div className="mx-auto w-full max-w-xl">
          {/* Mobile-only compact brokerage identity */}
          <div className="mb-6 lg:hidden">
            <span className="inline-flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-secondary shadow-xs">
              <span
                className="flex size-5 items-center justify-center rounded bg-navy text-[10px] font-semibold text-white"
                aria-hidden="true"
              >
                {organization.name.slice(0, 1).toUpperCase()}
              </span>
              {organization.name}
            </span>
          </div>

          <header className="mb-8">
            {/* One h1 per breakpoint: the brand panel owns it on desktop. */}
            <h1 className="text-2xl font-semibold tracking-tight text-ink lg:hidden">
              Tell us what you&rsquo;re looking for.
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted lg:mt-0">
              It takes about two minutes. Fields marked{" "}
              <span className="font-medium text-ink-secondary">optional</span>{" "}
              help your agent prepare, but are not required.
            </p>
          </header>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-8">
            <LeadForm
              organizationSlug={organization.slug}
              organizationName={organization.name}
            />
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-muted">
            Your details are shared only with {organization.name} and are used
            to respond to this inquiry.
          </p>
        </div>
      </main>
    </div>
  );
}
