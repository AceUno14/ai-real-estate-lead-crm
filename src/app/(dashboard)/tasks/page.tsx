import type { Metadata } from "next";
import Link from "next/link";

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

/**
 * Follow-up task list (T044).
 *
 * Organization-scoped: every query filters by the server-resolved
 * organization id. Pending tasks are shown first with overdue ones
 * highlighted; completed tasks are listed below.
 */
export default async function TasksPage() {
  const organization = await requireActiveOrganization();

  const tasks = await prisma.followUpTask.findMany({
    where: { organizationId: organization.id },
    orderBy: { dueDate: "asc" },
    take: 100,
    include: { lead: { select: { id: true, name: true } } },
  });

  const pending = tasks.filter((task) => task.completedAt === null);
  const completed = tasks.filter((task) => task.completedAt !== null);

  const now = new Date();
  const overdueCount = pending.filter((task) => task.dueDate < now).length;

  return (
    <div>
      <PageHeader
        title="Follow-up tasks"
        description={
          pending.length === 0
            ? `No pending tasks in ${organization.name}.`
            : `${pending.length} pending task${pending.length === 1 ? "" : "s"}${
                overdueCount > 0 ? ` · ${overdueCount} overdue` : ""
              } in ${organization.name}.`
        }
      />

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Pending
        </h2>

        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            Nothing to follow up on right now. Add a follow-up task from a lead
            page.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {pending.map((task) => {
              const overdue = task.dueDate < now;
              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description ? (
                      <p className="mt-0.5 text-sm text-slate-600">
                        {task.description}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      <Link
                        href={`/leads/${task.lead.id}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {task.lead.name}
                      </Link>
                      {" · due "}
                      <span className={overdue ? "font-medium text-red-600" : ""}>
                        {formatDueDate(task.dueDate)}
                        {overdue ? " (overdue)" : ""}
                      </span>
                    </p>
                  </div>
                  <TaskToggle taskId={task.id} completed={false} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {completed.length > 0 ? (
        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Completed
          </h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {completed.map((task) => (
              <li
                key={task.id}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm text-slate-400 line-through">
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    <Link
                      href={`/leads/${task.lead.id}`}
                      className="font-medium underline-offset-2 hover:underline"
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
        </section>
      ) : null}
    </div>
  );
}
