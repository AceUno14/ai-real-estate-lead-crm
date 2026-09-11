import type { LeadPriority, Prisma } from "@/generated/prisma/client";

import { publicEnv } from "@/lib/env";
import { prisma } from "@/server/db/prisma";
import {
  sendEmailViaResend,
  type SendEmailResult,
} from "@/server/services/resend-email";

/**
 * Hot-lead email notification (TASKS.md T058).
 *
 * After a HIGH / URGENT qualification is persisted, the responsible CRM user
 * is notified by email. This is best-effort: a failure here never invalidates
 * the lead, the qualification, the automatic follow-up task, or the visitor's
 * submission.
 *
 * Security:
 * - `organizationId` comes from the trusted qualification workflow, never the
 *   browser; the lead is loaded organization-scoped
 * - recipients are resolved server-side only: the assigned user when they
 *   belong to the same organization, otherwise the organization's OWNER
 *   members; client-supplied recipients are never accepted
 * - cross-tenant recipients are impossible (every membership query is scoped
 *   to the organization)
 *
 * Idempotency reuses the existing Activity ledger: a
 * `HOT_LEAD_NOTIFICATION_SENT` activity is the marker for the qualification.
 * The Resend `Idempotency-Key` is a stable function of the qualification id as
 * an external backstop, but the database check is authoritative.
 */

export const HOT_LEAD_NOTIFICATION_SENT = "HOT_LEAD_NOTIFICATION_SENT";
export const HOT_LEAD_NOTIFICATION_FAILED = "HOT_LEAD_NOTIFICATION_FAILED";
export const HOT_LEAD_NOTIFICATION_PROVIDER = "resend";

export type HotLeadNotificationOutcome =
  | { status: "sent"; recipientCount: number }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

type RecipientRuleInput = {
  organizationId: string;
  assignedToUserId: string | null;
};

/**
 * Resolves recipients for a hot-lead notification, server-side only.
 *
 * 1. the assigned user, but only when they are a member of the organization
 * 2. otherwise every OWNER member of the organization
 */
export async function resolveHotLeadRecipients({
  organizationId,
  assignedToUserId,
}: RecipientRuleInput): Promise<string[]> {
  if (assignedToUserId) {
    const assigned = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId: assignedToUserId, organizationId },
      },
      select: { user: { select: { email: true } } },
    });
    if (assigned) {
      return [assigned.user.email];
    }
    // The assigned user is not in this organization (stale/cross-tenant
    // assignment): fall through to the OWNER rule rather than notifying them.
  }

  const owners = await prisma.membership.findMany({
    where: { organizationId, role: "OWNER" },
    orderBy: { createdAt: "asc" },
    select: { user: { select: { email: true } } },
  });

  return [...new Set(owners.map((membership) => membership.user.email))];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBudget(min: number | null, max: number | null): string {
  if (min === null && max === null) return "Not specified";
  if (min !== null && max !== null) {
    return `${min.toLocaleString("en-US")} – ${max.toLocaleString("en-US")} USD`;
  }
  if (max !== null) return `Up to ${max.toLocaleString("en-US")} USD`;
  return `From ${min!.toLocaleString("en-US")} USD`;
}

export type HotLeadEmail = { subject: string; html: string; text: string };

/**
 * Builds the notification subject, plain-text body, and simple professional
 * HTML. Every dynamic value is HTML-escaped because lead fields originate
 * from the public form.
 */
export function buildHotLeadEmail({
  lead,
  qualification,
  baseUrl,
}: {
  lead: {
    id: string;
    name: string;
    inquiryType: string;
    propertyType: string | null;
    preferredLocation: string;
    budgetMin: number | null;
    budgetMax: number | null;
    timeline: string | null;
    financingStatus: string | null;
  };
  qualification: {
    priority: LeadPriority;
    score: number;
    confidence: number;
    summary: string;
    recommendedAction: string;
  };
  baseUrl: string;
}): HotLeadEmail {
  const subject =
    qualification.priority === "URGENT"
      ? `URGENT lead: ${lead.name} — score ${qualification.score}`
      : `High-priority lead: ${lead.name} — score ${qualification.score}`;

  const leadUrl = `${baseUrl.replace(/\/$/, "")}/leads/${lead.id}`;
  const budget = formatBudget(lead.budgetMin, lead.budgetMax);
  const confidence = `${Math.round(qualification.confidence * 100)}%`;

  const rows: Array<[string, string]> = [
    ["Priority", qualification.priority],
    ["AI score", `${qualification.score}/100`],
    ["Confidence", confidence],
    ["Inquiry type", lead.inquiryType],
    ["Property type", lead.propertyType ?? "Not specified"],
    ["Preferred location", lead.preferredLocation],
    ["Budget", budget],
    ["Timeline", lead.timeline ?? "Not specified"],
    ["Financing", lead.financingStatus ?? "Not specified"],
  ];

  const text = [
    `${subject}`,
    "",
    `Name: ${lead.name}`,
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "AI summary:",
    qualification.summary,
    "",
    "Recommended next action:",
    qualification.recommendedAction,
    "",
    `Open the lead in the CRM: ${leadUrl}`,
  ].join("\n");

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;white-space:nowrap">${escapeHtml(
          label,
        )}</td><td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
    <div style="max-width:600px;margin:0 auto;padding:24px">
      <h1 style="font-size:18px;margin:0 0 4px">${escapeHtml(subject)}</h1>
      <p style="margin:0 0 16px;color:#475569">${escapeHtml(lead.name)}</p>
      <table style="border-collapse:collapse;font-size:14px">${tableRows}</table>
      <h2 style="font-size:14px;margin:24px 0 4px;text-transform:uppercase;color:#64748b">AI summary</h2>
      <p style="margin:0;font-size:14px">${escapeHtml(qualification.summary)}</p>
      <h2 style="font-size:14px;margin:24px 0 4px;text-transform:uppercase;color:#64748b">Recommended next action</h2>
      <p style="margin:0;font-size:14px">${escapeHtml(qualification.recommendedAction)}</p>
      <p style="margin:24px 0 0">
        <a href="${escapeHtml(leadUrl)}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:14px">Open lead in CRM</a>
      </p>
    </div>
  </body>
