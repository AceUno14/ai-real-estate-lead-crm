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
    <form ref={formRef} action={formAction} className="mt-4 space-y-2">
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
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="task-due" className="text-xs text-slate-500">
          Due
        </label>
        <input
          id="task-due"
          name="dueDate"
          type="date"
          required
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add task"}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-xs text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
