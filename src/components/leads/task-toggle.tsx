"use client";

import { useActionState } from "react";

import {
  toggleFollowUpTask,
  type TaskMutationState,
} from "@/server/actions/follow-up-tasks";

const initialState: TaskMutationState = {};

export function TaskToggle({
  taskId,
  completed,
}: {
  taskId: string;
  completed: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    toggleFollowUpTask,
    initialState,
  );

  return (
    <form action={formAction} className="inline-flex items-center gap-2">
      <input type="hidden" name="taskId" value={taskId} />
      <button
        type="submit"
        disabled={pending}
        aria-label={completed ? `Reopen task` : "Complete task"}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-60 md:min-h-9"
      >
        {pending ? "…" : completed ? "Reopen" : "Complete"}
      </button>
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
