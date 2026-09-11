import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { organizationSlugSchema } from "@/domain/organization";
import { getOrganizationBySlug } from "@/server/db/organization";
import { LeadForm } from "../lead-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Property inquiry",
  description:
    "Tell us what you are looking for and a local real-estate agent will get back to you.",
};

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
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Property inquiry</h1>
      <p className="mt-2 text-slate-500">
        Looking to buy, sell, or rent? Send us the details and we will match
        you with the right agent.
      </p>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <LeadForm organizationSlug={organization.slug} />
      </div>
    </main>
  );
}
