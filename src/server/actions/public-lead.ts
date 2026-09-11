"use server";

import { z } from "zod";

import { publicLeadInputSchema } from "@/domain/lead";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/server/db/prisma";
import { getOrganizationBySlug } from "@/server/db/organization";

/**
 * Public lead capture (T031).
 *
 * Security model:
 * - the target organization is resolved server-side from PUBLIC_LEAD_ORG_SLUG
 *   — the browser never sends an organization ID (D-005)
 * - input is validated with the shared Zod schema before persistence
 * - errors are generic; no stack traces or internals reach the client
 * - the endpoint is a single server action, so rate limiting/spam protection
 *   can wrap it later without changing callers
 */

export type PublicLeadState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

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
  _prevState: PublicLeadState,
  formData: FormData,
): Promise<PublicLeadState> {
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

  const env = getServerEnv();

  let organizationId: string;
  try {
    const organization = await getOrganizationBySlug(env.PUBLIC_LEAD_ORG_SLUG);
    if (!organization) {
      // Server-side configuration problem — never expose details.
      return {
        status: "error",
        message:
          "We could not process your inquiry right now. Please try again later.",
      };
    }
    organizationId = organization.id;
  } catch {
    // Database or configuration unavailable — degrade gracefully.
    return {
      status: "error",
      message:
        "We could not process your inquiry right now. Please try again later.",
    };
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

    return { status: "success" };
  } catch {
    return {
      status: "error",
      message:
        "We could not process your inquiry right now. Please try again later.",
    };
  }
}
