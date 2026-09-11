"use client";

import { useActionState } from "react";

import {
  runQualification,
  setQualificationReviewState,
  editQualificationDraft,
  type QualifyState,
} from "@/server/actions/qualification";

const initialState: QualifyState = {};

export function RunQualificationButton({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(
    runQualification,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Qualifying…" : "Run AI qualification"}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function DraftReviewForm({
  qualificationId,
  leadId,
  draftReply,
  reviewState,
}: {
  qualificationId: string;
  leadId: string;
  draftReply: string;
  reviewState: string;
}) {
  const [editState, editAction, editPending] = useActionState(
    editQualificationDraft,
    initialState,
  );
  const [reviewStateResult, reviewAction, reviewPending] = useActionState(
    setQualificationReviewState,
    initialState,
  );

  const locked = reviewState === "APPROVED" || reviewState === "REJECTED";

  return (
    <div className="mt-4 space-y-3">
      <form action={editAction} className="space-y-2">
        <input type="hidden" name="qualificationId" value={qualificationId} />
        <input type="hidden" name="leadId" value={leadId} />
        <label htmlFor="draft-reply" className="block text-xs font-medium text-slate-500">
          Draft reply ({reviewState.toLowerCase()})
        </label>
        <textarea
          id="draft-reply"
          name="draftReply"
          rows={6}
          maxLength={8000}
          defaultValue={draftReply}
          disabled={locked}
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-sans text-sm focus:border-slate-900 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={editPending || locked}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
          >
            {editPending ? "Saving…" : "Save edit"}
          </button>
        </div>
        {editState.error ? (
          <p role="alert" className="text-xs text-red-600">
            {editState.error}
          </p>
        ) : null}
      </form>

      {!locked ? (
        <form action={reviewAction} className="flex items-center gap-2">
          <input type="hidden" name="qualificationId" value={qualificationId} />
          <input type="hidden" name="leadId" value={leadId} />
          <button
            type="submit"
            name="reviewState"
            value="APPROVED"
            disabled={reviewPending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            Approve draft
          </button>
          <button
            type="submit"
            name="reviewState"
            value="REJECTED"
            disabled={reviewPending}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Reject draft
          </button>
          {reviewStateResult.error ? (
            <span role="alert" className="text-xs text-red-600">
              {reviewStateResult.error}
            </span>
          ) : null}
        </form>
      ) : (
        <p className="text-xs text-slate-500">
          Review complete — this draft was {reviewState.toLowerCase()}.
          Outbound messaging is not part of the MVP.
        </p>
      )}
    </div>
  );
}
