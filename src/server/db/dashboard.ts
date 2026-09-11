import type { LeadPriority } from "@/generated/prisma/client";

import { prisma } from "@/server/db/prisma";

/**
 * Dashboard metrics (T060/T061). Every query is organization-scoped.
 *
 * AI values never influence visibility: ranking only reorders leads the
 * organization already owns; authorization comes from the server-side
 * organization context.
 */

export type DashboardMetrics = {
  totalLeads: number;
  newLeads: number;
  highPriorityLeads: number;
  urgentLeads: number;
  averageScore: number | null;
  followUpsDue: number;
  leadsByStatus: Record<string, number>;
};

/** Latest qualification per lead (demo-scale safe, capped read). */
async function getLatestQualifications(organizationId: string) {
  const qualifications = await prisma.leadQualification.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    select: { leadId: true, score: true, priority: true },
    take: 1000,
  });

  const latest = new Map<string, { score: number; priority: LeadPriority }>();
  for (const qualification of qualifications) {
    if (!latest.has(qualification.leadId)) {
      latest.set(qualification.leadId, {
        score: qualification.score,
        priority: qualification.priority,
      });
    }
  }
  return latest;
}

export async function getDashboardMetrics(
  organizationId: string,
): Promise<DashboardMetrics> {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const [totalLeads, statusGroups, followUpsDue, latestQualifications] =
    await Promise.all([
      prisma.lead.count({ where: { organizationId } }),
      prisma.lead.groupBy({
        by: ["status"],
        where: { organizationId },
        _count: { _all: true },
      }),
      prisma.followUpTask.count({
        where: {
          organizationId,
          completedAt: null,
          dueDate: { lte: endOfToday },
        },
      }),
      getLatestQualifications(organizationId),
    ]);

  const leadsByStatus: Record<string, number> = {};
  for (const group of statusGroups) {
    leadsByStatus[group.status] = group._count._all;
  }

  const scores = [...latestQualifications.values()].map((q) => q.score);
  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null;

  const highPriorityLeads = [...latestQualifications.values()].filter(
    (q) => q.priority === "HIGH",
  ).length;
  const urgentLeads = [...latestQualifications.values()].filter(
    (q) => q.priority === "URGENT",
  ).length;

  return {
    totalLeads,
    newLeads: leadsByStatus.NEW ?? 0,
    highPriorityLeads,
    urgentLeads,
    averageScore,
    followUpsDue,
    leadsByStatus,
  };
}

export type ContactFirstLead = {
  leadId: string;
  name: string;
  score: number;
  priority: LeadPriority;
  timeline: string | null;
  summary: string;
  recommendedAction: string;
};

/** Top leads to contact first: latest qualification score, best first. */
export async function getTopLeadsToContact(
  organizationId: string,
  take = 5,
): Promise<ContactFirstLead[]> {
  const latest = await getLatestQualifications(organizationId);

  const ranked = [...latest.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, take);

  if (ranked.length === 0) {
    return [];
  }

  const leads = await prisma.lead.findMany({
    where: {
      organizationId,
      id: { in: ranked.map(([leadId]) => leadId) },
    },
    select: {
      id: true,
      name: true,
      timeline: true,
    },
  });

  // Fetch the full latest qualification rows for summary/recommendedAction.
  const qualifications = await prisma.leadQualification.findMany({
    where: {
      organizationId,
      leadId: { in: ranked.map(([leadId]) => leadId) },
    },
    orderBy: { createdAt: "desc" },
    select: {
      leadId: true,
      summary: true,
      recommendedAction: true,
    },
  });

  const summaryByLead = new Map<string, string>();
  const actionByLead = new Map<string, string>();
  for (const qualification of qualifications) {
    if (!summaryByLead.has(qualification.leadId)) {
      summaryByLead.set(qualification.leadId, qualification.summary);
      actionByLead.set(qualification.leadId, qualification.recommendedAction);
    }
  }

  return ranked
    .flatMap(([leadId, data]) => {
      const lead = leads.find((entry) => entry.id === leadId);
      if (!lead) return [];
      return [
        {
          leadId,
          name: lead.name,
          score: data.score,
          priority: data.priority,
          timeline: lead.timeline,
          summary: summaryByLead.get(leadId) ?? "",
          recommendedAction: actionByLead.get(leadId) ?? "",
        },
      ];
    })
    .sort((a, b) => b.score - a.score);
}

/** Recent org-scoped activity for the dashboard feed. */
export async function getRecentActivity(organizationId: string, take = 8) {
  return prisma.activity.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      message: true,
      createdAt: true,
      leadId: true,
      lead: { select: { name: true } },
    },
  });
}
