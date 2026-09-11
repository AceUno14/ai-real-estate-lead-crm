import type { QualificationInput } from "@/domain/lead";
import type { QualificationResult } from "@/domain/qualification";

/**
 * AI provider abstraction (DECISIONS.md D-009 / TASKS.md T052).
 *
 * CRM code depends on this interface, never on a specific vendor.
 * Implementations must:
 * - return a result that satisfies qualificationResultSchema
 * - throw AiProviderError (normalized) on any failure
 */

export interface LeadQualificationProvider {
  qualify(input: QualificationInput): Promise<QualificationResult>;
}

export type AiProviderErrorCode =
  | "CONFIG"
  | "NETWORK"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "PROVIDER"
  | "MALFORMED";

/**
 * Normalized provider error. The message is safe to log (never contains
 * API keys) and the code drives user-facing failure states.
 */
export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;

  constructor(code: AiProviderErrorCode, message: string) {
    super(message);
    this.name = "AiProviderError";
    this.code = code;
  }
}