</html>`;

  return { subject, html, text };
}

function readQualificationId(metadata: unknown): string | null {
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    return null;
  }
  const value = (metadata as Record<string, unknown>).qualificationId;
  return typeof value === "string" ? value : null;
}

/** Best-effort activity write: never throws, never blocks the caller. */
async function safeRecordActivity(data: {
  organizationId: string;
  leadId: string;
  type: string;
  message: string;
  metadata: Prisma.InputJsonObject;
}): Promise<void> {
  try {
    await prisma.activity.create({
      data: { ...data, actorUserId: null },
    });
  } catch {
    // Notification bookkeeping is best-effort and must never break the CRM.
  }
}

/**
 * Sends the hot-lead email for a HIGH / URGENT qualification, at most once per
 * qualification. Never throws.
 */
export async function notifyHotLeadIfNeeded({
  organizationId,
  leadId,
  qualificationId,
  baseUrl = publicEnv.NEXT_PUBLIC_APP_URL,
}: {
  organizationId: string;
  leadId: string;
  qualificationId: string;
  baseUrl?: string;
}): Promise<HotLeadNotificationOutcome> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: {
      id: true,
      name: true,
      inquiryType: true,
      propertyType: true,
      preferredLocation: true,
      budgetMin: true,
      budgetMax: true,
      timeline: true,
      financingStatus: true,
      assignedToUserId: true,
    },
  });
  if (!lead) {
    return { status: "skipped", reason: "lead_not_found" };
  }

  const qualification = await prisma.leadQualification.findFirst({
    where: { id: qualificationId, organizationId, leadId },
    select: {
      id: true,
      priority: true,
      score: true,
      confidence: true,
      summary: true,
      recommendedAction: true,
    },
  });
  if (!qualification) {
    return { status: "skipped", reason: "qualification_not_found" };
  }

  if (qualification.priority !== "HIGH" && qualification.priority !== "URGENT") {
    return { status: "skipped", reason: "priority_not_hot" };
  }

  // Database idempotency: has the notification already succeeded for this
  // qualification? (Authoritative; the provider key is only a backstop.)
  const sentActivities = await prisma.activity.findMany({
    where: { organizationId, leadId, type: HOT_LEAD_NOTIFICATION_SENT },
    select: { metadata: true },
  });
  if (
    sentActivities.some(
      (activity) => readQualificationId(activity.metadata) === qualificationId,
    )
  ) {
    return { status: "skipped", reason: "already_sent" };
  }

  const recipients = await resolveHotLeadRecipients({
    organizationId,
    assignedToUserId: lead.assignedToUserId,
  });
  if (recipients.length === 0) {
    return { status: "skipped", reason: "no_recipients" };
  }

  const email = buildHotLeadEmail({ lead, qualification, baseUrl });

  let result: SendEmailResult;
  try {
    result = await sendEmailViaResend({
      to: recipients,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `hot-lead-notification-${qualification.id}`,
    });
  } catch {
    // The transport is designed not to throw; be defensive anyway.
    result = { ok: false, code: "PROVIDER_ERROR", retryable: false };
  }

  if (result.ok) {
    await safeRecordActivity({
      organizationId,
      leadId,
      type: HOT_LEAD_NOTIFICATION_SENT,
      message: `Hot-lead email sent for ${qualification.priority}-priority lead`,
      metadata: {
        qualificationId,
        priority: qualification.priority,
        recipientCount: recipients.length,
        provider: HOT_LEAD_NOTIFICATION_PROVIDER,
        ...(result.messageId ? { providerMessageId: result.messageId } : {}),
      },
    });
    return { status: "sent", recipientCount: recipients.length };
  }

  if (result.code === "NOT_CONFIGURED") {
    // Email delivery is an optional deployment capability; do not record a
    // failure when it was never configured.
    return { status: "skipped", reason: "not_configured" };
  }

  await safeRecordActivity({
    organizationId,
    leadId,
    type: HOT_LEAD_NOTIFICATION_FAILED,
    message: `Hot-lead email notification failed (${result.code})`,
    metadata: {
      qualificationId,
      priority: qualification.priority,
      provider: HOT_LEAD_NOTIFICATION_PROVIDER,
      reason: result.code,
    },
  });
  return { status: "failed", reason: result.code };
}
