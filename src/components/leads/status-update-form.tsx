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
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="status" className="sr-only">
        Status
      </label>
      <select
        id="status"
        name="status"
        defaultValue={currentStatus}
        className="h-9 rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
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
        className="inline-flex h-9 items-center rounded-md bg-navy px-3.5 text-sm font-medium text-white transition-colors hover:bg-navy-strong disabled:opacity-60"
      >
        {pending ? "Saving…" : "Update"}
      </button>
      {state.error ? (
        <span role="alert" className="text-xs text-danger">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
