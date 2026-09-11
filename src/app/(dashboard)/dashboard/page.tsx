import type { Metadata } from "next";
import Link from "next/link";

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

export default async function DashboardPage() {
  const organization = await requireActiveOrganization();

  const [metrics, topLeads, recentActivity] = await Promise.all([
    getDashboardMetrics(organization.id),
    getTopLeadsToContact(organization.id, 5),
    getRecentActivity(organization.id, 8),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`${organization.name} — who to contact first, and why.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total leads" value={metrics.totalLeads} />
        <MetricCard label="New leads" value={metrics.newLeads} />
        <MetricCard
          label="High priority"
          value={metrics.highPriorityLeads}
          hint="Latest AI qualification"
        />
        <MetricCard
          label="Urgent"
          value={metrics.urgentLeads}
          hint="Contact these first"
        />
        <MetricCard
          label="Average AI score"
          value={metrics.averageScore ?? "—"}
          hint={metrics.averageScore === null ? "No qualifications yet" : undefined}
        />
        <MetricCard
          label="Follow-ups due"
          value={metrics.followUpsDue}
          hint="Due today or overdue"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Leads by status
          </h2>
          <ul className="mt-4 space-y-2">
            {LEAD_STATUSES.map((status) => (
              <li key={status} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{status}</span>
                <span className="font-medium">{metrics.leadsByStatus[status] ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Who should I contact first?
          </h2>
          {topLeads.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              Run AI qualification on leads to see a ranked contact list here.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {topLeads.map((lead, index) => (
                <li key={lead.leadId} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/leads/${lead.leadId}`}
                      className="text-sm font-medium underline-offset-2 hover:underline"
                    >
                      {index + 1}. {lead.name}
                    </Link>
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={lead.priority} />
                      <span className="text-sm font-semibold">{lead.score}</span>
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {lead.summary}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Next: {lead.recommendedAction}
                    {lead.timeline ? ` · timeline: ${lead.timeline.toLowerCase()}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent activity
        </h2>
        {recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ol className="mt-4 space-y-2">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <Link
                  href={`/leads/${activity.leadId}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {activity.lead.name}
                </Link>
                <span className="text-slate-600">{activity.message}</span>
                <span className="text-xs text-slate-400">
                  {new Date(activity.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
