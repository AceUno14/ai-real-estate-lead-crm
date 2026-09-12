import type { LeadPriority, LeadStatus } from "@/generated/prisma/client";

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-navy-soft text-navy border-transparent",
  CONTACTED: "bg-warning-soft text-warning border-transparent",
  QUALIFIED: "bg-success-soft text-success border-transparent",
  NURTURING: "bg-surface-muted text-ink-secondary border-line",
  WON: "bg-success text-white border-transparent",
  LOST: "bg-surface-muted text-muted border-line",
};

const PRIORITY_STYLES: Record<LeadPriority, string> = {
  LOW: "bg-surface-muted text-muted border-line",
  MEDIUM: "bg-navy-soft text-navy border-transparent",
  HIGH: "bg-warning-soft text-warning border-warning/30",
  URGENT: "bg-danger text-white border-transparent",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}
