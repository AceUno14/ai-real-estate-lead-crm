import { redirect } from "next/navigation";

import { getDefaultPublicLeadOrgSlug } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Legacy global public lead URL.
 *
 * Public lead capture is workspace-specific (`/lead/[organizationSlug]`).
 * This route preserves old links and existing documentation by redirecting
 * to the configured default workspace, so it never silently drops a
 * submission or guesses an organization (D-027).
 */
export default function PublicLeadPage() {
  redirect(`/lead/${getDefaultPublicLeadOrgSlug()}`);
}
