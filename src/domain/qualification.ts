import { z } from "zod";

/**
 * AI qualification output contract.
 * Mirrors the provider interface in ARCHITECTURE.md §6.
 *
 * Rules enforced by DECISIONS.md:
 * - D-005: output must pass Zod validation before persistence
 * - D-006: providers implement this contract, CRM code depends on the interface
 * - D-010: priority is LOW / MEDIUM / HIGH / URGENT
 */

export const AI_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type AiPriority = (typeof AI_PRIORITIES)[number];

export const qualificationResultSchema = z.object({
  /** Integer 0–100 (TASKS.md T050). */
  score: z.number().int().min(0).max(100),
  priority: z.enum(AI_PRIORITIES),
  intent: z.string().min(1),
  summary: z.string().min(1),
  timeline: z.string().min(1),
  budgetReadiness: z.string().min(1),
  financingStatus: z.string().min(1),
  recommendedAction: z.string().min(1),
  draftReply: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export type QualificationResult = z.infer<typeof qualificationResultSchema>;

/** Qualification attempt lifecycle for persistence (used from T020 onward). */
export const QUALIFICATION_STATUSES = [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
] as const;
export type QualificationStatus = (typeof QUALIFICATION_STATUSES)[number];

export const qualificationStatusSchema = z.enum(QUALIFICATION_STATUSES);
