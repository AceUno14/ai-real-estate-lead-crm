import { z } from "zod";

import { LEAD_STATUSES, type LeadStatus } from "@/domain/status";

/**
 * Lead domain schemas and types.
 *
 * MVP lead lifecycle (DECISIONS.md D-009):
 *   NEW -> CONTACTED -> QUALIFIED -> NURTURING -> WON / LOST
 */

/** Ordered MVP lifecycle for display and transition hints. */
export const LEAD_LIFECYCLE = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "NURTURING",
  "WON",
  "LOST",
] as const satisfies readonly LeadStatus[];

export const leadStatusSchema = z.enum(LEAD_STATUSES);

// ---------------------------------------------------------------------------
// Public lead capture input (ARCHITECTURE.md §5 request flow)
// ---------------------------------------------------------------------------

export const publicLeadInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .max(40)
    .regex(/^[0-9+()\-.\s]*$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  inquiryType: z.string().trim().min(1).max(80),
  propertyType: z.string().trim().max(80).optional().nullable(),
  preferredLocation: z.string().trim().min(1).max(160),
  budgetMin: z.number().int().min(0).max(1_000_000_000).optional().nullable(),
  budgetMax: z.number().int().min(0).max(1_000_000_000).optional().nullable(),
  timeline: z.string().trim().max(80).optional().nullable(),
  financingStatus: z.string().trim().max(80).optional().nullable(),
  message: z.string().trim().min(1).max(4000),
  source: z.string().trim().max(80).optional().nullable(),
});

export type PublicLeadInput = z.infer<typeof publicLeadInputSchema>;

// ---------------------------------------------------------------------------
// Qualification input — provider contract from ARCHITECTURE.md §6
// ---------------------------------------------------------------------------

export const qualificationInputSchema = z.object({
  name: z.string(),
  inquiryType: z.string(),
  propertyType: z.string().nullable().optional(),
  preferredLocation: z.string(),
  budgetMin: z.number().nullable().optional(),
  budgetMax: z.number().nullable().optional(),
  timeline: z.string().nullable().optional(),
  financingStatus: z.string().nullable().optional(),
  message: z.string(),
  source: z.string().nullable().optional(),
});

export type QualificationInput = z.infer<typeof qualificationInputSchema>;

/** Normalize an optional/empty-string field to null for the AI provider contract. */
function normalizeOptional(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOptionalNumber(
  value: number | null | undefined,
): number | null {
  return value === undefined || value === null ? null : value;
}

/** Map a validated public lead submission to the AI qualification input. */
export function toQualificationInput(
  lead: PublicLeadInput,
): QualificationInput {
  return {
    name: lead.name,
    inquiryType: lead.inquiryType,
    propertyType: normalizeOptional(lead.propertyType),
    preferredLocation: lead.preferredLocation,
    budgetMin: normalizeOptionalNumber(lead.budgetMin),
    budgetMax: normalizeOptionalNumber(lead.budgetMax),
    timeline: normalizeOptional(lead.timeline),
    financingStatus: normalizeOptional(lead.financingStatus),
    message: lead.message,
    source: normalizeOptional(lead.source),
  };
}
