"use client";

import { useActionState, useRef } from "react";

import {
  createFollowUpTask,
  type TaskMutationState,
} from "@/server/actions/follow-up-tasks";

const initialState: TaskMutationState = {};

export function TaskForm({ leadId }: { leadId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prevState: TaskMutationState, formData: FormData) => {
      const result = await createFollowUpTask(prevState, formData);
      if (!result.error) {
        formRef.current?.reset();
      }
      return result;
    },
    initialState,
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <div>
        <label htmlFor="task-title" className="sr-only">
          Task title
        </label>
        <input
          id="task-title"
          name="title"
          type="text"
          required
          maxLength={200}
          placeholder="e.g. Call to arrange viewing"
          className="h-9 w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-ink placeholder:text-faint focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor="task-due"
          className="text-[11px] font-medium uppercase tracking-wide text-faint"
        >
          Due
        </label>
        <input
          id="task-due"
          name="dueDate"
          type="date"
          required
          className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-sm tabular-nums text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
        <button
          type="submit"
          disabled={pending}
          className="ml-auto inline-flex min-h-9 items-center justify-center rounded-md bg-navy px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-navy-strong disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add task"}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
