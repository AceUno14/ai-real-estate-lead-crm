import { CheckCircle2, Circle } from "lucide-react";

import {
  DetailSection,
  SubHeading,
} from "@/components/leads/detail-section";
import { TaskForm } from "@/components/leads/task-form";
import { TaskToggle } from "@/components/leads/task-toggle";
import { formatDueLabel } from "@/lib/format";

/**
 * Follow-up tasks panel (UI Phase 2).
 *
 * Presentation only: sorting, completion logic, and mutations
 * (create/complete/reopen) are untouched. Automatic urgent tasks read as
 * important through the due-date treatment — no extra red.
 */
export function FollowUpPanel({
  leadId,
  tasks,
}: {
  leadId: string;
  tasks: {
    id: string;
    title: string;
    dueDate: Date;
    completedAt: Date | null;
  }[];
}) {
  const now = new Date();
  const soonCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const pending = tasks.filter((task) => task.completedAt === null);
  const overdueCount = pending.filter((task) => task.dueDate < now).length;

  return (
    <DetailSection
      id="follow-up-tasks"
      title="Follow-up tasks"
      aside={
        overdueCount > 0 ? (
          <span className="text-xs font-medium text-danger">
            {overdueCount} overdue
          </span>
        ) : null
      }
    >
      {tasks.length === 0 ? (
        <p className="text-sm text-muted">
          No follow-up tasks yet. High-value leads get one automatically after
          AI qualification.
        </p>
      ) : (
        <ul className="-mx-1 divide-y divide-line">
          {tasks.map((task) => {
            const isCompleted = task.completedAt !== null;
            const isOverdue = !isCompleted && task.dueDate < now;
            const isDueSoon =
              !isCompleted && !isOverdue && task.dueDate < soonCutoff;

            return (
              <li
                key={task.id}
                className="flex items-start justify-between gap-3 px-1 py-2.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isCompleted ? (
                      <CheckCircle2
                        className="size-4 shrink-0 text-success"
                        aria-hidden="true"
                      />
                    ) : (
                      <Circle
                        className={`size-4 shrink-0 ${
                          isOverdue ? "text-danger" : "text-line-strong"
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`truncate text-sm ${
                        isCompleted
                          ? "text-faint line-through"
                          : "font-medium text-ink"
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>
                  <p
                    className={`mt-1 pl-6 text-xs tabular-nums ${
                      isOverdue
                        ? "font-medium text-danger"
                        : isDueSoon
                          ? "font-medium text-warning"
                          : "text-muted"
                    }`}
                  >
                    {isOverdue ? "Overdue · " : isDueSoon ? "Due soon · " : "Due "}
                    {formatDueLabel(task.dueDate, now)}
                  </p>
                </div>
                <TaskToggle
                  taskId={task.id}
                  completed={isCompleted}
                />
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <SubHeading>Add a task</SubHeading>
        <TaskForm leadId={leadId} />
      </div>
    </DetailSection>
  );
}
