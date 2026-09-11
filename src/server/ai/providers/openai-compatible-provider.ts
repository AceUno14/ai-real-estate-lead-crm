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
 */

type OpenAiChatChoice = {
  message?: {
    content?: string | null;
  };
};

type OpenAiChatResponse = {
  choices?: OpenAiChatChoice[];
};

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
    const { apiKey, baseUrl, model, timeoutMs } = this.options;

    if (!apiKey) {
      throw new AiProviderError(
        "CONFIG",
        "AI provider is not configured. Set AI_API_KEY for the openai-compatible provider.",
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new AiProviderError(
          "TIMEOUT",
          "AI provider request timed out.",
        );
      }
      throw new AiProviderError(
        "NETWORK",
        "Could not reach the AI provider.",
      );
    }

    clearTimeout(timeout);

    if (!response.ok) {
      // Deliberately do not include the response body: it could contain
      // provider-side details we do not want in logs or responses.
      throw new AiProviderError(
        "PROVIDER",
        `AI provider request failed with status ${response.status}.`,
      );
    }

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
