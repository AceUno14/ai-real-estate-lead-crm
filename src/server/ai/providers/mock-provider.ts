import type { QualificationInput } from "@/domain/lead";
import {
  qualificationResultSchema,
  type AiPriority,
  type QualificationResult,
} from "@/domain/qualification";

import { AiProviderError, type LeadQualificationProvider } from "./types";

/**
 * Deterministic mock provider (DECISIONS.md D-011 / TASKS.md T051).
 *
 * - no network, no cost, always returns schema-valid data
 * - scoring is a transparent rule table so tests can predict outcomes
 * - controlled failure mode: send a message containing the token
 *   MOCK_AI_FAILURE (or construct with forceFailure) to exercise failure
 *   handling without a real outage
 */

export const MOCK_FAILURE_TOKEN = "MOCK_AI_FAILURE";

const TIMELINE_SCORES: Record<string, number> = {
  ASAP: 20,
  ONE_TO_THREE_MONTHS: 15,
  THREE_TO_SIX_MONTHS: 8,
  SIX_PLUS_MONTHS: 3,
  JUST_BROWSING: -15,
};

const FINANCING_SCORES: Record<string, number> = {
  CASH: 20,
  PRE_APPROVED: 15,
  NEEDS_MORTGAGE: 5,
  UNSOLD_PROPERTY: 0,
};

function scoreLead(input: QualificationInput): number {
  let score = 40;

  score += TIMELINE_SCORES[input.timeline ?? ""] ?? 0;
  score += FINANCING_SCORES[input.financingStatus ?? ""] ?? 0;

  if (typeof input.budgetMax === "number" && input.budgetMax >= 500_000) {
    score += 10;
  }
  if (
    typeof input.budgetMin === "number" &&
    typeof input.budgetMax === "number"
  ) {
    score += 5;
  }
  if (input.message.length >= 200) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

function priorityFor(score: number): AiPriority {
  if (score >= 85) return "URGENT";
  if (score >= 70) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

const INTENT_BY_INQUIRY: Record<string, string> = {
  BUY: "wants to buy a property",
  SELL: "wants to sell a property",
  RENT: "wants to rent a property",
  INVEST: "looking for an investment property",
  OTHER: "general real-estate inquiry",
};

export class MockQualificationProvider implements LeadQualificationProvider {
  constructor(private readonly forceFailure = false) {}

  async qualify(input: QualificationInput): Promise<QualificationResult> {
    if (this.forceFailure || input.message.includes(MOCK_FAILURE_TOKEN)) {
      throw new AiProviderError(
        "PROVIDER",
        "Mock provider failure triggered for testing.",
      );
    }

    const score = scoreLead(input);
    const priority = priorityFor(score);
    const intent = INTENT_BY_INQUIRY[input.inquiryType] ?? "general real-estate inquiry";

    const timeline =
      input.timeline && input.timeline !== "JUST_BROWSING"
        ? `Timeline: ${input.timeline.replace(/_/g, " ").toLowerCase()}`
        : "No firm timeline yet";

    const budgetReadiness =
      typeof input.budgetMin === "number" && typeof input.budgetMax === "number"
        ? "Stated a concrete budget range"
        : typeof input.budgetMax === "number"
          ? "Stated an upper budget limit"
          : "Budget not specified";

    const financingStatus =
      input.financingStatus && input.financingStatus !== "NOT_SPECIFIED"
        ? input.financingStatus.replace(/_/g, " ").toLowerCase()
        : "financing not specified";

    const recommendedAction =
      priority === "URGENT"
        ? `Call ${input.name} today`
        : priority === "HIGH"
          ? `Contact ${input.name} within 24 hours`
          : `Send ${input.name} a personalized follow-up`;

    const draftReply = [
      `Hi ${input.name},`,
      "",
      `Thank you for reaching out about your ${intent.replace(/^wants to /, "")} in ${input.preferredLocation}. I would be glad to help.`,
      "",
      "Could we schedule a short call this week to discuss what you are looking for?",
      "",
      "Best regards,",
      "The team",
    ].join("\n");

    const result: QualificationResult = {
      score,
      priority,
      intent,
      summary: `${input.name} inquired about ${intent.replace(/^wants to /, "")} in ${input.preferredLocation}. ${timeline}. ${budgetReadiness}.`,
      timeline: input.timeline
        ? input.timeline.replace(/_/g, " ").toLowerCase()
        : "not specified",
      budgetReadiness,
      financingStatus,
      recommendedAction,
      draftReply,
      confidence: 0.85,
    };

    // Guarantee the contract even if the rules above drift.
    return qualificationResultSchema.parse(result);
  }
}
