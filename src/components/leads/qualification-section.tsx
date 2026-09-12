import { Sparkles, Timer, TriangleAlert } from "lucide-react";
import type { LeadPriority } from "@/generated/prisma/client";

import { PriorityBadge } from "@/components/leads/badges";
import {
  DetailSection,
  MetaItem,
} from "@/components/leads/detail-section";
import {
  DraftReviewForm,
  RunQualificationButton,
} from "@/components/leads/qualification-panel";

/**
 * AI qualification panel (UI Phase 2).
 *
 * The central intelligence panel of the lead detail page. All data comes
 * from the persisted, Zod-validated LeadQualification; presentation only.
 * The tone mirrors the leads-list score meter: emerald 80+, navy 60+,
 * muted below.
 */
function scoreTone(score: number): { text: string; bar: string } {
  if (score >= 80) return { text: "text-success", bar: "bg-success" };
  if (score >= 60) return { text: "text-ink", bar: "bg-navy" };
  return { text: "text-muted", bar: "bg-line-strong" };
}

export function QualificationPanel({
  leadId,
  qualification,
  pending,
  failed,
}: {
  leadId: string;
  qualification: {
    id: string;
    score: number;
    priority: LeadPriority;
    confidence: number;
    summary: string;
    intent: string;
    timeline: string;
    budgetReadiness: string;
    financingStatus: string;
    recommendedAction: string;
    draftReply: string;
    reviewState: string;
    provider: string;
    model: string;
  } | null;
  pending: boolean;
  failed: boolean;
}) {
  return (
    <DetailSection
      id="ai-qualification"
      title="AI qualification"
      aside={
        qualification ? (
          <span className="text-xs text-faint">
            {qualification.provider}/{qualification.model}
          </span>
        ) : null
      }
    >
      {qualification ? (
        <div>
          {/* Score + priority header */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-3xl font-semibold tabular-nums leading-none ${
                  scoreTone(qualification.score).text
                }`}
              >
                {qualification.score}
              </span>
              <span className="text-xs font-medium text-faint">/100</span>
            </div>
            <div className="min-w-[7rem] flex-1 sm:max-w-[10rem]">
              <div className="text-[11px] font-medium uppercase tracking-wide text-faint">
                AI score
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"
                aria-hidden="true"
              >
                <div
                  className={`h-full rounded-full ${
                    scoreTone(qualification.score).bar
                  }`}
                  style={{ width: `${qualification.score}%` }}
                />
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted">
                Confidence{" "}
                <span className="font-medium text-ink-secondary tabular-nums">
                  {Math.round(qualification.confidence * 100)}%
                </span>
              </span>
              <PriorityBadge priority={qualification.priority} />
            </div>
          </div>

          {/* AI summary */}
          <p className="mt-4 text-sm leading-relaxed text-ink-secondary">
            {qualification.summary}
          </p>

          {/* Signals */}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
            <MetaItem label="Intent" value={qualification.intent} />
            <MetaItem label="Timeline" value={qualification.timeline} />
            <MetaItem
              label="Budget readiness"
              value={qualification.budgetReadiness}
            />
            <MetaItem
              label="Financing"
              value={qualification.financingStatus}
            />
          </dl>

          {/* Recommended next action — the actionable takeaway */}
          <div className="mt-4 rounded-md border border-navy/15 bg-navy-soft p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-navy">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Recommended next action
            </p>
            <p className="mt-1.5 text-sm font-medium leading-snug text-ink">
              {qualification.recommendedAction}
            </p>
          </div>

          {/* Draft reply review */}
          <div className="mt-5 border-t border-line pt-4">
            <DraftReviewForm
              qualificationId={qualification.id}
              leadId={leadId}
              draftReply={qualification.draftReply}
              reviewState={qualification.reviewState}
            />
          </div>
        </div>
      ) : pending ? (
        /* Polished pending state — automatic qualification may still be running */
        <div className="flex items-start gap-3 py-1">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted"
            aria-hidden="true"
          >
            <Timer className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">
              AI qualification pending
            </p>
            <p className="mt-0.5 max-w-md text-sm text-muted">
              New inquiries are qualified automatically right after submission.
              The CRM is fully usable in the meantime.
            </p>
            <div className="mt-3">
              <RunQualificationButton leadId={leadId} />
            </div>
          </div>
        </div>
      ) : failed ? (
        /* Failure state — calm, actionable, not alarming */
        <div className="flex items-start gap-3 py-1">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning"
            aria-hidden="true"
          >
            <TriangleAlert className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">
              Automatic qualification didn&apos;t complete
            </p>
            <p className="mt-0.5 max-w-md text-sm text-muted">
              The lead is unaffected. You can run the qualification again now.
            </p>
            <div className="mt-3">
              <RunQualificationButton leadId={leadId} />
            </div>
          </div>
        </div>
      ) : (
        /* No qualification and no automatic attempt (seeded/manual leads) */
        <div className="flex items-start gap-3 py-1">
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-muted"
            aria-hidden="true"
          >
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink">
              Not qualified yet
            </p>
            <p className="mt-0.5 max-w-md text-sm text-muted">
              Run the AI qualification to score this lead and draft a reply.
            </p>
            <div className="mt-3">
              <RunQualificationButton leadId={leadId} />
            </div>
          </div>
        </div>
      )}
    </DetailSection>
  );
}
