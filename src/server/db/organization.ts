import type { Organization } from "@/generated/prisma/client";

import { prisma } from "@/server/db/prisma";

/**
 * Safe organization lookup helpers (T022).
 *
 * The slug resolution is used by the workspace-specific public lead flow
 * (`/lead/[organizationSlug]`): the slug is a routing key resolved here to
 * a trusted organization ID, never a client-supplied organization ID.
 */

export async function getOrganizationBySlug(
  slug: string,
): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { slug } });
}

export async function getOrganizationById(
  id: string,
): Promise<Organization | null> {
  return prisma.organization.findUnique({ where: { id } });
}
