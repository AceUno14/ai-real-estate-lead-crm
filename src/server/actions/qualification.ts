"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { requireActiveOrganization } from "@/server/auth/organization";
import { requireSessionUser } from "@/server/auth/session";
import { qualifyLeadForOrganization } from "@/server/ai/qualify-lead";

/**
 * Qualification trigger + human review actions (T054/T055).
 *
 * AI never touches authorization: every action resolves the organization
 * server-side and scopes every query by organizationId.
 */

export type QualifyState = { error?: string; message?: string };

export async function runQualification(
  _prev: QualifyState,
  formData: FormData,
): Promise<QualifyState> {
  const leadId = z.string().min(1).safeParse(formData.get("leadId"));
  if (!leadId.success) {
    return { error: "Invalid request." };
  }

  // Authenticated manual wrapper: resolve the session + active workspace
  // server-side, then run the trusted, session-free core with the signed-in
  // user as the actor. Tenant isolation is unchanged.
  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  const outcome = await qualifyLeadForOrganization({
    organizationId: organization.id,
    leadId: leadId.data,
    actorUserId: user.id,
  });
  revalidatePath(`/leads/${leadId.data}`);

  return outcome.status === "succeeded"
    ? {}
    : { error: outcome.message };
}

const reviewStateSchema = z.object({
  qualificationId: z.string().min(1),
  leadId: z.string().min(1),
  reviewState: z.enum(["APPROVED", "REJECTED"]),
});

export async function setQualificationReviewState(
  _prev: QualifyState,
  formData: FormData,
): Promise<QualifyState> {
  const parsed = reviewStateSchema.safeParse({
    qualificationId: formData.get("qualificationId"),
    leadId: formData.get("leadId"),
    reviewState: formData.get("reviewState"),
  });

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  const qualification = await prisma.leadQualification.findFirst({
    where: {
      id: parsed.data.qualificationId,
      organizationId: organization.id,
    },
    select: { id: true, leadId: true, reviewState: true },
  });

  if (!qualification) {
    return { error: "Qualification not found." };
  }

  // Server-side state machine: APPROVED/REJECTED are terminal. The UI
  // hides these controls once locked; the server must enforce it too.
  if (qualification.reviewState === "APPROVED" || qualification.reviewState === "REJECTED") {
    return { error: "This draft has already been reviewed." };
  }

  await prisma.leadQualification.update({
    where: { id: qualification.id },
    data: { reviewState: parsed.data.reviewState },
  });

  // The Activity is attached to the qualification's own lead — a
  // server-trusted, organization-scoped value. Never use the leadId
  // supplied by the browser for a write.
  await prisma.activity.create({
    data: {
      organizationId: organization.id,
      leadId: qualification.leadId,
      actorUserId: user.id,
      type:
        parsed.data.reviewState === "APPROVED"
          ? "DRAFT_APPROVED"
          : "DRAFT_REJECTED",
      message:
        parsed.data.reviewState === "APPROVED"
          ? "AI draft approved"
          : "AI draft rejected",
    },
  });

  revalidatePath(`/leads/${qualification.leadId}`);
  return {};
}

const editDraftSchema = z.object({
  qualificationId: z.string().min(1),
  leadId: z.string().min(1),
  draftReply: z.string().trim().min(1).max(8000),
});

export async function editQualificationDraft(
  _prev: QualifyState,
  formData: FormData,
): Promise<QualifyState> {
  const parsed = editDraftSchema.safeParse({
    qualificationId: formData.get("qualificationId"),
    leadId: formData.get("leadId"),
    draftReply: formData.get("draftReply"),
  });

  if (!parsed.success) {
    return { error: "Draft cannot be empty." };
  }

  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  const qualification = await prisma.leadQualification.findFirst({
    where: {
      id: parsed.data.qualificationId,
      organizationId: organization.id,
    },
    select: { id: true, leadId: true, reviewState: true },
  });

  if (!qualification) {
    return { error: "Qualification not found." };
  }

  // Terminal review states cannot be edited back into a mutable state.
  if (qualification.reviewState === "APPROVED" || qualification.reviewState === "REJECTED") {
    return { error: "This draft has already been reviewed and can no longer be edited." };
  }

  await prisma.leadQualification.update({
    where: { id: qualification.id },
    data: {
      draftReply: parsed.data.draftReply,
      reviewState: "EDITED",
    },
  });

  await prisma.activity.create({
    data: {
      organizationId: organization.id,
      leadId: qualification.leadId,
      actorUserId: user.id,
      type: "DRAFT_EDITED",
      message: "AI draft edited",
    },
  });

  revalidatePath(`/leads/${qualification.leadId}`);
  return {};
}
