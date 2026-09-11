import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { requireActiveOrganization } from "@/server/auth/organization";
import { requireSessionUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Settings",
};

/**
 * Workspace settings (T040 shell).
 *
 * Read-only overview: the workspace and the signed-in membership are both
 * resolved server-side. No client-supplied organization id is trusted, and
 * no editing actions are exposed in the MVP.
 */
export default async function SettingsPage() {
  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  return (
    <div>
      <PageHeader
        title="Settings"
        description={`Workspace details for ${organization.name}.`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Workspace
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Name</dt>
              <dd className="mt-0.5">{organization.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Slug</dt>
              <dd className="mt-0.5 font-mono text-xs">{organization.slug}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Your role</dt>
              <dd className="mt-0.5">{organization.role}</dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            All CRM data is scoped to this workspace. Workspace and membership
            editing are out of scope for the MVP.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Signed-in member
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Name</dt>
              <dd className="mt-0.5">{user.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd className="mt-0.5">{user.email}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
