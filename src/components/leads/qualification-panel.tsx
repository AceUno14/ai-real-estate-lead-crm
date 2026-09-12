"use client";

import { useActionState } from "react";

import {
  runQualification,
  setQualificationReviewState,
  editQualificationDraft,
  type QualifyState,
} from "@/server/actions/qualification";

const initialState: QualifyState = {};

const primaryButtonClasses =
  "inline-flex min-h-9 items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-strong disabled:opacity-60";
const secondaryButtonClasses =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-60";

export function RunQualificationButton({ leadId }: { leadId: string }) {
  const [state, formAction, pending] = useActionState(
    runQualification,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="leadId" value={leadId} />
      <button
        type="submit"
        disabled={pending}
        className={primaryButtonClasses}
      >
        {pending ? "Qualifying…" : "Run AI qualification"}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
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
    <div className="space-y-3">
      <form action={editAction} className="space-y-2">
        <input type="hidden" name="qualificationId" value={qualificationId} />
        <input type="hidden" name="leadId" value={leadId} />
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <label
            htmlFor="draft-reply"
            className="text-[11px] font-medium uppercase tracking-wide text-faint"
          >
            AI draft reply
          </label>
          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
            AI-generated · review state: {reviewState.toLowerCase()}
          </span>
        </div>
        <textarea
          id="draft-reply"
          name="draftReply"
          rows={6}
          maxLength={8000}
          defaultValue={draftReply}
          disabled={locked}
          className="w-full rounded-md border border-line-strong bg-surface px-3 py-2 font-sans text-sm leading-relaxed text-ink placeholder:text-faint focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy disabled:bg-surface-muted disabled:text-muted"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={editPending || locked}
            className={secondaryButtonClasses}
          >
            {editPending ? "Saving…" : "Save edit"}
          </button>
          {editState.error ? (
            <span role="alert" className="text-xs text-danger">
              {editState.error}
            </span>
          ) : null}
        </div>
      </form>

      {!locked ? (
        <form action={reviewAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="qualificationId" value={qualificationId} />
          <input type="hidden" name="leadId" value={leadId} />
          <button
            type="submit"
            name="reviewState"
            value="APPROVED"
            disabled={reviewPending}
            className="inline-flex min-h-9 items-center justify-center rounded-md bg-success px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
          >
            Approve draft
          </button>
          <button
            type="submit"
            name="reviewState"
            value="REJECTED"
            disabled={reviewPending}
            className="inline-flex min-h-9 items-center justify-center rounded-md border border-danger/30 bg-surface px-3 py-1.5 text-sm font-medium text-danger transition-colors hover:bg-danger-soft disabled:opacity-60"
          >
            Reject draft
          </button>
          {reviewStateResult.error ? (
            <span role="alert" className="text-xs text-danger">
              {reviewStateResult.error}
            </span>
          ) : null}
        </form>
      ) : (
        <p className="text-xs text-muted">
          Review complete — this draft was {reviewState.toLowerCase()}.
          Outbound messaging is not part of the MVP.
        </p>
      )}
    </div>
  );
}
