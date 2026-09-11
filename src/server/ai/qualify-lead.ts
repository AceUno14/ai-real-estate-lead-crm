import { toQualificationInput } from "@/domain/lead";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/server/db/prisma";
import { getLeadForOrganization } from "@/server/db/lead";
import { requireActiveOrganization } from "@/server/auth/organization";
import { requireSessionUser } from "@/server/auth/session";
import {
  getQualificationProvider,
  AiProviderError,
} from "@/server/ai/provider-factory";

/**
 * Lead qualification workflow (TASKS.md T054).
 *
 * Flow: resolve session + organization server-side → load lead scoped by
 * organizationId → build qualification input from approved fields → call
 * the configured provider → Zod-validated result → persist
 * LeadQualification with provider/model metadata → Activity entry.
 *
 * Failure handling (D-025): the lead is never modified by qualification.
 * Failures are recorded as an Activity entry and can be retried.
 */

export type QualifyLeadOutcome =
  | { status: "succeeded" }
  | { status: "failed"; message: string };

export async function qualifyLead(leadId: string): Promise<QualifyLeadOutcome> {
  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  const lead = await getLeadForOrganization(organization.id, leadId);
  if (!lead) {
    return { status: "failed", message: "Lead not found." };
  }

  const input = toQualificationInput({
    name: lead.name,
    email: lead.email,
    phone: lead.phone ?? undefined,
    inquiryType: lead.inquiryType,
    propertyType: lead.propertyType,
    preferredLocation: lead.preferredLocation,
    budgetMin: lead.budgetMin,
    budgetMax: lead.budgetMax,
    timeline: lead.timeline,
    financingStatus: lead.financingStatus,
    message: lead.message,
    source: lead.source,
  });

  const env = getServerEnv();
  const provider = getQualificationProvider();

  try {
    const result = await provider.qualify(input);

    await prisma.leadQualification.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        provider: env.AI_PROVIDER,
        model: env.AI_MODEL,
        score: result.score,
        priority: result.priority,
        intent: result.intent,
        summary: result.summary,
        timeline: result.timeline,
        budgetReadiness: result.budgetReadiness,
        financingStatus: result.financingStatus,
        recommendedAction: result.recommendedAction,
        draftReply: result.draftReply,
        confidence: result.confidence,
        reviewState: "GENERATED",
      },
    });

    await prisma.activity.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        actorUserId: user.id,
        type: "QUALIFICATION_GENERATED",
        message: `AI qualification completed — score ${result.score}, priority ${result.priority}`,
      },
    });

    return { status: "succeeded" };
  } catch (error) {
    // Normalized provider errors carry safe messages; anything else is
    // collapsed to a generic message so internals never leak.
    const message =
      error instanceof AiProviderError
        ? error.message
        : "AI qualification failed. The lead is unaffected — you can retry.";

    await prisma.activity.create({
      data: {
        organizationId: organization.id,
        leadId: lead.id,
        actorUserId: user.id,
        type: "QUALIFICATION_FAILED",
        message: `AI qualification failed: ${message}`,
      },
    });

    return { status: "failed", message };
  }
}
