import type { Organization } from "@/generated/prisma/client";

import { prisma } from "@/server/db/prisma";

/**
 * Safe organization lookup helpers (T022).
 *
 * The slug resolution is used by the public lead capture flow: the slug
 * comes from server-side configuration, never from client-supplied
 * organization IDs.
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
