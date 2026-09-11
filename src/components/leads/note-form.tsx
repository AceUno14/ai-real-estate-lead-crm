"use client";

import { useActionState, useRef } from "react";

import {
  addLeadNote,
  type MutationState,
} from "@/server/actions/lead-mutations";

const initialState: MutationState = {};

export function NoteForm({ leadId }: { leadId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    async (prevState: MutationState, formData: FormData) => {
      const result = await addLeadNote(prevState, formData);
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
      <label htmlFor="note-content" className="sr-only">
        Add a note
      </label>
      <textarea
        id="note-content"
        name="content"
        rows={3}
        maxLength={4000}
        required
        placeholder="Add a note about this lead…"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add note"}
        </button>
        {state.error ? (
          <span role="alert" className="text-xs text-red-600">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}
