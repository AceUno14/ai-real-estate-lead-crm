import type { Metadata } from "next";

import { ActivityTimeline } from "@/components/leads/activity-timeline";
import { AssignButton } from "@/components/leads/assign-button";
import { DetailSection, SubHeading } from "@/components/leads/detail-section";
import { FollowUpPanel } from "@/components/leads/follow-up-panel";
import { LeadHeader } from "@/components/leads/lead-header";
import { LeadSummary } from "@/components/leads/lead-summary";
import { NoteForm } from "@/components/leads/note-form";
import { QualificationPanel } from "@/components/leads/qualification-section";
import { StatusUpdateForm } from "@/components/leads/status-update-form";
import { requireActiveOrganization } from "@/server/auth/organization";
import { requireSessionUser } from "@/server/auth/session";
import { requireLeadForOrganization } from "@/server/db/lead";
import { prisma } from "@/server/db/prisma";

export const metadata: Metadata = {
  title: "Lead detail",
};

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
      orderBy: [{ completedAt: "asc" }, { dueDate: "asc" }],
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
      {/* Phase A — lead header: identity, status strip, primary actions */}
      <LeadHeader
        lead={{
          id: lead.id,
          name: lead.name,
          email: lead.email,
          status: lead.status,
          createdAt: lead.createdAt,
          assignedToUserId: lead.assignedToUserId,
        }}
        assignedToMe={lead.assignedToUserId === user.id}
        score={qualification?.score ?? null}
        priority={qualification?.priority ?? null}
        actions={
          <>
            <AssignButton
              leadId={lead.id}
              assignedToMe={lead.assignedToUserId === user.id}
            />
            <StatusUpdateForm leadId={lead.id} currentStatus={lead.status} />
          </>
        }
      />

      {/* Desktop: 2/3 main column + 1/3 right rail. Mobile: single column. */}
      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2 lg:space-y-5">
          {/* Phase B — contact + inquiry summary */}
          <LeadSummary lead={lead} />

          {/* Phase C — AI qualification: the central intelligence panel */}
          <QualificationPanel
            leadId={lead.id}
            qualification={qualification}
            pending={!qualification && !qualificationFailed}
            failed={qualificationFailed}
          />

          {/* Phase F — notes */}
          <DetailSection
            id="notes"
            title="Notes"
            aside={
              notes.length > 0 ? (
                <span className="text-xs text-faint">
                  {notes.length} note{notes.length === 1 ? "" : "s"}
                </span>
              ) : null
            }
          >
            <NoteForm leadId={lead.id} />
            <div className="mt-4">
              {notes.length === 0 ? (
                <p className="rounded-md border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
                  No notes yet. Use notes to record calls, viewings, and
                  context for your team.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notes.map((note) => (
                    <li
                      key={note.id}
                      className="rounded-md border border-line bg-surface-muted/60 p-3"
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-secondary">
                        {note.content}
                      </p>
                      <p className="mt-1.5 text-xs text-faint">
                        <span className="font-medium text-muted">
                          {note.author?.name ?? "Unknown"}
                        </span>{" "}
                        ·{" "}
                        <time dateTime={note.createdAt.toISOString()}>
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(note.createdAt)}
                        </time>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </DetailSection>
        </div>

        {/* Right rail */}
        <div className="space-y-4 lg:space-y-5">
          {/* Phase D — follow-up tasks */}
          <FollowUpPanel leadId={lead.id} tasks={tasks} />

          {/* Phase E — activity timeline */}
          <DetailSection
            id="activity"
            title="Activity"
            aside={
              <SubHeading>Latest {activities.length}</SubHeading>
            }
          >
            <ActivityTimeline activities={activities} />
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
