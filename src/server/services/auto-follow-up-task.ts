import { Prisma, type LeadPriority } from "@/generated/prisma/client";

import { prisma } from "@/server/db/prisma";

/**
 * Automatic follow-up task creation for high-value leads (TASKS.md T057).
 *
 * When a qualification succeeds with HIGH or URGENT priority, exactly one
 * follow-up task is created so the agent sees the lead in the /tasks workflow
 * immediately. LOW / MEDIUM leads never create an automatic task.
 *
 * Design notes:
 * - the rule runs only after a LeadQualification is persisted (the caller
 *   passes the server-trusted, Zod-validated qualification result)
 * - due dates use server time consistently; no client timezone is involved
 *   (DECISIONS.md D-029)
 * - idempotency reuses the existing Activity ledger: an
 *   `AUTO_FOLLOW_UP_CREATED` activity marks the lead as already handled
 * - marker check + task + marker write execute in a single SERIALIZABLE
 *   transaction, so PostgreSQL's serialization (SSI) aborts a concurrent
 *   duplicate instead of letting both insert; the aborted attempt is retried
 *   a very small, bounded number of times and then observes the marker
 * - system-created rows use `actorUserId = null`
 * - no schema migration is required
 */

/** Activity type that both records the automatic task and acts as its idempotency marker. */
export const AUTOMATIC_TASK_ACTIVITY_TYPE = "AUTO_FOLLOW_UP_CREATED";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Bounded retries when PostgreSQL aborts a transaction for serialization
 * (SSI). Small on purpose: a retry either wins or observes the marker that
 * the other committed transaction wrote.
 */
const MAX_SERIALIZABLE_RETRIES = 3;

function isSerializationFailure(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // P2034: write conflict or deadlock. PostgreSQL's serialization failure
    // (SQLSTATE 40001) surfaces here from the Prisma driver.
    return error.code === "P2034";
  }
  // Defensive: some drivers surface the raw PostgreSQL SQLSTATE.
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "40001"
  );
}

/**
 * Server-time due offsets per priority. HIGH is due within 24 hours; URGENT is
 * due much sooner. Exported so the rule is easy to audit.
 */
export const AUTOMATIC_TASK_DUE_HOURS: Partial<Record<LeadPriority, number>> = {
  HIGH: 24,
  URGENT: 2,
};

export type AutomaticTaskPlan = {
  title: string;
  description: string;
  dueDate: Date;
};

/**
 * Pure rule: decides whether a qualification result warrants an automatic
 * follow-up task and, if so, what it should look like. Returns null for
 * LOW / MEDIUM (and any unexpected priority).
 */
export function planAutomaticFollowUpTask({
  priority,
  leadName,
  recommendedAction,
  now = new Date(),
}: {
  priority: LeadPriority;
  leadName: string;
  recommendedAction?: string | null;
  now?: Date;
}): AutomaticTaskPlan | null {
  const dueHours = AUTOMATIC_TASK_DUE_HOURS[priority];
  if (dueHours === undefined) {
    return null;
  }

  const name = leadName.trim() || "this lead";
  const action = recommendedAction?.trim();

  const title =
    priority === "URGENT"
      ? `Urgent follow-up with ${name}`
      : `Follow up with ${name}`;

  const description =
    action && action.length > 0
      ? action
      : priority === "URGENT"
        ? "Urgent lead — follow up as soon as possible."
        : "High-priority lead — follow up within 24 hours.";

  return {
    title,
    description,
    dueDate: new Date(now.getTime() + dueHours * HOUR_MS),
  };
}

export type AutomaticTaskOutcome = { created: boolean; taskId?: string };

/**
 * Creates at most one automatic follow-up task for a HIGH / URGENT lead.
 *
 * The marker check and both writes run in one SERIALIZABLE transaction, so a
 * concurrent duplicate is aborted by PostgreSQL (SSI) and retried a bounded
 * number of times, and the marker and the task can never disagree. Returns
 * `{ created: false }` when the priority does not warrant a task, the lead is
 * not in the organization, or an automatic task already exists for the lead.
 */
export async function createAutomaticFollowUpTaskIfNeeded({
  organizationId,
  leadId,
  priority,
  recommendedAction,
  now = new Date(),
}: {
  organizationId: string;
  leadId: string;
  priority: LeadPriority;
  recommendedAction?: string | null;
  now?: Date;
}): Promise<AutomaticTaskOutcome> {
  if (priority !== "HIGH" && priority !== "URGENT") {
    return { created: false };
  }

  // Tenant-safe load: a lead from another organization behaves like a missing
  // one, so cross-tenant task creation is impossible.
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { name: true },
  });
  if (!lead) {
    return { created: false };
  }

  const plan = planAutomaticFollowUpTask({
    priority,
    leadName: lead.name,
    recommendedAction,
    now,
  });
  if (!plan) {
    return { created: false };
  }

  // The marker read and both writes share one SERIALIZABLE transaction. Two
  // concurrent runs cannot both observe "no marker": PostgreSQL's SSI aborts
  // one of them, and the bounded retry below then observes the committed
  // marker and returns without creating a duplicate.
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx): Promise<AutomaticTaskOutcome> => {
          const existing = await tx.activity.findFirst({
            where: {
              organizationId,
              leadId,
              type: AUTOMATIC_TASK_ACTIVITY_TYPE,
            },
            select: { id: true },
          });
          if (existing) {
            return { created: false };
          }

          const created = await tx.followUpTask.create({
            data: {
              organizationId,
              leadId,
              title: plan.title,
              description: plan.description,
              dueDate: plan.dueDate,
            },
            select: { id: true },
          });

          await tx.activity.create({
            data: {
              organizationId,
              leadId,
              actorUserId: null,
              type: AUTOMATIC_TASK_ACTIVITY_TYPE,
              message: `Automatic follow-up task created for ${priority}-priority lead`,
              metadata: { automatic: true, taskId: created.id, priority },
            },
          });

          return { created: true, taskId: created.id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        isSerializationFailure(error) &&
        attempt < MAX_SERIALIZABLE_RETRIES
      ) {
        continue;
      }
      throw error;
    }
  }
}
