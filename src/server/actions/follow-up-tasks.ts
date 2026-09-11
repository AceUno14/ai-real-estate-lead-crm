"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/server/db/prisma";
import { requireActiveOrganization } from "@/server/auth/organization";
import { requireSessionUser } from "@/server/auth/session";

/**
 * Follow-up task actions (T044).
 *
 * Security model: the user and organization are resolved server-side;
 * tasks are only ever read/mutated through organizationId-scoped queries.
 */

export type TaskMutationState = { error?: string };

const createSchema = z.object({
  leadId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
  dueDate: z.coerce.date().refine((date) => !Number.isNaN(date.getTime()), {
    message: "Invalid due date.",
  }),
});

export async function createFollowUpTask(
  _prev: TaskMutationState,
  formData: FormData,
): Promise<TaskMutationState> {
  const parsed = createSchema.safeParse({
    leadId: formData.get("leadId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueDate: formData.get("dueDate"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      error: first
        ? `${first.path.join(".")}: ${first.message}`
        : "Invalid task.",
    };
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

  await prisma.followUpTask.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      dueDate: parsed.data.dueDate,
    },
  });

  await prisma.activity.create({
    data: {
      organizationId: organization.id,
      leadId: lead.id,
      actorUserId: user.id,
      type: "FOLLOW_UP_CREATED",
      message: `Follow-up created: ${parsed.data.title}`,
    },
  });

  revalidatePath(`/leads/${lead.id}`);
  revalidatePath("/tasks");
  return {};
}

const toggleSchema = z.object({
  taskId: z.string().min(1),
});

export async function toggleFollowUpTask(
  _prev: TaskMutationState,
  formData: FormData,
): Promise<TaskMutationState> {
  const parsed = toggleSchema.safeParse({
    taskId: formData.get("taskId"),
  });

  if (!parsed.success) {
    return { error: "Invalid request." };
  }

  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  const task = await prisma.followUpTask.findFirst({
    where: { id: parsed.data.taskId, organizationId: organization.id },
    select: { id: true, leadId: true, title: true, completedAt: true },
  });

  if (!task) {
    return { error: "Task not found." };
  }

  const completing = task.completedAt === null;

  await prisma.followUpTask.update({
    where: { id: task.id },
    data: { completedAt: completing ? new Date() : null },
  });

  await prisma.activity.create({
    data: {
      organizationId: organization.id,
      leadId: task.leadId,
      actorUserId: user.id,
      type: completing ? "FOLLOW_UP_COMPLETED" : "FOLLOW_UP_REOPENED",
      message: completing
        ? `Follow-up completed: ${task.title}`
        : `Follow-up reopened: ${task.title}`,
    },
  });

  revalidatePath(`/leads/${task.leadId}`);
  revalidatePath("/tasks");
  return {};
}
