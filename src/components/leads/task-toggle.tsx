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
        className="rounded-md border border-slate-300 px-2 py-0.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-60"
      >
        {pending ? "…" : completed ? "Reopen" : "Complete"}
      </button>
      {state.error ? (
        <span role="alert" className="text-xs text-red-600">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
