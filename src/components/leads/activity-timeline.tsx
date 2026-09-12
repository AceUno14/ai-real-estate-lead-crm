import {
  Bell,
  CalendarClock,
  CheckCircle2,
  FileText,
  ListTodo,
  Sparkles,
  TriangleAlert,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatActivityTimestamp } from "@/lib/format";

/**
 * Activity timeline markers (UI Phase 2).
 *
 * The icon/label mapping is presentation-only — activity data, types, and
 * queries are untouched. Unknown activity types fall back to a neutral
 * marker so new activity kinds never break the timeline.
 */
type ActivityTone = "success" | "warning" | "danger" | "navy" | "neutral";

const ACTIVITY_MARKERS: Record<string, { icon: LucideIcon; tone: ActivityTone }> = {
  LEAD_CREATED: { icon: UserPlus, tone: "navy" },
  QUALIFICATION_GENERATED: { icon: Sparkles, tone: "navy" },
  QUALIFICATION_FAILED: { icon: TriangleAlert, tone: "warning" },
  AUTO_FOLLOW_UP_CREATED: { icon: CalendarClock, tone: "navy" },
  FOLLOW_UP_CREATED: { icon: CalendarClock, tone: "neutral" },
  FOLLOW_UP_COMPLETED: { icon: CheckCircle2, tone: "success" },
  FOLLOW_UP_REOPENED: { icon: ListTodo, tone: "neutral" },
  HOT_LEAD_NOTIFICATION_SENT: { icon: Bell, tone: "success" },
  HOT_LEAD_NOTIFICATION_FAILED: { icon: XCircle, tone: "warning" },
  NOTE_ADDED: { icon: FileText, tone: "neutral" },
  STATUS_CHANGED: { icon: ListTodo, tone: "neutral" },
  DRAFT_APPROVED: { icon: CheckCircle2, tone: "success" },
  DRAFT_REJECTED: { icon: XCircle, tone: "warning" },
  DRAFT_EDITED: { icon: FileText, tone: "neutral" },
};

const MARKER_STYLES: Record<ActivityTone, string> = {
  success: "bg-success-soft text-success ring-success/20",
  warning: "bg-warning-soft text-warning ring-warning/20",
  danger: "bg-danger-soft text-danger ring-danger/20",
  navy: "bg-navy-soft text-navy ring-navy/10",
  neutral: "bg-surface-muted text-muted ring-line",
};

export function ActivityTimeline({
  activities,
}: {
  activities: {
    id: string;
    type: string;
    message: string;
    createdAt: Date;
    actor: { name: string } | null;
  }[];
}) {
  if (activities.length === 0) {
    return (
      <p className="py-2 text-sm text-muted">
        No activity yet. Actions on this lead — status changes, notes,
        follow-ups, and AI qualification — will appear here.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {activities.map((activity, index) => {
        const marker = ACTIVITY_MARKERS[activity.type] ?? {
          icon: FileText,
          tone: "neutral" as ActivityTone,
        };
        const Icon = marker.icon;
        return (
          <li key={activity.id} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Vertical connector line between markers. */}
            {index < activities.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-line"
              />
            ) : null}
            <span
              className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full ring-2 ring-surface ${MARKER_STYLES[marker.tone]}`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p
                className={`text-sm leading-snug ${
                  activity.type === "LEAD_CREATED" ||
                  activity.type === "QUALIFICATION_GENERATED"
                    ? "font-medium text-ink"
                    : "text-ink-secondary"
                }`}
              >
                {activity.message}
              </p>
              <p className="mt-0.5 text-xs text-faint">
                <span className="font-medium text-muted">
                  {activity.actor?.name ?? "System"}
                </span>{" "}
                ·{" "}
                <time dateTime={activity.createdAt.toISOString()}>
                  {formatActivityTimestamp(activity.createdAt)}
                </time>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
