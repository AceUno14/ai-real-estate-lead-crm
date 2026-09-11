import { getServerEnv } from "@/lib/env";
import {
  buildQualificationMessages,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
} from "@/server/ai/prompts/qualification-prompt";

import { MockQualificationProvider } from "./providers/mock-provider";
import { OpenAiCompatibleProvider } from "./providers/openai-compatible-provider";
import { AiProviderError, type LeadQualificationProvider } from "./providers/types";

/**
 * Provider factory and runtime selection (TASKS.md T052).
 *
 * The active provider is selected by the AI_PROVIDER environment variable
 * (default: "mock"). Prompt version travels with every qualification for
 * traceability.
 */

export { AiProviderError, PROMPT_VERSION };
export type { LeadQualificationProvider } from "./providers/types";

export function getQualificationProvider(): LeadQualificationProvider {
  const env = getServerEnv();

  switch (env.AI_PROVIDER) {
    case "openai-compatible": {
      if (!env.AI_API_KEY || !env.AI_BASE_URL) {
        throw new AiProviderError(
          "CONFIG",
          "AI_PROVIDER=openai-compatible requires AI_API_KEY and AI_BASE_URL.",
        );
      }
      return new OpenAiCompatibleProvider({
        apiKey: env.AI_API_KEY,
        baseUrl: env.AI_BASE_URL,
        model: env.AI_MODEL,
        timeoutMs: env.AI_TIMEOUT_MS,
        systemPrompt: SYSTEM_PROMPT,
        buildUserPrompt: (input) => buildQualificationMessages(input).user,
      });
    }

    case "mock":
    default: {
      return new MockQualificationProvider();
    }
  }
}
