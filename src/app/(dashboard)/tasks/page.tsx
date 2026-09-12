import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, ListTodo } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { TaskToggle } from "@/components/leads/task-toggle";
import { requireActiveOrganization } from "@/server/auth/organization";
import { prisma } from "@/server/db/prisma";

export const metadata: Metadata = {
  title: "Tasks",
};

function formatDueDate(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const HOUR_MS = 60 * 60 * 1000;

/**
 * Follow-up task list (T044).
 *
 * Organization-scoped: every query filters by the server-resolved
 * organization id. Pending tasks lead the page — overdue first, then due
 * soon, then future — and completed tasks are shown more quietly below.
 * Pure presentation grouping; the query and task mutations are unchanged.
 */
export default async function TasksPage() {
  const organization = await requireActiveOrganization();

  const tasks = await prisma.followUpTask.findMany({
    where: { organizationId: organization.id },
    orderBy: { dueDate: "asc" },
    take: 100,
    include: { lead: { select: { id: true, name: true } } },
  });

  const now = new Date().getTime();
  const pending = tasks.filter((task) => task.completedAt === null);
  const completed = tasks.filter((task) => task.completedAt !== null);

  const overdueCount = pending.filter(
    (task) => task.dueDate.getTime() < now,
  ).length;
  const dueSoonCount = pending.filter(
    (task) =>
      task.dueDate.getTime() >= now &&
      task.dueDate.getTime() <= now + 24 * HOUR_MS,
  ).length;

  // Presentation-only grouping: overdue → due soon → future.
  const rankedPending = [...pending].sort((a, b) => {
    const rank = (due: Date) => {
      if (due.getTime() < now) return 0; // overdue
      if (due.getTime() <= now + 24 * HOUR_MS) return 1; // due soon
      return 2; // future
    };
    return rank(a.dueDate) - rank(b.dueDate);
  });

  return (
    <div>
      <PageHeader
        title="Follow-up tasks"
        description={`What to do next in ${organization.name}.`}
      />

      {/* Compact counts (only when there is data to count) */}
      {tasks.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-3" role="list">
          <div
            role="listitem"
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-2.5 shadow-xs ${
              overdueCount > 0
                ? "border-danger/30 bg-danger-soft"
                : "border-line bg-surface"
            }`}
          >
            <ListTodo
              className={`size-4 ${
                overdueCount > 0 ? "text-danger" : "text-muted"
              }`}
              aria-hidden="true"
            />
            <p className="text-sm text-ink-secondary">
              <span className="font-semibold tabular-nums text-ink">
                {pending.length}
              </span>{" "}
              pending
            </p>
          </div>
          {overdueCount > 0 ? (
            <div
              role="listitem"
              className="flex items-center gap-2.5 rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 shadow-xs"
            >
              <CalendarClock className="size-4 text-danger" aria-hidden="true" />
              <p className="text-sm text-ink-secondary">
                <span className="font-semibold tabular-nums text-danger">
                  {overdueCount}
                </span>{" "}
                overdue
              </p>
            </div>
          ) : null}
          {dueSoonCount > 0 ? (
            <div
              role="listitem"
              className="flex items-center gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-4 py-2.5 shadow-xs"
            >
              <CalendarClock
                className="size-4 text-warning"
                aria-hidden="true"
              />
              <p className="text-sm text-ink-secondary">
                <span className="font-semibold tabular-nums text-warning">
                  {dueSoonCount}
                </span>{" "}
                due within 24h
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Pending tasks — overdue strongest, then due soon, then future */}
      <section aria-labelledby="pending-tasks-heading">
        <div className="rounded-lg border border-line bg-surface shadow-xs">
          <div className="border-b border-line px-5 py-4">
            <h2
              id="pending-tasks-heading"
              className="text-base font-semibold text-ink"
            >
              Pending
            </h2>
            <p className="mt-0.5 text-xs text-muted">
              Overdue first, then tasks due within 24 hours
            </p>
          </div>

          {rankedPending.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <ListTodo className="mx-auto size-8 text-faint" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink">
                Nothing to follow up on
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
                When a high-value lead is qualified, a follow-up task appears
                here automatically. You can also add one from any lead page.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {rankedPending.map((task) => {
                const dueMs = task.dueDate.getTime() - now;
                const overdue = dueMs < 0;
                const dueSoon = !overdue && dueMs <= 24 * HOUR_MS;

                return (
                  <li
                    key={task.id}
                    className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${
                      overdue ? "border-l-2 border-l-danger bg-danger-soft/40" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p
                        className={`text-sm ${
                          overdue
                            ? "font-semibold text-ink"
                            : "font-medium text-ink"
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description ? (
                        <p className="mt-0.5 text-sm leading-5 text-ink-secondary">
                          {task.description}
                        </p>
                      ) : null}
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted">
                        <Link
                          href={`/leads/${task.lead.id}`}
                          className="focus-light font-medium text-navy underline-offset-2 hover:underline"
                        >
                          {task.lead.name}
                        </Link>
                        <span aria-hidden="true">·</span>
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 font-medium text-danger">
                            Overdue
                          </span>
                        ) : null}
                        {overdue ? <span aria-hidden="true">·</span> : null}
                        <span
                          className={
                            overdue
                              ? "font-medium text-danger"
                              : dueSoon
                                ? "font-medium text-warning"
                                : ""
                          }
                        >
                          due {formatDueDate(task.dueDate)}
                        </span>
                      </p>
                    </div>
                    <TaskToggle taskId={task.id} completed={false} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Completed — visually quieter */}
      {completed.length > 0 ? (
        <section aria-labelledby="completed-tasks-heading" className="mt-6">
          <div className="rounded-lg border border-line bg-surface shadow-xs">
            <div className="border-b border-line px-5 py-4">
              <h2
                id="completed-tasks-heading"
                className="text-sm font-semibold text-muted"
              >
                Completed
              </h2>
            </div>
            <ul className="divide-y divide-line">
              {completed.map((task) => (
                <li
                  key={task.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-muted line-through">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      <Link
                        href={`/leads/${task.lead.id}`}
                        className="focus-light font-medium text-muted underline-offset-2 hover:text-ink-secondary hover:underline"
                      >
                        {task.lead.name}
                      </Link>
                      {task.completedAt
                        ? ` · completed ${formatDueDate(task.completedAt)}`
                        : ""}
                    </p>
                  </div>
                  <TaskToggle taskId={task.id} completed />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
