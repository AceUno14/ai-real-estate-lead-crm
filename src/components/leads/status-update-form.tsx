"use client";

import { useActionState } from "react";

import {
  updateLeadStatus,
  type MutationState,
} from "@/server/actions/lead-mutations";
import { LEAD_STATUSES } from "@/domain/status";

const initialState: MutationState = {};

export function StatusUpdateForm({
  leadId,
  currentStatus,
}: {
  leadId: string;
  currentStatus: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateLeadStatus,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="status" className="sr-only">
        Status
      </label>
      <select
        id="status"
        name="status"
        defaultValue={currentStatus}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-900 focus:outline-none"
      >
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update"}
      </button>
      {state.error ? (
        <span role="alert" className="text-xs text-red-600">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
