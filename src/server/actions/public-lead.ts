"use server";

import { after } from "next/server";
import { z } from "zod";

import { publicLeadInputSchema } from "@/domain/lead";
import { organizationSlugSchema } from "@/domain/organization";
import { prisma } from "@/server/db/prisma";
import { getOrganizationBySlug } from "@/server/db/organization";
import { runAutomaticQualification } from "@/server/ai/qualify-lead";

/**
 * Public lead capture (T031).
 *
 * Security model:
 * - routing is workspace-specific: the slug comes from `/lead/[organizationSlug]`
 *   and is bound to this action server-side when the page renders
 * - the slug is only a selection key; the trusted organizationId is resolved
 *   server-side from it. The browser never sends an organization ID and any
 *   `organizationId` field in the payload is ignored (D-005 / D-027)
 * - input is validated with the shared Zod schema before persistence
 * - an unknown/invalid slug is rejected without creating anything
 * - errors are generic; no stack traces or internals reach the client
 * - the endpoint is a single server action, so rate limiting/spam protection
 *   can wrap it later without changing callers
 *
 * After the lead and its LEAD_CREATED activity are persisted, AI
 * qualification is scheduled with `after()` so it runs *after* the visitor's
 * success response (T056). AI success, failure, timeout, or rate limiting can
 * never fail or delay the submission, and the lead stays manually
 * requalifiable from the dashboard.
 */

export type PublicLeadState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

/** Generic, non-revealing failure used for config/database/slug problems. */
const GENERIC_ERROR =
  "We could not process your inquiry right now. Please try again later.";

/** Numeric form fields arrive as strings; empty string means "not provided". */
const numberFromForm = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return Number(value);
}, z.number().int().min(0).max(1_000_000_000).optional());

/** Form schema: same shape as the domain schema, with coerced numbers. */
const publicLeadFormSchema = publicLeadInputSchema.extend({
  budgetMin: numberFromForm,
  budgetMax: numberFromForm,
});

function optionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function submitPublicLead(
  organizationSlug: string,
  _prevState: PublicLeadState,
  formData: FormData,
): Promise<PublicLeadState> {
  // The slug is bound server-side by the workspace page. Only its shape is
  // validated here; existence is checked with a server-side lookup below.
  const parsedSlug = organizationSlugSchema.safeParse(organizationSlug);
  if (!parsedSlug.success) {
    return { status: "error", message: GENERIC_ERROR };
  }

  const parsed = publicLeadFormSchema.safeParse({
    name: optionalString(formData.get("name")),
    email: optionalString(formData.get("email")),
    phone: optionalString(formData.get("phone")),
    inquiryType: optionalString(formData.get("inquiryType")),
    propertyType: optionalString(formData.get("propertyType")),
    preferredLocation: optionalString(formData.get("preferredLocation")),
    budgetMin: optionalString(formData.get("budgetMin")),
    budgetMax: optionalString(formData.get("budgetMax")),
    timeline: optionalString(formData.get("timeline")),
    financingStatus: optionalString(formData.get("financingStatus")),
    message: optionalString(formData.get("message")),
    source: optionalString(formData.get("source")),
    // NOTE: any client-supplied `organizationId` is deliberately never read.
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      status: "error",
      message: first
        ? `${first.path.join(".")}: ${first.message}`
        : "Please review the highlighted fields and try again.",
    };
  }

  let organizationId: string;
  try {
    const organization = await getOrganizationBySlug(parsedSlug.data);
    if (!organization) {
      // Unknown workspace: never reveal whether the slug exists.
      return { status: "error", message: GENERIC_ERROR };
    }
    // Trusted, server-resolved organization ID.
    organizationId = organization.id;
  } catch {
    // Database or configuration unavailable — degrade gracefully.
    return { status: "error", message: GENERIC_ERROR };
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        inquiryType: parsed.data.inquiryType,
        propertyType: parsed.data.propertyType || null,
        preferredLocation: parsed.data.preferredLocation,
        budgetMin: parsed.data.budgetMin ?? null,
        budgetMax: parsed.data.budgetMax ?? null,
        timeline: parsed.data.timeline || null,
        financingStatus: parsed.data.financingStatus || null,
        message: parsed.data.message,
        source: parsed.data.source || null,
        status: "NEW",
      },
      select: { id: true },
    });

    await prisma.activity.create({
      data: {
        organizationId,
        leadId: lead.id,
        type: "LEAD_CREATED",
        message: `New public inquiry from ${parsed.data.name}`,
      },
    });

    // Runs after the response is sent. Scheduling is best-effort and must
    // never affect the visitor's already-successful submission.
    try {
      await after(async () => {
        await runAutomaticQualification({ organizationId, leadId: lead.id });
      });
    } catch {
      // Ignore: the inquiry is persisted and can be qualified manually.
    }

    return { status: "success" };
  } catch {
    return { status: "error", message: GENERIC_ERROR };
  }
}
