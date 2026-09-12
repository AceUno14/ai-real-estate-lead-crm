import { Flame } from "lucide-react";

import { PriorityBadge, StatusBadge } from "@/components/leads/badges";
import { formatRelativeTime } from "@/lib/format";

/**
 * Lead header (UI Phase A).
 *
 * Lead identity first: name as the primary title with the received
 * context beside it, then the status/priority/score strip. HIGH and
 * URGENT leads are instantly recognizable via a left accent bar
 * (amber for HIGH, red for URGENT) without shouting. Controls stay
 * secondary to the identity.
 */
export function LeadHeader({
  lead,
  assignedToMe,
  score,
  priority,
  actions,
}: {
  lead: {
    id: string;
    name: string;
    email: string;
    status: string;
    createdAt: Date;
    assignedToUserId: string | null;
  };
  assignedToMe: boolean;
  score: number | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | null;
  actions: React.ReactNode;
}) {
  const accentBar =
    priority === "URGENT"
      ? "bg-danger"
      : priority === "HIGH"
        ? "bg-warning"
        : null;

  return (
    <header className="relative mb-4 overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
      {/* Priority accent bar — only for HIGH/URGENT */}
      {accentBar ? (
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 ${accentBar}`}
        />
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 py-4 pl-5 sm:px-6 sm:pl-7">
        <div className="min-w-0">
          {/* Lead identity */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {lead.name}
            </h1>
            {priority === "URGENT" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-danger px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                <Flame className="size-3" aria-hidden="true" />
                Urgent
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-sm text-muted">
            {lead.email} · inquiry received{" "}
            <time dateTime={lead.createdAt.toISOString()}>
              {formatRelativeTime(lead.createdAt)}
            </time>
          </p>

          {/* Status strip */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={lead.status as never} />
            {priority ? <PriorityBadge priority={priority} /> : null}
            {score !== null ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                <span className="font-semibold text-ink-secondary tabular-nums">
                  {score}
                </span>
                /100 AI score
              </span>
            ) : null}
            <span className="text-xs text-muted">
              {lead.assignedToUserId
                ? assignedToMe
                  ? "Assigned to you"
                  : "Assigned"
                : "Unassigned"}
            </span>
          </div>
        </div>

        {/* Primary actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      </div>
    </header>
  );
}
