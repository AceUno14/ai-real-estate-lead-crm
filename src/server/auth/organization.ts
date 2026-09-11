import { redirect } from "next/navigation";

import type { MembershipRole } from "@/generated/prisma/client";

import { prisma } from "@/server/db/prisma";
import { requireSessionUser } from "@/server/auth/session";

/**
 * Organization resolution and tenant guard helpers (T013).
 *
 * Authorization rules (DECISIONS.md D-005, ARCHITECTURE.md):
 * - membership is always resolved server-side from the session user
 * - a user can only ever see organizations they have a membership for
 * - organization context for protected queries comes from here, never
 *   from client-provided IDs
 */

export type ActiveOrganization = {
  id: string;
  name: string;
  slug: string;
  role: MembershipRole;
};

/** All organizations the user is a member of (oldest first). */
export async function getOrganizationsForUser(
  userId: string,
): Promise<ActiveOrganization[]> {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      role: true,
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  return memberships.map((membership) => ({
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
  }));
}

/**
 * The user's active organization: their oldest membership.
 * Returns null when the user has no membership yet.
 */
export async function getActiveOrganization(
  userId: string,
): Promise<ActiveOrganization | null> {
  const [first] = await getOrganizationsForUser(userId);
  return first ?? null;
}

/**
 * Resolves an organization for the user only if they are a member.
 * Returns null for unknown organizations and for organizations the user
 * does not belong to — both cases are indistinguishable to the caller.
 */
export async function getOrganizationForUser(
  userId: string,
  organizationId: string,
): Promise<ActiveOrganization | null> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
    select: {
      role: true,
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!membership) {
    return null;
  }

  return {
    id: membership.organization.id,
    name: membership.organization.name,
    slug: membership.organization.slug,
    role: membership.role,
  };
}

/**
 * Tenant guard for protected pages: session + active organization,
 * or a redirect. Use in the dashboard layer so every nested page can
 * rely on organization context being available.
 */
export async function requireActiveOrganization(): Promise<ActiveOrganization> {
  const user = await requireSessionUser();
  const organization = await getActiveOrganization(user.id);

  if (!organization) {
    redirect("/no-organization");
  }

  return organization;
}
