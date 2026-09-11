import type { LeadPriority, LeadStatus } from "@/generated/prisma/client";

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACTED: "bg-amber-50 text-amber-700 border-amber-200",
  QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  NURTURING: "bg-violet-50 text-violet-700 border-violet-200",
  WON: "bg-green-100 text-green-800 border-green-300",
  LOST: "bg-slate-100 text-slate-500 border-slate-200",
};

const PRIORITY_STYLES: Record<LeadPriority, string> = {
  LOW: "bg-slate-100 text-slate-600 border-slate-200",
  MEDIUM: "bg-sky-50 text-sky-700 border-sky-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[priority]}`}
    >
      {priority}
    </span>
  );
}
