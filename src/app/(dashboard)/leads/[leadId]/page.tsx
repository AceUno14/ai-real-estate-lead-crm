import type { Metadata } from "next";

import { PageHeader } from "@/components/ui/page-header";
import { PriorityBadge, StatusBadge } from "@/components/leads/badges";
import { StatusUpdateForm } from "@/components/leads/status-update-form";
import { NoteForm } from "@/components/leads/note-form";
import { AssignButton } from "@/components/leads/assign-button";
import { TaskForm } from "@/components/leads/task-form";
import { TaskToggle } from "@/components/leads/task-toggle";
import {
  DraftReviewForm,
  RunQualificationButton,
} from "@/components/leads/qualification-panel";
import { requireActiveOrganization } from "@/server/auth/organization";
import { requireSessionUser } from "@/server/auth/session";
import { requireLeadForOrganization } from "@/server/db/lead";
import { prisma } from "@/server/db/prisma";

export const metadata: Metadata = {
  title: "Lead detail",
};

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;

  const user = await requireSessionUser();
  const organization = await requireActiveOrganization();

  // Tenant-safe lookup: 404 for missing AND cross-organization records.
  const lead = await requireLeadForOrganization(organization.id, leadId);

  const [qualification, notes, tasks, activities] = await Promise.all([
    prisma.leadQualification.findFirst({
      where: { leadId: lead.id, organizationId: organization.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leadNote.findMany({
      where: { leadId: lead.id, organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    }),
    prisma.followUpTask.findMany({
      where: { leadId: lead.id, organizationId: organization.id },
      orderBy: { dueDate: "asc" },
    }),
    prisma.activity.findMany({
      where: { leadId: lead.id, organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true } } },
    }),
  ]);

  // `activities` is newest-first, so the first qualification activity tells
  // us whether the automatic run is still pending or has already failed.
  const latestQualificationActivity = activities.find(
    (activity) =>
      activity.type === "QUALIFICATION_GENERATED" ||
      activity.type === "QUALIFICATION_FAILED",
  );
  const qualificationFailed =
    !qualification &&
    latestQualificationActivity?.type === "QUALIFICATION_FAILED";

  return (
    <div>
      <PageHeader
        title={lead.name}
        description={`Inquiry received ${formatDateTime(lead.createdAt)}`}
        actions={
          <>
            <AssignButton leadId={lead.id} assignedToMe={lead.assignedToUserId === user.id} />
            <StatusUpdateForm leadId={lead.id} currentStatus={lead.status} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: profile + qualification */}
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Contact & inquiry
            </h2>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="text-sm">{lead.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Phone</dt>
                <dd className="text-sm">{lead.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Inquiry type</dt>
                <dd className="text-sm">{lead.inquiryType}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Property type</dt>
                <dd className="text-sm">{lead.propertyType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Preferred location</dt>
                <dd className="text-sm">{lead.preferredLocation}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Budget</dt>
                <dd className="text-sm">
                  {lead.budgetMin !== null || lead.budgetMax !== null
                    ? `${lead.budgetMin?.toLocaleString() ?? "?"} – ${lead.budgetMax?.toLocaleString() ?? "?"} USD`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Timeline</dt>
                <dd className="text-sm">{lead.timeline ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Financing</dt>
                <dd className="text-sm">{lead.financingStatus ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Source</dt>
                <dd className="text-sm">{lead.source ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Status</dt>
                <dd className="mt-0.5">
                  <StatusBadge status={lead.status} />
                </dd>
              </div>
            </dl>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <dt className="text-xs text-slate-500">Message</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm">{lead.message}</dd>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              AI qualification
            </h2>
            {qualification ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-3">
                  <PriorityBadge priority={qualification.priority} />
                  <span className="text-sm">
                    Score <strong>{qualification.score}</strong>/100
                  </span>
                  <span className="text-xs text-slate-500">
                    confidence {Math.round(qualification.confidence * 100)}% ·{" "}
                    {qualification.provider}/{qualification.model}
                  </span>
                </div>
                <p className="mt-3 text-sm">{qualification.summary}</p>
                <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-slate-500">Intent</dt>
                    <dd className="text-sm">{qualification.intent}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Timeline</dt>
                    <dd className="text-sm">{qualification.timeline}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Budget readiness</dt>
                    <dd className="text-sm">{qualification.budgetReadiness}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Financing</dt>
                    <dd className="text-sm">{qualification.financingStatus}</dd>
                  </div>
                </dl>
                <div className="mt-4 rounded-md bg-slate-50 p-3">
                  <p className="text-xs font-medium text-slate-500">
                    Recommended next action
                  </p>
                  <p className="mt-1 text-sm">{qualification.recommendedAction}</p>
                </div>
                <div className="mt-4">
                  <DraftReviewForm
                    qualificationId={qualification.id}
                    leadId={lead.id}
                    draftReply={qualification.draftReply}
                    reviewState={qualification.reviewState}
                  />
                </div>
              </div>
            ) : (
              <>
                <p
                  className={
                    qualificationFailed
                      ? "mt-4 text-sm text-amber-700"
                      : "mt-4 text-sm text-slate-500"
                  }
                >
                  {qualificationFailed
                    ? "Automatic AI qualification failed — retry available."
                    : "AI qualification pending. The CRM remains fully usable — run qualification below when you are ready."}
                </p>
                <RunQualificationButton leadId={lead.id} />
              </>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Notes
            </h2>
            <div className="mt-4">
              <NoteForm leadId={lead.id} />
            </div>
            <ul className="mt-4 space-y-3">
              {notes.length === 0 ? (
                <li className="text-sm text-slate-500">No notes yet.</li>
              ) : (
                notes.map((note) => (
                  <li
                    key={note.id}
                    className="rounded-md border border-slate-200 p-3"
                  >
                    <p className="whitespace-pre-wrap text-sm">{note.content}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {note.author?.name ?? "Unknown"} ·{" "}
                      {formatDateTime(note.createdAt)}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>

        {/* Right column: tasks + activity */}
        <div className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Follow-up tasks
            </h2>
            {tasks.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No follow-up tasks.</p>
            ) : null}
            {tasks.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-start justify-between gap-2 text-sm"
                  >
                    <span>
                      <span
                        className={
                          task.completedAt
                            ? "text-slate-400 line-through"
                            : ""
                        }
                      >
                        {task.title}
                      </span>
                      <span className="block text-xs text-slate-500">
                        due {formatDateTime(task.dueDate)}
                      </span>
                    </span>
                    <TaskToggle taskId={task.id} completed={task.completedAt !== null} />
                  </li>
                ))}
              </ul>
            ) : null}
            <TaskForm leadId={lead.id} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Activity
            </h2>
            {activities.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {activities.map((activity) => (
                  <li key={activity.id} className="border-l-2 border-slate-200 pl-3">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-slate-500">
                      {activity.actor?.name ?? "System"} ·{" "}
                      {formatDateTime(activity.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
