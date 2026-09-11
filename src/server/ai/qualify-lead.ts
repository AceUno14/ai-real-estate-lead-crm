import { toQualificationInput } from "@/domain/lead";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/server/db/prisma";
import { getLeadForOrganization } from "@/server/db/lead";
import {
  getQualificationProvider,
  AiProviderError,
} from "@/server/ai/provider-factory";
import { createAutomaticFollowUpTaskIfNeeded } from "@/server/services/auto-follow-up-task";
import { notifyHotLeadIfNeeded } from "@/server/services/hot-lead-notification";

/**
 * Lead qualification workflow (TASKS.md T054 / T056).
 *
 * This module is session-free: it never reads cookies or the session, so it
 * can be called from the authenticated manual flow and the automatic
 * public-lead flow alike. Session resolution lives in the callers
 * (`src/server/actions/qualification.ts` for the manual button).
 *
 * - `qualifyLeadForOrganization` — the trusted core service. It takes an
 *   already-resolved, server-trusted `organizationId` and a nullable
 *   `actorUserId` and performs the whole workflow.
 * - `runAutomaticQualification` — the public-flow entry point. It skips when
 *   a qualification already exists (so a submission never produces duplicate
 *   successful qualifications) and records the run with a null actor.
 *
 * Flow (core): load lead scoped by organizationId → build qualification input
 * from approved fields → call the configured provider → Zod-validated result
 * → persist LeadQualification with provider/model metadata → Activity entry
 * → for HIGH/URGENT results, create one automatic follow-up task (T057) and
 *   send one best-effort agent email notification (T058); a failure of either
 *   automation never invalidates the qualification.
 *
 * Failure handling (D-025): the lead is never modified or deleted by
 * qualification. Failures are recorded as an Activity entry and can be
 * retried manually.
 */

export type QualifyLeadOutcome =
  | { status: "succeeded" }
  | { status: "failed"; message: string };

export type AutomaticQualifyOutcome =
  | QualifyLeadOutcome
  | { status: "skipped" };

const GENERIC_FAILURE =
  "AI qualification failed. The lead is unaffected — you can retry.";

/**
 * Trusted core qualification service.
 *
 * `organizationId` MUST be resolved by trusted server code (an authenticated
 * workspace or a public workspace slug resolved server-side) — never by the
 * browser. `actorUserId` is null for automatic/system runs.
 */
export async function qualifyLeadForOrganization({
  organizationId,
  leadId,
  actorUserId,
}: {
  organizationId: string;
  leadId: string;
  actorUserId: string | null;
}): Promise<QualifyLeadOutcome> {
  // Tenant-safe load: a lead from another organization is indistinguishable
  // from a missing one.
  const lead = await getLeadForOrganization(organizationId, leadId);
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

  try {
    const env = getServerEnv();
    const provider = getQualificationProvider();
    const result = await provider.qualify(input);

    const qualification = await prisma.leadQualification.create({
      data: {
        organizationId,
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
      select: { id: true },
    });

    await prisma.activity.create({
      data: {
        organizationId,
        leadId: lead.id,
        actorUserId,
        type: "QUALIFICATION_GENERATED",
        message: `AI qualification completed — score ${result.score}, priority ${result.priority}`,
      },
    });

    // High-value leads get one automatic follow-up task (T057). This is
    // best-effort: the qualification is already safely persisted, so a task
    // failure must never turn a successful qualification into a failure. The
    // rule uses only the server-trusted result, never client input.
    // Preferred order: qualification → activity → follow-up task → email.
    // Each automation is independently best-effort, so a failure of one never
    // affects the qualification or the other.
    if (result.priority === "HIGH" || result.priority === "URGENT") {
      try {
        await createAutomaticFollowUpTaskIfNeeded({
          organizationId,
          leadId: lead.id,
          priority: result.priority,
          recommendedAction: result.recommendedAction,
        });
      } catch {
        // Swallow: the qualification, lead, and existing activities are
        // intact and manual task creation remains available.
      }

      try {
        await notifyHotLeadIfNeeded({
          organizationId,
          leadId: lead.id,
          qualificationId: qualification.id,
        });
      } catch {
        // Swallow: email delivery is best-effort and never affects the lead,
        // the qualification, or the automatic follow-up task.
      }
    }

    return { status: "succeeded" };
  } catch (error) {
    // Normalized provider errors carry safe messages; anything else is
    // collapsed to a generic message so internals never leak.
    const message =
      error instanceof AiProviderError ? error.message : GENERIC_FAILURE;

    try {
      await prisma.activity.create({
        data: {
          organizationId,
          leadId: lead.id,
          actorUserId,
          type: "QUALIFICATION_FAILED",
          message: `AI qualification failed: ${message}`,
        },
      });
    } catch {
      // Recording the failure is best-effort; the lead is still intact.
    }

    return { status: "failed", message };
  }
}

/**
 * Automatic qualification for a freshly persisted public lead.
 *
 * Idempotent by design: if any qualification already exists for the lead it
 * returns `skipped` and does nothing, so repeated/racing triggers cannot
 * produce duplicate successful qualifications. This runs after the visitor's
 * success response and never throws.
 */
export async function runAutomaticQualification({
  organizationId,
  leadId,
}: {
  organizationId: string;
  leadId: string;
}): Promise<AutomaticQualifyOutcome> {
  try {
    const existing = await prisma.leadQualification.findFirst({
      where: { organizationId, leadId },
      select: { id: true },
    });
    if (existing) {
      return { status: "skipped" };
    }

    return await qualifyLeadForOrganization({
      organizationId,
      leadId,
      actorUserId: null,
    });
  } catch {
    // The public submission has already succeeded; never surface internals.
    return { status: "failed", message: GENERIC_FAILURE };
  }
}
