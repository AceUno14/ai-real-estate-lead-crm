import type { QualificationInput } from "@/domain/lead";
import {
  qualificationResultSchema,
  type QualificationResult,
} from "@/domain/qualification";

import { AiProviderError, type LeadQualificationProvider } from "./types";

/**
 * OpenAI-compatible chat-completions provider (TASKS.md T053).
 *
 * Security and robustness rules:
 * - the API key is read from the environment on the server only and is
 *   never logged or embedded in error messages
 * - requests are bounded by AI_TIMEOUT_MS via AbortController
 * - non-OK responses and network failures are normalized to AiProviderError
 *   without leaking response internals
 * - the model's text is parsed as JSON and validated with the shared Zod
 *   schema; malformed output never reaches persistence (D-008)
 * - HTTP 429 (rate limited) is retried at most once, and only when the
 *   provider-supplied `Retry-After` is short. This is deliberately tiny so
 *   a free quota is never burned and no retry loop can run away.
 */

type OpenAiChatChoice = {
  message?: {
    content?: string | null;
  };
};

type OpenAiChatResponse = {
  choices?: OpenAiChatChoice[];
};

const MAX_RATE_LIMIT_RETRIES = 1;
const DEFAULT_RETRY_AFTER_MS = 1000;
/** Never wait longer than this for a 429 retry; beyond it, fail fast. */
const MAX_RETRY_AFTER_MS = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reads `Retry-After` (delta-seconds or HTTP-date). Returns `null` when the
 * header is missing or unparseable so the caller can apply a small default.
 */
function parseRetryAfterMs(header: string | null): number | null {
  if (!header) return null;

  const seconds = Number(header.trim());
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return null;
}

export class OpenAiCompatibleProvider implements LeadQualificationProvider {
  constructor(
    private readonly options: {
      apiKey: string;
      baseUrl: string;
      model: string;
      timeoutMs: number;
      systemPrompt: string;
      buildUserPrompt: (input: QualificationInput) => string;
    },
  ) {}

  async qualify(input: QualificationInput): Promise<QualificationResult> {
    let attempt = 0;

    for (;;) {
      const response = await this.request(input);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfterMs =
            parseRetryAfterMs(response.headers.get("retry-after")) ??
            DEFAULT_RETRY_AFTER_MS;
          const canRetry =
            attempt < MAX_RATE_LIMIT_RETRIES &&
            retryAfterMs <= MAX_RETRY_AFTER_MS;

          if (canRetry) {
            attempt += 1;
            if (retryAfterMs > 0) {
              await sleep(retryAfterMs);
            }
            continue;
          }

          // Retries exhausted or the requested wait is too long: fail fast
          // and leave manual requalification available.
          throw new AiProviderError(
            "RATE_LIMITED",
            "AI provider rate limited the request. Try again shortly.",
          );
        }

        // Deliberately do not include the response body: it could contain
        // provider-side details we do not want in logs or responses.
        throw new AiProviderError(
          "PROVIDER",
          `AI provider request failed with status ${response.status}.`,
        );
      }

      return this.parseResponse(response);
    }
  }

  /** Single bounded HTTP attempt; timeout/network errors are normalized. */
  private async request(input: QualificationInput): Promise<Response> {
    const { apiKey, baseUrl, model, timeoutMs } = this.options;

    if (!apiKey) {
      throw new AiProviderError(
        "CONFIG",
        "AI provider is not configured. Set AI_API_KEY for the openai-compatible provider.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Sent only to the configured AI endpoint over the server runtime.
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: this.options.systemPrompt },
            { role: "user", content: this.options.buildUserPrompt(input) },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiProviderError("TIMEOUT", "AI provider request timed out.");
      }
      throw new AiProviderError("NETWORK", "Could not reach the AI provider.");
    } finally {
      clearTimeout(timeout);
    }
  }

  /** Parses + Zod-validates a successful completion. */
  private async parseResponse(
    response: Response,
  ): Promise<QualificationResult> {
    let payload: OpenAiChatResponse;
    try {
      payload = (await response.json()) as OpenAiChatResponse;
    } catch {
      throw new AiProviderError(
        "MALFORMED",
        "AI provider returned a non-JSON response.",
      );
    }

    const content = payload.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new AiProviderError(
        "MALFORMED",
        "AI provider returned an empty completion.",
      );
    }

    let rawJson: unknown;
    try {
      rawJson = JSON.parse(content);
    } catch {
      throw new AiProviderError(
        "MALFORMED",
        "AI completion is not valid JSON.",
      );
    }

    const parsed = qualificationResultSchema.safeParse(rawJson);
    if (!parsed.success) {
      throw new AiProviderError(
        "MALFORMED",
        "AI completion did not match the qualification schema.",
      );
    }

    return parsed.data;
  }
}
