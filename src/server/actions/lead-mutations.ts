"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { updateLeadForOrganization } from "@/server/db/lead";
import {
  requireActiveOrganization,
} from "@/server/auth/organization";
import { requireSessionUser } from "@/server/auth/session";

/**
 * Lead mutation actions (T043).
 *
 * Security model:
 * - the acting user and their organization are resolved server-side
 * - mutations match on organizationId + leadId, so cross-organization
 *   writes are impossible (they update nothing)
 * - every accepted mutation writes an organization-scoped Activity entry
 */

export type MutationState = { error?: string };

const statusSchema = z.object({
  leadId: z.string().min(1),
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "NURTURING", "WON", "LOST"]),
});

export async function updateLeadStatus(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const parsed = statusSchema.safeParse({
    leadId: formData.get("leadId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: "Invalid status update." };
  }

  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  const existing = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, organizationId: organization.id },
    select: { status: true },
  });

  if (!existing) {
    // Not found or owned by another organization — identical response.
    return { error: "Lead not found." };
  }

  if (existing.status !== parsed.data.status) {
    const updated = await updateLeadForOrganization(
      organization.id,
      parsed.data.leadId,
      { status: parsed.data.status },
    );

    if (!updated) {
      return { error: "Lead not found." };
    }

    await prisma.activity.create({
      data: {
        organizationId: organization.id,
        leadId: parsed.data.leadId,
        actorUserId: user.id,
        type: "STATUS_CHANGED",
        message: `Status changed from ${existing.status} to ${parsed.data.status}`,
      },
    });
  }

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return {};
}

const noteSchema = z.object({
  leadId: z.string().min(1),
  content: z.string().trim().min(1).max(4000),
});

export async function addLeadNote(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const parsed = noteSchema.safeParse({
    leadId: formData.get("leadId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    return { error: "Note cannot be empty." };
  }

  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, organizationId: organization.id },
    select: { id: true },
  });

  if (!lead) {
    return { error: "Lead not found." };
  }

  await prisma.leadNote.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      authorUserId: user.id,
      content: parsed.data.content,
    },
  });

  await prisma.activity.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      actorUserId: user.id,
      type: "NOTE_ADDED",
      message: "Note added",
    },
  });

  revalidatePath(`/leads/${lead.id}`);
  return {};
}

const assignSchema = z.object({
  leadId: z.string().min(1),
});

export async function toggleLeadAssignment(
  _prev: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const parsed = assignSchema.safeParse({
    leadId: formData.get("leadId"),
  });

  if (!parsed.success) {
    return { error: "Invalid assignment request." };
  }

  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  const lead = await prisma.lead.findFirst({
    where: { id: parsed.data.leadId, organizationId: organization.id },
    select: { assignedToUserId: true },
  });

  if (!lead) {
    return { error: "Lead not found." };
  }

  // MVP: self-assign / unassign toggle. Any member of the organization is
  // a valid assignee; the id used is the server-side session user id.
  const nextAssignee =
    lead.assignedToUserId === user.id ? null : user.id;

  const updated = await updateLeadForOrganization(
    organization.id,
    parsed.data.leadId,
    { assignedToUserId: nextAssignee },
  );

  if (!updated) {
    return { error: "Lead not found." };
  }

  await prisma.activity.create({
    data: {
      organizationId: organization.id,
      leadId: parsed.data.leadId,
      actorUserId: user.id,
      type: "ASSIGNEE_CHANGED",
      message: nextAssignee ? "Lead assigned to you" : "Lead unassigned",
    },
  });

  revalidatePath(`/leads/${parsed.data.leadId}`);
  return {};
}
