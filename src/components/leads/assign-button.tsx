"use client";

import { useActionState } from "react";

import {
  toggleLeadAssignment,
  type MutationState,
} from "@/server/actions/lead-mutations";

const initialState: MutationState = {};

export function AssignButton({
  leadId,
  assignedToMe,
}: {
  leadId: string;
  assignedToMe: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    toggleLeadAssignment,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
      >
        {pending
          ? "Saving…"
          : assignedToMe
            ? "Unassign from me"
            : "Assign to me"}
      </button>
      {state.error ? (
        <span role="alert" className="text-xs text-red-600">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
