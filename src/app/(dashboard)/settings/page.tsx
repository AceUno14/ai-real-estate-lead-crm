import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/ui/page-header";
import { publicEnv } from "@/lib/env";
import { requireActiveOrganization } from "@/server/auth/organization";
import { requireSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * Workspace settings (T040 shell).
 *
 * Read-only overview: the workspace, the signed-in membership, and the
 * workspace's public inquiry URL are all resolved server-side. No
 * client-supplied organization id is trusted, and no editing actions are
 * exposed in the MVP.
 */
export default async function SettingsPage() {
  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  // Server-derived from the workspace slug; NEXT_PUBLIC_APP_URL is
  // public (browser-safe) configuration, not a secret — the same value
  // the hot-lead email uses for its lead detail link.
  const publicLeadUrl = `${publicEnv.NEXT_PUBLIC_APP_URL}/lead/${organization.slug}`;

  return (
    <div>
      <PageHeader
        title="Settings"
        description={`Workspace details for ${organization.name}.`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* WORKSPACE */}
        <section
          aria-labelledby="workspace-heading"
          className="rounded-lg border border-line bg-surface shadow-xs"
        >
          <div className="border-b border-line px-5 py-4">
            <h2
              id="workspace-heading"
              className="text-base font-semibold text-ink"
            >
              Workspace
            </h2>
          </div>
          <dl className="space-y-4 px-5 py-5 text-sm">
            <div>
              <dt className="text-xs text-muted">Name</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {organization.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Slug</dt>
              <dd className="mt-0.5 font-mono text-xs text-ink-secondary">
                {organization.slug}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Your role</dt>
              <dd className="mt-0.5">
                <span className="inline-flex items-center rounded-full border border-line bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-secondary">
                  {organization.role}
                </span>
              </dd>
            </div>
          </dl>
          <p className="border-t border-line px-5 py-4 text-xs leading-5 text-muted">
            All CRM data is scoped to this workspace. Workspace and membership
            editing are out of scope for the MVP.
          </p>
        </section>

        {/* ACCOUNT */}
        <section
          aria-labelledby="account-heading"
          className="rounded-lg border border-line bg-surface shadow-xs"
        >
          <div className="border-b border-line px-5 py-4">
            <h2
              id="account-heading"
              className="text-base font-semibold text-ink"
            >
              Account
            </h2>
          </div>
          <dl className="space-y-4 px-5 py-5 text-sm">
            <div>
              <dt className="text-xs text-muted">Name</dt>
              <dd className="mt-0.5 font-medium text-ink">
                {user.name || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Email</dt>
              <dd className="mt-0.5 font-medium text-ink">{user.email}</dd>
            </div>
          </dl>
          <p className="border-t border-line px-5 py-4 text-xs leading-5 text-muted">
            Sign in details are managed by your authentication provider.
          </p>
        </section>

        {/* PUBLIC LEAD CONTEXT */}
        <section
          aria-labelledby="public-lead-heading"
          className="rounded-lg border border-line bg-surface shadow-xs lg:col-span-2"
        >
          <div className="border-b border-line px-5 py-4">
            <h2
              id="public-lead-heading"
              className="text-base font-semibold text-ink"
            >
              Public inquiry page
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Share this link so property inquiries land directly in this
              workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <code className="min-w-0 break-all rounded-md border border-line bg-surface-muted px-2.5 py-1.5 font-mono text-xs text-ink-secondary">
              {publicLeadUrl}
            </code>
            <Link
              href={`/lead/${organization.slug}`}
              className="focus-light inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
            >
              Open page
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <p className="border-t border-line px-5 py-4 text-xs leading-5 text-muted">
            Each workspace has its own URL. Inquiries submitted there are
            scoped to this workspace only.
          </p>
        </section>
      </div>
    </div>
  );
}
