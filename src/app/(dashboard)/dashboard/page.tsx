import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Flame,
  ShieldAlert,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PriorityBadge } from "@/components/leads/badges";
import { requireActiveOrganization } from "@/server/auth/organization";
import {
  getDashboardMetrics,
  getRecentActivity,
  getTopLeadsToContact,
} from "@/server/db/dashboard";
import { LEAD_STATUSES } from "@/domain/status";

export const metadata: Metadata = {
  title: "Dashboard",
};

const STATUS_ACCENT: Record<string, string> = {
  NEW: "bg-navy",
  CONTACTED: "bg-warning",
  QUALIFIED: "bg-success",
  NURTURING: "bg-line-strong",
  WON: "bg-success",
  LOST: "bg-line-strong",
};

export default async function DashboardPage() {
  const organization = await requireActiveOrganization();

  const [metrics, topLeads, recentActivity] = await Promise.all([
    getDashboardMetrics(organization.id),
    getTopLeadsToContact(organization.id, 5),
    getRecentActivity(organization.id, 8),
  ]);

  const attentionItems = [
    {
      label: "Urgent leads",
      value: metrics.urgentLeads,
      href: "/leads",
      icon: Flame,
      tone: metrics.urgentLeads > 0 ? "danger" : "neutral",
      hint: "Contact immediately",
    },
    {
      label: "High priority",
      value: metrics.highPriorityLeads,
      href: "/leads",
      icon: ShieldAlert,
      tone: metrics.highPriorityLeads > 0 ? "warning" : "neutral",
      hint: "Reach out today",
    },
    {
      label: "Follow-ups due",
      value: metrics.followUpsDue,
      href: "/tasks",
      icon: Clock,
      tone: metrics.followUpsDue > 0 ? "warning" : "neutral",
      hint: "Due today or overdue",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${organization.name} — who to contact first, and why.`}
      />

      {/* Primary attention area */}
      <section aria-labelledby="attention-heading" className="mb-8">
        <h2 id="attention-heading" className="sr-only">
          Needs your attention
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {attentionItems.map((item) => {
            const Icon = item.icon;
            const needsAttention = item.value > 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group focus-light block rounded-lg border p-5 shadow-xs transition-colors ${
                  item.tone === "danger" && needsAttention
                    ? "border-danger/30 bg-danger-soft hover:border-danger/50"
                    : item.tone !== "neutral" && needsAttention
                      ? "border-warning/30 bg-warning-soft hover:border-warning/50"
                      : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide ${
                      item.tone === "danger" && needsAttention
                        ? "text-danger"
                        : item.tone !== "neutral" && needsAttention
                          ? "text-warning"
                          : "text-muted"
                    }`}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {item.label}
                  </span>
                  <ArrowRight
                    className="size-4 text-faint transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
                <p
                  className={`mt-2 text-3xl font-semibold tabular-nums ${
                    item.tone === "danger" && needsAttention
                      ? "text-danger"
                      : item.tone !== "neutral" && needsAttention
                        ? "text-warning"
                        : "text-ink"
                  }`}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-xs text-muted">{item.hint}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Secondary metrics */}
      <section aria-label="Pipeline metrics" className="mb-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard label="Total leads" value={metrics.totalLeads} />
          <MetricCard
            label="New leads"
            value={metrics.newLeads}
            hint="Awaiting first contact"
          />
          <MetricCard
            label="Average AI score"
            value={metrics.averageScore ?? "—"}
            hint={
              metrics.averageScore === null ? "No qualifications yet" : undefined
            }
          />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main content: contact-first ranking */}
        <section
          aria-labelledby="contact-first-heading"
          className="lg:col-span-3"
        >
          <div className="rounded-lg border border-line bg-surface shadow-xs">
            <div className="border-b border-line px-5 py-4">
              <h2
                id="contact-first-heading"
                className="text-base font-semibold text-ink"
              >
                Who should I contact first?
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Ranked by AI qualification score
              </p>
            </div>

            {topLeads.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-ink-secondary">
                  No qualified leads yet
                </p>
                <p className="mt-1 text-sm text-muted">
                  Run AI qualification on a lead to build the ranked contact
                  list.
                </p>
              </div>
            ) : (
              <ol className="divide-y divide-line">
                {topLeads.map((lead, index) => (
                  <li key={lead.leadId}>
                    <Link
                      href={`/leads/${lead.leadId}`}
                      className="group focus-light flex items-start gap-4 px-5 py-4 transition-colors hover:bg-surface-muted"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-muted text-xs font-semibold text-muted group-hover:bg-line"
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-semibold text-ink underline-offset-2 group-hover:underline">
                            {lead.name}
                          </span>
                          <PriorityBadge priority={lead.priority} />
                        </span>
                        <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted">
                          {lead.summary}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-secondary">
                          <span className="inline-flex items-center gap-1 font-medium">
                            <ArrowRight className="size-3" aria-hidden="true" />
                            {lead.recommendedAction}
                          </span>
                          {lead.timeline ? (
                            <span className="text-faint">
                              · {lead.timeline.toLowerCase()}
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end">
                        <span
                          className={`text-lg font-semibold tabular-nums ${
                            lead.score >= 80
                              ? "text-success"
                              : lead.score >= 60
                                ? "text-ink"
                                : "text-muted"
                          }`}
                        >
                          {lead.score}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-faint">
                          score
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <div className="border-t border-line px-5 py-3">
              <Link
                href="/leads"
                className="focus-light inline-flex items-center gap-1 text-sm font-medium text-navy hover:underline"
              >
                View all leads
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Supporting content */}
        <div className="space-y-6 lg:col-span-2">
          <section aria-labelledby="status-heading">
            <div className="rounded-lg border border-line bg-surface shadow-xs">
              <div className="border-b border-line px-5 py-4">
                <h2
                  id="status-heading"
                  className="text-sm font-semibold text-ink"
                >
                  Leads by status
                </h2>
              </div>
              <ul className="space-y-2.5 px-5 py-4">
                {LEAD_STATUSES.map((status) => {
                  const count = metrics.leadsByStatus[status] ?? 0;
                  const total = Math.max(metrics.totalLeads, 1);
                  return (
                    <li key={status} className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`size-2 shrink-0 rounded-full ${STATUS_ACCENT[status] ?? "bg-line-strong"}`}
                      />
                      <span className="w-24 shrink-0 text-xs text-ink-secondary">
                        {status}
                      </span>
                      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted">
                        <span
                          className={`block h-full rounded-full ${STATUS_ACCENT[status] ?? "bg-line-strong"}`}
                          style={{ width: `${Math.round((count / total) * 100)}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-ink">
                        {count}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>

          <section aria-labelledby="activity-heading">
            <div className="rounded-lg border border-line bg-surface shadow-xs">
              <div className="border-b border-line px-5 py-4">
                <h2
                  id="activity-heading"
                  className="text-sm font-semibold text-ink"
                >
                  Recent activity
                </h2>
              </div>
              {recentActivity.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted">No activity yet.</p>
              ) : (
                <ol className="divide-y divide-line">
                  {recentActivity.map((activity) => (
                    <li key={activity.id} className="px-5 py-3">
                      <p className="text-xs leading-5 text-ink-secondary">
                        <Link
                          href={`/leads/${activity.leadId}`}
                          className="focus-light font-medium text-ink underline-offset-2 hover:underline"
                        >
                          {activity.lead.name}
                        </Link>{" "}
                        {activity.message}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {new Date(activity.createdAt).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
