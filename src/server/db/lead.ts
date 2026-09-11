import { notFound } from "next/navigation";

import {
  Prisma,
  type Lead,
  type LeadQualification,
  type LeadStatus,
} from "@/generated/prisma/client";

import { prisma } from "@/server/db/prisma";

/** Lead with its most recent qualification (for list views). */
export type LeadWithLatestQualification = Lead & {
  qualifications: LeadQualification[];
};

/**
 * Tenant-scoped lead database helpers (T022).
 *
 * Every protected read and write goes through these helpers so that
 * organization scoping is enforced in one audited place (D-005):
 * - reads always filter by organizationId
 * - writes always match on organizationId before mutating
 * - callers never receive records owned by another organization
 */

export type LeadListFilters = {
  search?: string;
  status?: LeadStatus;
  source?: string;
  sort?: "newest" | "oldest" | "name-asc" | "name-desc";
  limit?: number;
  offset?: number;
};

function buildLeadWhere(
  organizationId: string,
  filters: LeadListFilters,
): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = { organizationId };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.source) {
    where.source = filters.source;
  }

  const search = filters.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { preferredLocation: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildLeadOrderBy(
  sort: LeadListFilters["sort"],
): Prisma.LeadOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "name-asc":
      return { name: "asc" };
    case "name-desc":
      return { name: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

/** Organization-scoped lead list with pagination-ready design. */
export async function listLeads(
  organizationId: string,
  filters: LeadListFilters = {},
): Promise<LeadWithLatestQualification[]> {
  const leads = await prisma.lead.findMany({
    where: buildLeadWhere(organizationId, filters),
    orderBy: buildLeadOrderBy(filters.sort),
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
    include: {
      qualifications: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    },
  });
  return leads;
}

/** Organization-scoped count for pagination. */
export async function countLeads(
  organizationId: string,
  filters: LeadListFilters = {},
): Promise<number> {
  return prisma.lead.count({
    where: buildLeadWhere(organizationId, filters),
  });
}

/**
 * Safe lead lookup: returns the lead only when it exists AND belongs to
 * the organization. Returns null for both missing and cross-organization
 * records — callers cannot distinguish the two cases.
 */
export async function getLeadForOrganization(
  organizationId: string,
  leadId: string,
): Promise<Lead | null> {
  return prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  });
}

/**
 * Safe lookup for pages: renders the app 404 when the lead does not exist
 * or is not owned by the organization.
 */
export async function requireLeadForOrganization(
  organizationId: string,
  leadId: string,
): Promise<Lead> {
  const lead = await getLeadForOrganization(organizationId, leadId);
  if (!lead) {
    notFound();
  }
  return lead;
}

/** Creates a lead inside the organization. The organization is resolved server-side by the caller. */
export async function createLeadForOrganization(
  organizationId: string,
  data: Omit<Prisma.LeadUncheckedCreateInput, "id" | "organizationId" | "createdAt" | "updatedAt">,
): Promise<Lead> {
  return prisma.lead.create({
    data: {
      ...data,
      organizationId,
    },
  });
}

/**
 * Organization-scoped lead update. Uses updateMany matched on both id and
 * organizationId, so a cross-organization update mutates nothing.
 * Returns null when no record was updated.
 */
export async function updateLeadForOrganization(
  organizationId: string,
  leadId: string,
  data: Omit<Prisma.LeadUncheckedUpdateInput, "id" | "organizationId" | "createdAt">,
): Promise<Lead | null> {
  const result = await prisma.lead.updateMany({
    where: { id: leadId, organizationId },
    data,
  });

  if (result.count === 0) {
    return null;
  }

  return prisma.lead.findUnique({ where: { id: leadId } });
}
